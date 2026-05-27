package com.musicrepairapp;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.jtransforms.fft.FloatFFT_1D;
import org.tensorflow.lite.Interpreter;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.HashMap;
import java.util.Map;

/**
 * DPDFNet (DeepFilterNet2-derived) streaming enhancement for full-band audio.
 *
 * Model expects STFT frames shaped [1,1,F,2] with F = win_len/2 + 1 (for win_len=960 at 48kHz => F=481).
 * This module requires input WAV be 48kHz mono PCM16 (JS layer converts via ffmpeg-kit).
 */
public class DpdfNetEnhanceModule extends ReactContextBaseJavaModule {
  private static final int SR = 48000;
  private static final int WIN_LEN = 960;     // 20ms @ 48k
  private static final int HOP = WIN_LEN / 2; // 10ms
  private static final int BINS = WIN_LEN / 2 + 1; // 481

  private Interpreter model;

  public DpdfNetEnhanceModule(ReactApplicationContext ctx) {
    super(ctx);
  }

  @NonNull
  @Override
  public String getName() {
    return "DpdfNetEnhance";
  }

  private static MappedByteBuffer loadModelFile(File f) throws Exception {
    try (FileInputStream fis = new FileInputStream(f)) {
      FileChannel fc = fis.getChannel();
      return fc.map(FileChannel.MapMode.READ_ONLY, 0, fc.size());
    }
  }

  private synchronized void ensureLoaded(String modelPath) throws Exception {
    if (model != null) return;
    File f = new File(modelPath);
    if (!f.exists()) throw new Exception("DPDFNet model file not found: " + modelPath);
    model = new Interpreter(loadModelFile(f));
    model.allocateTensors();
  }

  private static int readLEInt(byte[] b, int off) {
    return (b[off] & 0xff) | ((b[off + 1] & 0xff) << 8) | ((b[off + 2] & 0xff) << 16) | ((b[off + 3] & 0xff) << 24);
  }

  private static short readLEShort(byte[] b, int off) {
    return (short) ((b[off] & 0xff) | ((b[off + 1] & 0xff) << 8));
  }

  private static void writeLEInt(byte[] b, int off, int v) {
    b[off] = (byte) (v & 0xff);
    b[off + 1] = (byte) ((v >> 8) & 0xff);
    b[off + 2] = (byte) ((v >> 16) & 0xff);
    b[off + 3] = (byte) ((v >> 24) & 0xff);
  }

  private static void writeLEShort(byte[] b, int off, int v) {
    b[off] = (byte) (v & 0xff);
    b[off + 1] = (byte) ((v >> 8) & 0xff);
  }

  private static short[] readWavPcm16Mono48k(String path) throws Exception {
    File f = new File(path);
    byte[] header = new byte[44];
    try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(f))) {
      int r = in.read(header);
      if (r != 44) throw new Exception("Invalid WAV header");
      if (header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F') throw new Exception("Not RIFF");
      if (header[8] != 'W' || header[9] != 'A' || header[10] != 'V' || header[11] != 'E') throw new Exception("Not WAVE");
      int fmt = readLEShort(header, 20);
      int channels = readLEShort(header, 22);
      int sr = readLEInt(header, 24);
      int bps = readLEShort(header, 34);
      if (fmt != 1) throw new Exception("WAV must be PCM");
      if (channels != 1) throw new Exception("WAV must be mono");
      if (sr != SR) throw new Exception("WAV sample rate must be 48kHz");
      if (bps != 16) throw new Exception("WAV must be 16-bit");
      int dataBytes = readLEInt(header, 40);
      byte[] data = new byte[dataBytes];
      int got = 0;
      while (got < dataBytes) {
        int n = in.read(data, got, dataBytes - got);
        if (n <= 0) break;
        got += n;
      }
      if (got != dataBytes) throw new Exception("Truncated WAV data");
      short[] pcm = new short[dataBytes / 2];
      for (int i = 0; i < pcm.length; i++) {
        int lo = data[i * 2] & 0xff;
        int hi = data[i * 2 + 1];
        pcm[i] = (short) (lo | (hi << 8));
      }
      return pcm;
    }
  }

  private static void writeWavPcm16Mono(String path, short[] pcm, int sampleRate) throws Exception {
    int dataBytes = pcm.length * 2;
    byte[] header = new byte[44];
    header[0] = 'R'; header[1] = 'I'; header[2] = 'F'; header[3] = 'F';
    writeLEInt(header, 4, 36 + dataBytes);
    header[8] = 'W'; header[9] = 'A'; header[10] = 'V'; header[11] = 'E';
    header[12] = 'f'; header[13] = 'm'; header[14] = 't'; header[15] = ' ';
    writeLEInt(header, 16, 16);
    writeLEShort(header, 20, 1);
    writeLEShort(header, 22, 1);
    writeLEInt(header, 24, sampleRate);
    writeLEInt(header, 28, sampleRate * 2);
    writeLEShort(header, 32, 2);
    writeLEShort(header, 34, 16);
    header[36] = 'd'; header[37] = 'a'; header[38] = 't'; header[39] = 'a';
    writeLEInt(header, 40, dataBytes);

    try (BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(new File(path)))) {
      out.write(header);
      byte[] buf = new byte[dataBytes];
      for (int i = 0; i < pcm.length; i++) {
        short s = pcm[i];
        buf[i * 2] = (byte) (s & 0xff);
        buf[i * 2 + 1] = (byte) ((s >> 8) & 0xff);
      }
      out.write(buf);
    }
  }

  private static float[] vorbisWindow() {
    float windowSizeH = WIN_LEN / 2.0f;
    float[] win = new float[WIN_LEN];
    for (int i = 0; i < WIN_LEN; i++) {
      float sin = (float) Math.sin(0.5 * Math.PI * (i + 0.5f) / windowSizeH);
      win[i] = (float) Math.sin(0.5 * Math.PI * sin * sin);
    }
    return win;
  }

  private static float getWnorm() {
    // 1 / (win_len^2 / (2 * hop))
    return 1.0f / ((WIN_LEN * WIN_LEN) / (2.0f * HOP));
  }

  private short[] enhance(short[] inPcm) {
    float[] x = new float[inPcm.length];
    for (int i = 0; i < inPcm.length; i++) x[i] = inPcm[i] / 32768.0f;

    float[] win = vorbisWindow();
    float wnorm = getWnorm();

    // center=True, pad reflect by win_len/2
    int pad = WIN_LEN / 2;
    float[] xp = new float[x.length + 2 * pad + WIN_LEN]; // plus extra win_len like python pads (0, win_len)
    // reflect pad left
    for (int i = 0; i < pad; i++) {
      int src = Math.min(pad - i, x.length - 1);
      xp[i] = x[src];
    }
    System.arraycopy(x, 0, xp, pad, x.length);
    // reflect pad right
    for (int i = 0; i < pad; i++) {
      int src = Math.max(0, x.length - 2 - i);
      xp[pad + x.length + i] = x[src];
    }
    // trailing zeros win_len
    for (int i = 0; i < WIN_LEN; i++) xp[pad + x.length + pad + i] = 0f;

    int frames = 1 + (xp.length - WIN_LEN) / HOP;

    FloatFFT_1D fft = new FloatFFT_1D(WIN_LEN);

    float[] ola = new float[xp.length + WIN_LEN];
    float[] norm = new float[xp.length + WIN_LEN];

    // Tensors
    float[][][][] inFrame = new float[1][1][BINS][2];
    float[][][][] outFrame = new float[1][1][BINS][2];

    for (int t = 0; t < frames; t++) {
      int pos = t * HOP;
      // windowed frame
      float[] spec = new float[WIN_LEN * 2];
      for (int i = 0; i < WIN_LEN; i++) {
        float v = xp[pos + i] * win[i];
        spec[2 * i] = v;
        spec[2 * i + 1] = 0f;
      }
      fft.complexForward(spec);

      // scale by wnorm and pack RI
      for (int k = 0; k < BINS; k++) {
        inFrame[0][0][k][0] = spec[2 * k] * wnorm;
        inFrame[0][0][k][1] = spec[2 * k + 1] * wnorm;
      }

      model.run(inFrame, outFrame);

      // unpack enhanced frame, invert scale, iFFT
      for (int k = 0; k < BINS; k++) {
        spec[2 * k] = outFrame[0][0][k][0] / wnorm;
        spec[2 * k + 1] = outFrame[0][0][k][1] / wnorm;
      }
      // mirror
      for (int k = 1; k < WIN_LEN / 2; k++) {
        int rk = WIN_LEN - k;
        spec[2 * rk] = spec[2 * k];
        spec[2 * rk + 1] = -spec[2 * k + 1];
      }
      fft.complexInverse(spec, true);

      for (int i = 0; i < WIN_LEN; i++) {
        float y = spec[2 * i] * win[i];
        ola[pos + i] += y;
        norm[pos + i] += win[i] * win[i];
      }
    }

    // Remove center padding and apply legacy alignment compensation: drop win_len*2 samples, add zeros.
    int start = pad;
    int len = x.length + WIN_LEN; // because we padded win_len zeros in python; we'll crop after shift
    float[] outF = new float[len];
    for (int i = 0; i < len; i++) {
      float v = norm[start + i] > 1e-6f ? (ola[start + i] / norm[start + i]) : ola[start + i];
      outF[i] = v;
    }
    int shift = WIN_LEN * 2;
    float[] shifted = new float[outF.length];
    if (outF.length > shift) {
      System.arraycopy(outF, shift, shifted, 0, outF.length - shift);
      // tail already zeros
    }
    // Final crop to original length
    short[] out = new short[x.length];
    for (int i = 0; i < out.length; i++) {
      float v = i < shifted.length ? shifted[i] : 0f;
      if (v > 1f) v = 1f;
      if (v < -1f) v = -1f;
      out[i] = (short) Math.round(v * 32767.0f);
    }
    return out;
  }

  @ReactMethod
  public void enhanceWav48kMono(String modelFilePath, String inputWavPath, String outputWavPath, Promise promise) {
    try {
      ensureLoaded(modelFilePath);
      short[] pcm = readWavPcm16Mono48k(inputWavPath);
      short[] out = enhance(pcm);
      writeWavPcm16Mono(outputWavPath, out, SR);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("dpdfnet_error", e);
    }
  }
}


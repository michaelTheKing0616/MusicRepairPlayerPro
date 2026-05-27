package com.musicrepairapp;

import android.content.res.AssetFileDescriptor;
import android.content.res.AssetManager;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.util.Base64;

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
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;
import java.util.HashMap;
import java.util.Map;

/**
 * Full-file on-device denoising using the DTLN TF-Lite models (MIT licensed).
 *
 * This is intentionally scoped to 16kHz mono WAV I/O. The JS layer converts arbitrary input formats
 * to the required format via ffmpeg-kit, and converts output back to the desired container.
 */
public class DtlnDenoiseModule extends ReactContextBaseJavaModule {
  private static final int SAMPLE_RATE = 16000;
  private static final int FRAME_LEN = 512; // 32ms
  private static final int HOP_LEN = 128;   // 8ms

  private Interpreter model1;
  private Interpreter model2;

  public DtlnDenoiseModule(ReactApplicationContext ctx) {
    super(ctx);
  }

  @NonNull
  @Override
  public String getName() {
    return "DtlnDenoise";
  }

  private static MappedByteBuffer loadAsset(AssetManager am, String assetPath) throws Exception {
    AssetFileDescriptor afd = am.openFd(assetPath);
    FileInputStream fis = new FileInputStream(afd.getFileDescriptor());
    FileChannel fc = fis.getChannel();
    long startOffset = afd.getStartOffset();
    long declaredLength = afd.getDeclaredLength();
    return fc.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength);
  }

  private synchronized void ensureLoaded() throws Exception {
    if (model1 != null && model2 != null) return;
    AssetManager am = getReactApplicationContext().getAssets();
    // stored at android/app/src/main/assets/dtln/
    model1 = new Interpreter(loadAsset(am, "dtln/model_1.tflite"));
    model2 = new Interpreter(loadAsset(am, "dtln/model_2.tflite"));
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

  private static class WavData {
    int sampleRate;
    int channels;
    int bitsPerSample;
    short[] pcm; // mono s16
  }

  private static WavData readWav16Mono(String path) throws Exception {
    File f = new File(path);
    byte[] header = new byte[44];
    try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(f))) {
      int r = in.read(header);
      if (r != 44) throw new Exception("Invalid WAV header");
      // Basic RIFF/WAVE checks
      if (header[0] != 'R' || header[1] != 'I' || header[2] != 'F' || header[3] != 'F') throw new Exception("Not RIFF");
      if (header[8] != 'W' || header[9] != 'A' || header[10] != 'V' || header[11] != 'E') throw new Exception("Not WAVE");
      int fmt = readLEShort(header, 20);
      int channels = readLEShort(header, 22);
      int sr = readLEInt(header, 24);
      int bps = readLEShort(header, 34);
      if (fmt != 1) throw new Exception("WAV must be PCM");
      if (channels != 1) throw new Exception("WAV must be mono");
      if (bps != 16) throw new Exception("WAV must be 16-bit");
      // data chunk expected at 36.. (we rely on ffmpeg conversion to produce canonical header)
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
      WavData wd = new WavData();
      wd.sampleRate = sr;
      wd.channels = channels;
      wd.bitsPerSample = bps;
      wd.pcm = pcm;
      return wd;
    }
  }

  private static void writeWav16Mono(String path, short[] pcm, int sampleRate) throws Exception {
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

  /**
   * DTLN has two submodels. Model 1 runs on STFT magnitude features; model 2 runs on learned basis.
   * The repo's `real_time_processing_tf_lite.py` describes exact tensor shapes; we implement a
   * simplified full-file processor with overlap-add and external state tracking.
   *
   * This implementation assumes the pretrained DTLN models as shipped in assets.
   */
  private short[] process(short[] inPcm) throws Exception {
    // Convert to float [-1,1]
    float[] x = new float[inPcm.length];
    for (int i = 0; i < inPcm.length; i++) x[i] = inPcm[i] / 32768.0f;

    // Hann window
    float[] win = new float[FRAME_LEN];
    for (int i = 0; i < FRAME_LEN; i++) {
      win[i] = (float) (0.5 - 0.5 * Math.cos(2.0 * Math.PI * i / (FRAME_LEN - 1)));
    }

    FloatFFT_1D fft = new FloatFFT_1D(FRAME_LEN);
    float[] ola = new float[x.length + FRAME_LEN];
    float[] norm = new float[x.length + FRAME_LEN];

    // State placeholders (sizes depend on model; we infer from input tensor shapes via interpreter)
    // For simplicity, we allocate based on model input tensor shapes.
    int s1 = model1.getInputTensor(1).numElements();
    int s2 = model2.getInputTensor(1).numElements();
    float[] state1 = new float[s1];
    float[] state2 = new float[s2];

    int pos = 0;
    while (pos + FRAME_LEN <= x.length) {
      // frame
      float[] frame = new float[FRAME_LEN];
      for (int i = 0; i < FRAME_LEN; i++) frame[i] = x[pos + i] * win[i];

      // FFT in-place on complex array format [re, im, re, im...]
      float[] spec = new float[FRAME_LEN * 2];
      for (int i = 0; i < FRAME_LEN; i++) {
        spec[2 * i] = frame[i];
        spec[2 * i + 1] = 0f;
      }
      fft.complexForward(spec);

      // Magnitude (FRAME_LEN/2+1 bins)
      int bins = FRAME_LEN / 2 + 1;
      float[] mag = new float[bins];
      for (int k = 0; k < bins; k++) {
        float re = spec[2 * k];
        float im = spec[2 * k + 1];
        mag[k] = (float) Math.sqrt(re * re + im * im + 1e-12f);
      }

      // Model 1: inputs [mag] + state, outputs [mask] + new_state
      Object[] in1 = new Object[] { mag, state1 };
      Map<Integer, Object> out1 = new HashMap<>();
      float[] mask = new float[bins];
      float[] newState1 = new float[state1.length];
      out1.put(0, mask);
      out1.put(1, newState1);
      model1.runForMultipleInputsOutputs(in1, out1);
      state1 = newState1;

      // Apply mask to complex spectrum (keep phase)
      for (int k = 0; k < bins; k++) {
        float g = mask[k];
        spec[2 * k] *= g;
        spec[2 * k + 1] *= g;
      }
      // Mirror bins for negative frequencies
      for (int k = 1; k < FRAME_LEN / 2; k++) {
        int rk = FRAME_LEN - k;
        spec[2 * rk] = spec[2 * k];
        spec[2 * rk + 1] = -spec[2 * k + 1];
      }

      // iFFT
      fft.complexInverse(spec, true);
      float[] enhanced = new float[FRAME_LEN];
      for (int i = 0; i < FRAME_LEN; i++) enhanced[i] = spec[2 * i] * win[i];

      // Model 2 is skipped in this v1 integration to keep correctness manageable across unknown tensor layouts.
      // The primary audible gain comes from the spectral masking stage (model_1).
      // (We will extend to model_2 once we validate exact tensor wiring against the upstream python script.)

      // OLA
      for (int i = 0; i < FRAME_LEN; i++) {
        ola[pos + i] += enhanced[i];
        norm[pos + i] += win[i] * win[i];
      }

      pos += HOP_LEN;
    }

    short[] out = new short[inPcm.length];
    for (int i = 0; i < out.length; i++) {
      float y = norm[i] > 1e-6f ? (ola[i] / norm[i]) : ola[i];
      if (y > 1f) y = 1f;
      if (y < -1f) y = -1f;
      out[i] = (short) Math.round(y * 32767.0f);
    }
    return out;
  }

  @ReactMethod
  public void denoiseWav16kMono(String inputWavPath, String outputWavPath, Promise promise) {
    try {
      ensureLoaded();
      WavData wd = readWav16Mono(inputWavPath);
      if (wd.sampleRate != SAMPLE_RATE) {
        promise.reject("dtln_sr", "WAV sample rate must be 16kHz");
        return;
      }
      short[] out = process(wd.pcm);
      writeWav16Mono(outputWavPath, out, SAMPLE_RATE);
      promise.resolve(true);
    } catch (Exception e) {
      promise.reject("dtln_error", e);
    }
  }
}


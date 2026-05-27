package com.musicrepairapp;

import android.media.audiofx.Equalizer;
import androidx.annotation.NonNull;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * Applies coarse 10-band gains (matches JS catalog centers) onto the device's global Equalizer
 * bands keyed by TrackPlayer/MediaPlayer audio session ids.
 *
 * <p>Oboe/offline-graph accurate processing runs on backend FFmpeg jobs; this path is realtime
 * preview only.</p>
 */
public class PresetDSPModule extends ReactContextBaseJavaModule {

  private static final int[] REF_HZ = {31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000};

  private Equalizer equalizer;

  public PresetDSPModule(ReactApplicationContext ctx) {
    super(ctx);
  }

  @NonNull
  @Override
  public String getName() {
    return "PresetDSP";
  }

  private void releaseInternal() {
    if (equalizer != null) {
      try {
        equalizer.release();
      } catch (Exception ignored) {
      }
      equalizer = null;
    }
  }

  @ReactMethod
  public void releaseEffects(Promise promise) {
    releaseInternal();
    promise.resolve(true);
  }

  @ReactMethod
  public void applyEqBands(int sessionId, String bandsDbJson, Promise promise) {
    try {
      releaseInternal();
      // Some devices support attaching Equalizer to the global output mix using sessionId = 0.
      // We treat 0 as best-effort rather than rejecting it.
      if (sessionId < 0) {
        promise.resolve(false);
        return;
      }
      JSONArray arr = new JSONArray(bandsDbJson);
      if (arr.length() < REF_HZ.length) {
        promise.reject("eq_invalid", "Expected 10 band gains");
        return;
      }
      Equalizer eq = new Equalizer(0, sessionId);
      eq.setEnabled(true);
      short nb = eq.getNumberOfBands();
      for (short b = 0; b < nb; b++) {
        int centerMilliHz = eq.getCenterFreq(b);
        float centerHz = centerMilliHz / 1000f;
        float gainDb = (float) pickNearestGainDb(arr, centerHz);
        short[] bandRange = eq.getBandLevelRange(b);
        float mbFloat = gainDb * 100f;
        short mb = (short) Math.round(mbFloat);
        short minLv = bandRange[0];
        short maxLv = bandRange[1];
        if (mb < minLv) mb = minLv;
        if (mb > maxLv) mb = maxLv;
        eq.setBandLevel(b, mb);
      }
      equalizer = eq;
      promise.resolve(true);
    } catch (JSONException je) {
      promise.reject("eq_json", je);
    } catch (Exception e) {
      promise.reject("eq_error", e);
    }
  }

  private static double pickNearestGainDb(JSONArray arr, float centerHz) throws JSONException {
    double bestRatio = Double.MAX_VALUE;
    double picked = 0;
    for (int i = 0; i < REF_HZ.length && i < arr.length(); i++) {
      double ratio = Math.abs(Math.log(centerHz / (double) REF_HZ[i]));
      if (ratio < bestRatio) {
        bestRatio = ratio;
        picked = arr.getDouble(i);
      }
    }
    return picked;
  }
}

package com.musicrepairapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import android.content.Context;

/**
 * React Native module for updating music widget
 */
public class MusicWidgetModule extends ReactContextBaseJavaModule {
    
    private final ReactApplicationContext reactContext;

    public MusicWidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "MusicWidgetModule";
    }

    @ReactMethod
    public void updateWidget(String trackTitle, String artist, boolean isPlaying) {
        Context context = reactContext.getApplicationContext();
        MusicWidgetProvider.updateWidget(context, trackTitle, artist, isPlaying);
    }
}


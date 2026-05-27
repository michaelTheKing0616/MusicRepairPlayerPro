package com.musicrepairapp;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.app.PendingIntent;
import android.content.ComponentName;

/**
 * Home screen widget provider for Music Repair App
 * Displays current track and playback controls
 */
public class MusicWidgetProvider extends AppWidgetProvider {
    
    private static final String ACTION_PLAY_PAUSE = "ACTION_PLAY_PAUSE";
    private static final String ACTION_NEXT = "ACTION_NEXT";
    private static final String ACTION_PREVIOUS = "ACTION_PREVIOUS";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Update all widget instances
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Create RemoteViews for widget layout
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music);

        // Set click listeners
        Intent playPauseIntent = new Intent(context, MusicWidgetProvider.class);
        playPauseIntent.setAction(ACTION_PLAY_PAUSE);
        PendingIntent playPausePendingIntent = PendingIntent.getBroadcast(
            context, 0, playPauseIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_play_pause, playPausePendingIntent);

        Intent nextIntent = new Intent(context, MusicWidgetProvider.class);
        nextIntent.setAction(ACTION_NEXT);
        PendingIntent nextPendingIntent = PendingIntent.getBroadcast(
            context, 0, nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_next, nextPendingIntent);

        Intent prevIntent = new Intent(context, MusicWidgetProvider.class);
        prevIntent.setAction(ACTION_PREVIOUS);
        PendingIntent prevPendingIntent = PendingIntent.getBroadcast(
            context, 0, prevIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_previous, prevPendingIntent);

        // Open app on widget click
        Intent appIntent = new Intent(context, MainActivity.class);
        PendingIntent appPendingIntent = PendingIntent.getActivity(
            context, 0, appIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_content, appPendingIntent);

        // Update widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        switch (action) {
            case ACTION_PLAY_PAUSE:
                // Send play/pause command to React Native
                sendCommandToRN(context, "playPause");
                break;
            case ACTION_NEXT:
                sendCommandToRN(context, "next");
                break;
            case ACTION_PREVIOUS:
                sendCommandToRN(context, "previous");
                break;
            case AppWidgetManager.ACTION_APPWIDGET_UPDATE:
                // Update all widgets
                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
                ComponentName thisWidget = new ComponentName(context, MusicWidgetProvider.class);
                int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
                onUpdate(context, appWidgetManager, appWidgetIds);
                break;
        }
    }

    private void sendCommandToRN(Context context, String command) {
        // Send broadcast to React Native module
        Intent intent = new Intent("com.musicrepairapp.WIDGET_COMMAND");
        intent.putExtra("command", command);
        context.sendBroadcast(intent);
    }

    // Method to update widget from React Native
    public static void updateWidget(Context context, String trackTitle, String artist, boolean isPlaying) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, MusicWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music);
            views.setTextViewText(R.id.widget_track_title, trackTitle);
            views.setTextViewText(R.id.widget_artist, artist);
            views.setImageViewResource(
                R.id.widget_play_pause,
                isPlaying ? R.drawable.ic_pause : R.drawable.ic_play
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}


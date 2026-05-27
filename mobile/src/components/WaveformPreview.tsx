import React, {useEffect, useMemo, useRef, useState} from 'react';
import {PanResponder, View, StyleSheet, TouchableOpacity, Dimensions} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Svg, {Rect, Line} from 'react-native-svg';
import {useProgress} from 'react-native-track-player';
import {createLogger} from '../utils/logger';

interface WaveformPreviewProps {
  audioUrl: string;
  onSeek?: (position: number) => void;
  height?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  playedColor?: string;
  /** Optional selection range (seconds). When provided, renders draggable selection handles. */
  selectionStartSec?: number | null;
  selectionEndSec?: number | null;
  onSelectionChange?: (range: {startSec: number; endSec: number}) => void;
  /** Minimum selection length (seconds). */
  minSelectionSec?: number;
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DEFAULT_HEIGHT = 60;
const DEFAULT_BAR_WIDTH = 3;
const DEFAULT_BAR_GAP = 2;
const DEFAULT_MIN_SELECTION_SEC = 0.25;

const log = createLogger('WaveformPreview');

export function WaveformPreview({
  audioUrl,
  onSeek,
  height = DEFAULT_HEIGHT,
  barWidth = DEFAULT_BAR_WIDTH,
  barGap = DEFAULT_BAR_GAP,
  color,
  playedColor,
  selectionStartSec,
  selectionEndSec,
  onSelectionChange,
  minSelectionSec = DEFAULT_MIN_SELECTION_SEC,
}: WaveformPreviewProps) {
  const theme = useTheme();
  const progress = useProgress();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const dragHandleRef = useRef<null | 'start' | 'end'>(null);

  const defaultColor = color || theme.colors.onSurfaceVariant;
  const defaultPlayedColor = playedColor || theme.colors.primary;

  useEffect(() => {
    generateWaveformData();
  }, [audioUrl]);

  const generateWaveformData = async () => {
    setLoading(true);
    try {
      // Generate synthetic waveform data
      // In production, you would analyze the actual audio file
      // For now, we'll create a realistic-looking waveform
      const bars = Math.floor((SCREEN_WIDTH - 32) / (barWidth + barGap));
      const data: number[] = [];

      for (let i = 0; i < bars; i++) {
        // Create a realistic waveform pattern
        const value = Math.random() * 0.8 + 0.1;
        data.push(value);
      }

      setWaveformData(data);
    } catch (error) {
      log.warn('generateWaveformData failed', {message: String(error)});
      // Fallback: create simple waveform
      const bars = Math.floor((SCREEN_WIDTH - 32) / (barWidth + barGap));
      setWaveformData(new Array(bars).fill(0.5));
    } finally {
      setLoading(false);
    }
  };

  const containerWidth = useMemo(() => SCREEN_WIDTH - 32, []);
  const hasSelection =
    onSelectionChange != null &&
    progress.duration != null &&
    Number.isFinite(progress.duration) &&
    progress.duration > 0;

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const toX = (sec: number) => {
    const dur = progress.duration || 1;
    return (sec / dur) * containerWidth;
  };

  const toSec = (x: number) => {
    const dur = progress.duration || 0;
    if (dur <= 0) return 0;
    return (x / containerWidth) * dur;
  };

  const currentSelection = useMemo(() => {
    const dur = progress.duration || 0;
    if (!hasSelection || dur <= 0) return null;
    const s0 = selectionStartSec ?? 0;
    const e0 = selectionEndSec ?? Math.min(dur, Math.max(0, s0 + minSelectionSec));
    const start = clamp(Math.min(s0, e0), 0, dur);
    const end = clamp(Math.max(s0, e0), 0, dur);
    return {startSec: start, endSec: Math.max(end, Math.min(dur, start + minSelectionSec))};
  }, [hasSelection, minSelectionSec, progress.duration, selectionEndSec, selectionStartSec]);

  const handleWaveformPress = (event: any) => {
    if (!onSeek || !progress.duration) return;

    const {locationX} = event.nativeEvent;
    const position = (locationX / containerWidth) * progress.duration;
    onSeek(position);
  };

  if (loading || waveformData.length === 0) {
    return (
      <View style={[styles.container, {height}]}>
        <Text variant="bodySmall" style={styles.loadingText}>
          Generating waveform...
        </Text>
      </View>
    );
  }

  const totalBars = waveformData.length;
  const playedBars = progress.duration
    ? Math.floor((progress.position / progress.duration) * totalBars)
    : 0;

  const panResponder = useMemo(() => {
    if (!hasSelection || !currentSelection) return null;
    return PanResponder.create({
      onStartShouldSetPanResponder: evt => {
        const x = evt.nativeEvent.locationX;
        const startX = toX(currentSelection.startSec);
        const endX = toX(currentSelection.endSec);
        const distToStart = Math.abs(x - startX);
        const distToEnd = Math.abs(x - endX);
        const threshold = 18;
        if (distToStart <= threshold || distToEnd <= threshold) {
          dragHandleRef.current = distToStart <= distToEnd ? 'start' : 'end';
          return true;
        }
        // Tap inside selection moves nearest handle.
        if (x >= Math.min(startX, endX) && x <= Math.max(startX, endX)) {
          dragHandleRef.current = distToStart <= distToEnd ? 'start' : 'end';
          return true;
        }
        return false;
      },
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: (evt, gestureState) => {
        const handle = dragHandleRef.current;
        if (!handle) return;
        const x = clamp(evt.nativeEvent.locationX + gestureState.dx, 0, containerWidth);
        const sec = clamp(toSec(x), 0, progress.duration || 0);
        const start = currentSelection.startSec;
        const end = currentSelection.endSec;
        if (handle === 'start') {
          const nextStart = clamp(sec, 0, Math.max(0, end - minSelectionSec));
          onSelectionChange?.({startSec: nextStart, endSec: end});
        } else {
          const nextEnd = clamp(sec, Math.min(progress.duration || 0, start + minSelectionSec), progress.duration || 0);
          onSelectionChange?.({startSec: start, endSec: nextEnd});
        }
      },
      onPanResponderRelease: () => {
        dragHandleRef.current = null;
      },
      onPanResponderTerminate: () => {
        dragHandleRef.current = null;
      },
    });
  }, [
    clamp,
    containerWidth,
    currentSelection,
    hasSelection,
    minSelectionSec,
    onSelectionChange,
    progress.duration,
  ]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handleWaveformPress}
      style={styles.container}>
      <View {...(panResponder ? panResponder.panHandlers : {})}>
        <Svg width={containerWidth} height={height}>
        {waveformData.map((amplitude, index) => {
          const barHeight = amplitude * (height - 8);
          const x = index * (barWidth + barGap);
          const y = (height - barHeight) / 2;

          const isPlayed = index < playedBars;
          const barColor = isPlayed ? defaultPlayedColor : defaultColor;

          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              opacity={isPlayed ? 1 : 0.5}
            />
          );
        })}

        {/* Selection overlay */}
        {currentSelection && (
          <>
            <Rect
              x={toX(currentSelection.startSec)}
              y={0}
              width={Math.max(0, toX(currentSelection.endSec) - toX(currentSelection.startSec))}
              height={height}
              fill={defaultPlayedColor}
              opacity={0.12}
            />
            <Line
              x1={toX(currentSelection.startSec)}
              y1={0}
              x2={toX(currentSelection.startSec)}
              y2={height}
              stroke={defaultPlayedColor}
              strokeWidth={3}
            />
            <Line
              x1={toX(currentSelection.endSec)}
              y1={0}
              x2={toX(currentSelection.endSec)}
              y2={height}
              stroke={defaultPlayedColor}
              strokeWidth={3}
            />
          </>
        )}

        {/* Playhead line */}
        {progress.duration && (
          <Line
            x1={playedBars * (barWidth + barGap)}
            y1={0}
            x2={playedBars * (barWidth + barGap)}
            y2={height}
            stroke={defaultPlayedColor}
            strokeWidth={2}
          />
        )}
        </Svg>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  loadingText: {
    opacity: 0.6,
  },
});


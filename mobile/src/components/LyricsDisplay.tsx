import React, {useEffect, useState, useRef} from 'react';
import {View, StyleSheet, ScrollView, ActivityIndicator} from 'react-native';
import {Text, useTheme, Card, IconButton} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {lyricsService, Lyrics, LyricsLine} from '../services/lyricsService';
import {aiLyricsService} from '../services/aiLyricsService';
import {useProgress} from 'react-native-track-player';
import {createLogger} from '../utils/logger';

const log = createLogger('LyricsDisplay');

interface LyricsDisplayProps {
  artist: string;
  title: string;
  currentTime: number;
  audioUrl?: string; // For AI transcription fallback
}

export function LyricsDisplay({artist, title, currentTime, audioUrl}: LyricsDisplayProps) {
  const theme = useTheme();
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentLineRef = useRef<View>(null);
  const {position} = useProgress();

  useEffect(() => {
    loadLyrics();
  }, [artist, title]);

  useEffect(() => {
    if (lyrics && autoScroll) {
      scrollToCurrentLine();
    }
  }, [currentTime, lyrics, autoScroll]);

  const loadLyrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // First, try API-based lyrics
      let result = await lyricsService.getLyrics(artist, title);
      
      // If not found and audioUrl provided, try AI transcription
      if (!result && audioUrl) {
        try {
          const transcribed = await aiLyricsService.transcribeAudio(audioUrl);
          if (transcribed) {
            // Convert to lyrics format
            const syncedLyrics = aiLyricsService.convertToSyncedLyrics(transcribed);
            result = {
              synced: true,
              lines: syncedLyrics.lines,
              source: 'ai-transcription',
            } as Lyrics;
          }
        } catch (transcribeErr) {
          log.warn('AI transcription failed; falling back', {message: String(transcribeErr)});
        }
      }
      
      if (result) {
        setLyrics(result);
      } else {
        setError('Lyrics not found');
      }
    } catch (err) {
      setError('Failed to load lyrics');
      log.error('loadLyrics failed', {message: String(err)});
    } finally {
      setLoading(false);
    }
  };

  const scrollToCurrentLine = () => {
    if (!lyrics || !scrollViewRef.current || !currentLineRef.current) {
      return;
    }

    currentLineRef.current.measureLayout(
      scrollViewRef.current as any,
      (x, y) => {
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, y - 100), // Offset to keep current line in view
          animated: true,
        });
      },
      () => {}
    );
  };

  const currentLine = lyrics ? lyricsService.getCurrentLine(lyrics, currentTime || position) : null;

  if (loading) {
    return (
      <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Card.Content>
          <View style={styles.centerContent}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.loadingText, {color: theme.colors.onSurfaceVariant}]}>
              Loading lyrics...
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (error || !lyrics) {
    return (
      <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Card.Content>
          <View style={styles.centerContent}>
            <MaterialCommunityIcons
              name="music-note-off"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.errorText, {color: theme.colors.onSurfaceVariant}]}>
              {error || 'Lyrics not available'}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.header}>
          <Text style={[styles.title, {color: theme.colors.onSurface}]}>
            Lyrics {lyrics.synced && '• Synced'}
          </Text>
          <IconButton
            icon={autoScroll ? 'arrow-down-circle' : 'arrow-down-circle-outline'}
            size={20}
            onPress={() => setAutoScroll(!autoScroll)}
            iconColor={theme.colors.primary}
          />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => setAutoScroll(false)}>
          <View style={styles.lyricsContainer}>
            {lyrics.lines.map((line: LyricsLine, index: number) => {
              const isCurrentLine = currentLine?.time === line.time;
              const isPast = line.time < (currentTime || position);
              const isFuture = line.time > (currentTime || position);

              return (
                <View
                  key={`${line.time}-${index}`}
                  ref={isCurrentLine ? currentLineRef : undefined}
                  style={[
                    styles.lineContainer,
                    isCurrentLine && {
                      backgroundColor: theme.colors.primaryContainer,
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.lineText,
                      {
                        color: isCurrentLine
                          ? theme.colors.onPrimaryContainer
                          : isPast
                          ? theme.colors.onSurfaceVariant
                          : theme.colors.onSurface,
                        fontSize: isCurrentLine ? 18 : 16,
                        fontWeight: isCurrentLine ? '600' : '400',
                      },
                    ]}>
                    {line.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    maxHeight: 400,
  },
  lyricsContainer: {
    paddingVertical: 8,
  },
  lineContainer: {
    paddingVertical: 8,
    minHeight: 32,
  },
  lineText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
});


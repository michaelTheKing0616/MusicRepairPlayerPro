import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {useTheme, Text} from 'react-native-paper';
import {MusicIdentifier} from '../components/MusicIdentifier';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {createLogger} from '../utils/logger';
import type {IdentifiedTrack} from '../services/musicIdentificationService';

const log = createLogger('MusicIdentificationScreen');

type NavigationProp = StackNavigationProp<RootStackParamList>;

export function MusicIdentificationScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const handleTrackIdentified = (track: IdentifiedTrack) => {
    log.info('track identified', {title: track.title, artist: track.artist});
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.title, {color: theme.colors.onSurface}]}>
          Identify Music
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, {color: theme.colors.onSurfaceVariant}]}>
          Tap the button below to identify music playing around you, or upload an audio file
        </Text>
      </View>

      <MusicIdentifier onTrackIdentified={handleTrackIdentified} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    lineHeight: 20,
  },
});


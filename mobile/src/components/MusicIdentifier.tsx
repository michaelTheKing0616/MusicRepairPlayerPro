import React, {useState} from 'react';
import {View, StyleSheet, Alert, ActivityIndicator} from 'react-native';
import {
  Card,
  Text,
  Button,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {musicIdentificationService, IdentifiedTrack} from '../services/musicIdentificationService';
import {hapticService} from '../services/hapticService';
import {request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import {Platform} from 'react-native';
// Note: react-native-audio-recorder-player may need to be installed
// For now, using placeholder implementation
// import AudioRecord from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import {createLogger} from '../utils/logger';

const log = createLogger('MusicIdentifier');

interface MusicIdentifierProps {
  onTrackIdentified?: (track: IdentifiedTrack) => void;
}

export function MusicIdentifier({onTrackIdentified}: MusicIdentifierProps) {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifiedTrack, setIdentifiedTrack] = useState<IdentifiedTrack | null>(null);
  const [recordingPath, setRecordingPath] = useState<string | null>(null);
  // Audio recording will be handled via backend API

  const handleStartRecording = async () => {
    try {
      // Request microphone permission
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.MICROPHONE
        : PERMISSIONS.ANDROID.RECORD_AUDIO;

      const result = await request(permission);

      if (result !== RESULTS.GRANTED) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is needed to identify music'
        );
        return;
      }

      hapticService.medium();
      setIsRecording(true);
      setIdentifiedTrack(null);

      // TODO: Implement audio recording via backend API or native module
      // For now, show message that recording feature needs backend implementation
      Alert.alert(
        'Recording Not Available',
        'Audio recording will be available once the backend API is configured. Use "Upload Audio" instead.'
      );
      setIsRecording(false);
      return;
      
      // Placeholder for future implementation:
      // const path = Platform.OS === 'ios'
      //   ? `${RNFS.DocumentDirectoryPath}/recording.m4a`
      //   : `${RNFS.CachesDirectoryPath}/recording.mp3`;
      // setRecordingPath(path);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        handleStopRecording();
      }, 10000);
    } catch (error) {
      log.error('start recording failed', {message: String(error)});
      Alert.alert('Error', 'Failed to start recording');
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    try {
      // TODO: Stop recording when audio recording is implemented
      setIsRecording(false);

      if (recordingPath) {
        handleIdentify(recordingPath);
      }
    } catch (error) {
      log.error('stop recording failed', {message: String(error)});
      setIsRecording(false);
    }
  };

  const handleIdentify = async (audioPath: string) => {
    try {
      setIsIdentifying(true);
      hapticService.medium();

      const result = await musicIdentificationService.identifyFromRecording(audioPath);

      if (result) {
        setIdentifiedTrack(result);
        hapticService.success();
        onTrackIdentified?.(result);
      } else {
        Alert.alert(
          'Not Found',
          'Could not identify this track. Try recording for longer or in a quieter environment.'
        );
        hapticService.error();
      }
    } catch (error) {
      log.error('identify failed', {message: String(error)});
      Alert.alert('Error', 'Failed to identify music');
      hapticService.error();
    } finally {
      setIsIdentifying(false);
      // Cleanup recording file
      if (recordingPath) {
        RNFS.unlink(recordingPath).catch(() => {});
      }
    }
  };

  const handleIdentifyFromFile = async () => {
    try {
      const {DocumentPicker} = require('react-native-document-picker');
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
      });

      if (result && result[0]) {
        setIsIdentifying(true);
        hapticService.medium();

        const identified = await musicIdentificationService.identifyFromFile(result[0].uri);

        if (identified) {
          setIdentifiedTrack(identified);
          hapticService.success();
          onTrackIdentified?.(identified);
        } else {
          Alert.alert('Not Found', 'Could not identify this track');
          hapticService.error();
        }

        setIsIdentifying(false);
      }
    } catch (error: any) {
      if (error?.code !== 'DOCUMENT_PICKER_CANCELED') {
        log.error('document pick failed', {message: String(error)});
        Alert.alert('Error', 'Failed to pick file');
      }
      setIsIdentifying(false);
    }
  };

  return (
    <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
      <Card.Content>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="music-search"
            size={32}
            color={theme.colors.primary}
          />
          <Text style={[styles.title, {color: theme.colors.onSurface}]}>
            Identify Music
          </Text>
        </View>

        <Text
          style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
          Record or upload audio to identify the track
        </Text>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <MaterialCommunityIcons
              name="microphone"
              size={24}
              color={theme.colors.error}
            />
            <Text style={[styles.recordingText, {color: theme.colors.error}]}>
              Listening... Tap to stop
            </Text>
          </View>
        )}

        {isIdentifying && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              style={[styles.processingText, {color: theme.colors.onSurface}]}>
              Identifying track...
            </Text>
            <ProgressBar indeterminate color={theme.colors.primary} />
          </View>
        )}

        {identifiedTrack && (
          <View style={styles.resultContainer}>
            <MaterialCommunityIcons
              name="check-circle"
              size={48}
              color={theme.colors.primary}
            />
            <Text
              style={[styles.resultTitle, {color: theme.colors.onSurface}]}>
              {identifiedTrack.title}
            </Text>
            <Text
              style={[styles.resultArtist, {color: theme.colors.onSurfaceVariant}]}>
              {identifiedTrack.artist}
            </Text>
            {identifiedTrack.album && (
              <Text
                style={[styles.resultAlbum, {color: theme.colors.onSurfaceVariant}]}>
                {identifiedTrack.album}
              </Text>
            )}
            <Text
              style={[
                styles.confidence,
                {color: theme.colors.onSurfaceVariant},
              ]}>
              Confidence: {Math.round(identifiedTrack.confidence * 100)}%
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          {!isRecording && !isIdentifying && (
            <>
              <Button
                mode="contained"
                onPress={handleStartRecording}
                icon="microphone"
                style={styles.button}>
                {identifiedTrack ? 'Identify Again' : 'Listen & Identify'}
              </Button>
              <Button
                mode="outlined"
                onPress={handleIdentifyFromFile}
                icon="file-upload"
                style={styles.button}>
                Upload Audio
              </Button>
            </>
          )}

          {isRecording && (
            <Button
              mode="contained"
              onPress={handleStopRecording}
              icon="stop"
              buttonColor={theme.colors.error}
              style={styles.button}>
              Stop Recording
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  processingText: {
    fontSize: 16,
    marginTop: 8,
  },
  resultContainer: {
    alignItems: 'center',
    padding: 24,
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  resultArtist: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  resultAlbum: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  confidence: {
    fontSize: 12,
    marginTop: 8,
  },
  actions: {
    gap: 12,
  },
  button: {
    marginTop: 8,
  },
});


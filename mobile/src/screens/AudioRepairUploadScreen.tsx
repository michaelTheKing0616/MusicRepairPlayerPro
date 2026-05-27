import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  ProgressBar,
  SegmentedButtons,
  useTheme,
  Portal,
  Dialog,
  TextInput,
  Chip,
} from 'react-native-paper';
import DocumentPicker from 'react-native-document-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../services/api';
import {AudioFile} from '../types';
import {RepairProgressAnimation} from '../components/RepairProgressAnimation';
import {ABPreview} from '../components/ABPreview';
import {useHandsFree} from '../context/HandsFreeContext';
import {useAuth} from '../context/AuthContext';
import {useAudioSettings} from '../hooks/useAudioSettings';
import {createLogger} from '../utils/logger';
import {audioTransformService} from '../services/audioTransformService';
import Slider from '@react-native-community/slider';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/AppNavigator';
import {hapticService} from '../services/hapticService';
import {onDeviceRepairService} from '../services/onDeviceRepairService';

const log = createLogger('AudioRepairUploadScreen');

/** Maps backend job statuses to RepairProgressAnimation (no `queued` variant). */
function toVisualRepairStatus(
  backend: string,
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (backend) {
    case 'queued':
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    default:
      return 'pending';
  }
}

export function AudioRepairUploadScreen() {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const {user} = useAuth();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modelType, setModelType] = useState<
    'deepfilternet' | 'demucs' | 'uvr'
  >('deepfilternet');
  const [cloudOpen, setCloudOpen] = useState(false);
  const [cloudQuality, setCloudQuality] = useState<'preview' | 'standard' | 'high'>('preview');
  const [cloudSeparateStems, setCloudSeparateStems] = useState(false);
  const [cloudExtractContent, setCloudExtractContent] = useState(false);
  const [cloudIntensity, setCloudIntensity] = useState(0.85);
  const [cloudVoicePreset, setCloudVoicePreset] = useState('');
  const [cloudStylePreset, setCloudStylePreset] = useState('');
  const [cloudSubmitting, setCloudSubmitting] = useState(false);
  const [onDeviceSubmitting, setOnDeviceSubmitting] = useState(false);
  const [onDeviceProgressText, setOnDeviceProgressText] = useState<string>('');
  const [onDeviceEngine, setOnDeviceEngine] = useState<'music' | 'speech'>('music');
  const [repairing, setRepairing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<AudioFile | null>(null);
  const [uploadJobId, setUploadJobId] = useState<string | null>(null);
  /** Celery/async job UUID returned from POST /audio/repair */
  const [repairJobId, setRepairJobId] = useState<string | null>(null);
  const [repairProgress, setRepairProgress] = useState(0);
  const [repairStatus, setRepairStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed'
  >('pending');
  const [backendJobStatus, setBackendJobStatus] = useState<string | null>(
    null,
  );
  const [currentStep, setCurrentStep] = useState<string>('');
  const [repairedFile, setRepairedFile] = useState<AudioFile | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const {enabled: handsFree, setEnabled: setHandsFree} = useHandsFree();
  const {settings: audioSettings} = useAudioSettings();

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPolling(), [clearPolling]);

  const selectFile = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.audio],
        copyTo: 'cachesDirectory',
      });

      if (result && result[0]) {
        setSelectedFile(result[0]);
        setUploadedFile(null);
        setUploadJobId(null);
        setRepairJobId(null);
        setRepairedFile(null);
        setRepairStatus('pending');
        setRepairProgress(0);
        setCurrentStep('');
      }
    } catch (error) {
      if (DocumentPicker.isCancel(error)) {
        return;
      }
      Alert.alert('Error', 'Failed to select file');
      log.error('Document pick failed', error);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const {audioFile, uploadJobId: uj} = await apiService.uploadAudioFileWithJob(
        selectedFile.uri,
        selectedFile.name,
        progress => setUploadProgress(progress / 100),
      );

      setUploadedFile(audioFile);
      setUploadJobId(uj || null);
      setSelectedFile(null);
      Alert.alert('Success', 'File uploaded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload file');
      log.error('Upload failed', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const pollRepairProgress = useCallback(
    (jobId: string) => {
      clearPolling();
      pollRef.current = setInterval(async () => {
        try {
          const js = await apiService.getJobStatus(jobId);
          setBackendJobStatus(js.status);
          const pct =
            typeof js.progress?.percentComplete === 'number'
              ? js.progress.percentComplete
              : 0;
          setRepairProgress(Math.max(0, Math.min(100, pct)));
          setCurrentStep(
            js.progress?.currentOperation ?? js.progress?.stage ?? '',
          );

          if (js.status === 'completed') {
            setRepairStatus('completed');
            setRepairing(false);
            clearPolling();

            const signed = js.result?.signedUrl ?? '';
            if (signed && uploadedFile) {
              setRepairedFile({
                ...uploadedFile,
                id: `${uploadedFile.id}-repaired`,
                filename: `repaired-${uploadedFile.filename}`,
                originalFilename: `repaired-${uploadedFile.originalFilename}`,
                mimeType: 'audio/wav',
                supabaseUrl: signed,
                status: 'completed',
                fileSize: js.result?.fileSize ?? uploadedFile.fileSize,
                duration:
                  typeof js.result?.duration === 'number'
                    ? js.result.duration
                    : uploadedFile.duration,
              });
            } else if (uploadedFile) {
              log.warn('repair completed without signed URL in job result');
            }
          } else if (js.status === 'failed') {
            setRepairStatus('failed');
            setRepairing(false);
            setCurrentStep(js.error?.message ?? 'Repair failed');
            clearPolling();
            Alert.alert(
              'Repair failed',
              js.error?.message ?? 'The repair job failed.',
            );
          } else if (js.status === 'queued' || js.status === 'processing') {
            setRepairStatus('processing');
          }
        } catch (err: any) {
          log.error('Job poll failed', err);
        }
      }, 1500);

      timeoutRef.current = setTimeout(() => {
        clearPolling();
        setRepairing(prev => {
          if (prev) {
            Alert.alert(
              'Timeout',
              'Repair is taking longer than expected. Open Repair again to check progress via job history.',
            );
            setRepairStatus('failed');
            setCurrentStep('Timed out waiting for worker');
          }
          return false;
        });
      }, 600_000);
    },
    [clearPolling, uploadedFile],
  );

  const repairAudio = async () => {
    if (!uploadedFile) {
      Alert.alert('Error', 'Please upload a file first');
      return;
    }
    if (!user?.consent_audio_processing) {
      Alert.alert(
        'Consent required',
        'Enable audio processing consent in your profile to run repairs.',
      );
      return;
    }

    clearPolling();
    setRepairing(true);
    setRepairStatus('processing');
    setRepairProgress(0);
    setRepairedFile(null);
    setRepairJobId(null);
    setBackendJobStatus(null);
    setDialogVisible(true);

    try {
      const enqueue = await apiService.repairAudio(
        uploadedFile.id,
        modelType,
        audioSettings,
      );
      setRepairJobId(enqueue.id);
      const q = enqueue.status ?? 'queued';
      setBackendJobStatus(q);
      pollRepairProgress(enqueue.id);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ??
        error?.message ??
        'Failed to start repair process';
      setRepairStatus('failed');
      setRepairing(false);
      setDialogVisible(false);
      Alert.alert('Error', typeof msg === 'string' ? msg : JSON.stringify(msg));
      log.error('repairAudio failed', error);
    }
  };

  const startCloudTransform = async () => {
    if (!uploadedFile) return;
    if (!uploadJobId) {
      Alert.alert('Cloud AI', 'Missing upload job id. Please re-upload the file.');
      return;
    }
    if (!user?.consent_audio_processing) {
      Alert.alert('Consent required', 'Enable audio processing consent to use Cloud AI transforms.');
      return;
    }

    const voicePreset = cloudVoicePreset.trim() || undefined;
    const stylePreset = cloudStylePreset.trim() || undefined;
    const transformType = stylePreset ? 'combined' : 'voice';

    if ((transformType === 'voice' || transformType === 'combined') && voicePreset) {
      if (!user?.consent_voice_cloning) {
        Alert.alert('Consent required', 'Voice cloning consent is required for voice transforms.');
        return;
      }
      if (!user?.age_verified) {
        Alert.alert('Age verification required', 'Age verification is required for voice transforms.');
        return;
      }
    }

    try {
      setCloudSubmitting(true);
      hapticService.selection();
      await audioTransformService.requestTransform(uploadJobId, {
        voicePreset,
        stylePreset,
        intensity: Math.max(0, Math.min(1, cloudIntensity)),
        preservePitch: true,
        separateStems: cloudSeparateStems,
        extractContent: cloudExtractContent,
        quality: cloudQuality,
      });
      hapticService.success();
      Alert.alert('Queued', 'Cloud AI transform queued. Track it in Activity → Jobs.');
      navigation.navigate('Activity', {initialSegment: 'jobs'});
    } catch (e: any) {
      hapticService.error();
      const msg =
        e?.response?.data?.detail ??
        e?.message ??
        'Could not start Cloud AI transform (worker may be unavailable).';
      Alert.alert('Cloud AI', typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setCloudSubmitting(false);
    }
  };

  const startOnDeviceRepair = async () => {
    if (!uploadedFile) return;
    if (!user?.consent_audio_processing) {
      Alert.alert('Consent required', 'Enable audio processing consent to use on-device repair.');
      return;
    }
    // Prefer the local cached upload source when available. Otherwise fallback to the signed/origin URL.
    const inputUri =
      (selectedFile?.fileCopyUri ?? selectedFile?.uri ?? uploadedFile.supabaseUrl) as string;
    if (!inputUri) {
      Alert.alert('On-device repair', 'Missing input file URI.');
      return;
    }
    try {
      setOnDeviceSubmitting(true);
      setOnDeviceProgressText('Starting…');
      hapticService.selection();
      const mode = modelType === 'deepfilternet' ? 'clean' : modelType === 'demucs' ? 'punch' : 'vocal';
      const res = await onDeviceRepairService.repairFullFile(
        {
          inputUri,
          outputFormat: 'm4a',
          mode,
          preferMusicModel: onDeviceEngine === 'music',
        },
        (_pct, timeSec) => {
          if (timeSec != null && Number.isFinite(timeSec)) {
            setOnDeviceProgressText(`Processing… ${Math.round(timeSec)}s`);
          }
        },
      );
      setRepairedFile({
        ...uploadedFile,
        id: `${uploadedFile.id}-ondevice`,
        filename: `ondevice-${uploadedFile.filename}`,
        originalFilename: `ondevice-${uploadedFile.originalFilename}`,
        mimeType: 'audio/mp4',
        supabaseUrl: res.outputUri,
        status: 'completed',
      });
      hapticService.success();
      Alert.alert('On-device repair', 'Repaired file created on-device. Use A/B Preview to compare.');
    } catch (e: any) {
      hapticService.error();
      Alert.alert('On-device repair failed', e?.message || 'Failed to repair on-device.');
    } finally {
      setOnDeviceSubmitting(false);
      setOnDeviceProgressText('');
    }
  };

  const cancelOnDeviceRepair = () => {
    onDeviceRepairService.cancelActive();
    setOnDeviceSubmitting(false);
    setOnDeviceProgressText('');
  };

  const reset = () => {
    clearPolling();
    setSelectedFile(null);
    setUploadedFile(null);
    setRepairJobId(null);
    setUploadProgress(0);
    setRepairProgress(0);
    setRepairStatus('pending');
    setBackendJobStatus(null);
    setCurrentStep('');
    setRepairedFile(null);
    setRepairing(false);
    setDialogVisible(false);
  };

  const showProgressBanner =
    repairJobId !== null &&
    !!backendJobStatus &&
    backendJobStatus !== 'completed' &&
    backendJobStatus !== 'failed';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained-tonal"
            icon="progress-clock"
            onPress={() => navigation.navigate('Activity', {initialSegment: 'jobs'})}
            style={{marginBottom: 12}}>
            View repair jobs & queue
          </Button>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Select Audio File
          </Text>
          <Text variant="bodyMedium" style={styles.sectionDescription}>
            Choose an audio file that needs repair (MP3, WAV, FLAC, etc.)
          </Text>

          {selectedFile ? (
            <View style={styles.fileInfo}>
              <MaterialCommunityIcons
                name="file-music"
                size={48}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" numberOfLines={2} style={styles.fileName}>
                {selectedFile.name}
              </Text>
              <Text variant="bodySmall" style={styles.fileSize}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
              <Button
                mode="outlined"
                onPress={selectFile}
                style={styles.button}
                disabled={uploading}>
                Change File
              </Button>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={selectFile}
              icon="file-upload"
              style={styles.button}
              disabled={uploading}>
              Select Audio File
            </Button>
          )}

          {selectedFile && !uploadedFile && (
            <>
              {uploading && (
                <View style={styles.progressContainer}>
                  <ProgressBar progress={uploadProgress} color={theme.colors.primary} />
                  <Text variant="bodySmall" style={styles.progressText}>
                    {Math.round(uploadProgress * 100)}% uploaded
                  </Text>
                </View>
              )}

              <Button
                mode="contained"
                onPress={uploadFile}
                icon="cloud-upload"
                style={styles.button}
                disabled={uploading}
                loading={uploading}>
                Upload File
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {uploadedFile && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Choose Repair Model
            </Text>
            <Text variant="bodyMedium" style={styles.sectionDescription}>
              These are backend FFmpeg repair profiles (DSP). “AI” model names here are compatibility labels.
            </Text>

            <SegmentedButtons
              value={modelType}
              onValueChange={value =>
                setModelType(value as 'deepfilternet' | 'demucs' | 'uvr')
              }
              buttons={[
                {
                  value: 'deepfilternet',
                  label: 'Clean',
                  icon: 'robot',
                },
                {
                  value: 'demucs',
                  label: 'Punch',
                  icon: 'music-clef-treble',
                },
                {
                  value: 'uvr',
                  label: 'Vocal',
                  icon: 'waveform',
                },
              ]}
              style={styles.segmentedButtons}
            />

            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginTop: 10}}>
              {modelType === 'deepfilternet'
                ? 'Clean: noise + gentle dynamics. Great default for most tracks.'
                : modelType === 'demucs'
                  ? 'Punch: stereo widening + tighter dynamics. Good for modern mixes.'
                  : 'Vocal: presence lift + vocal-forward shaping. Good for speech and vocals.'}
            </Text>
            <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginTop: 6}}>
              For true heavy AI transforms (stems/voice/style), use Transform jobs (cloud worker) — on-device AI repair is not wired yet in this app.
            </Text>

            <Card style={{marginTop: 12, backgroundColor: theme.colors.surface}}>
              <Card.Content>
                <Text variant="titleMedium">Repair modes</Text>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginTop: 6}}>
                  Pick the right tool for the job. You can preview changes before exporting a repaired file.
                </Text>
                <View style={{marginTop: 10, gap: 10}}>
                  <View>
                    <Text variant="labelLarge">On-device AI (Preview)</Text>
                    <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                      Fast, private, short segments. Uses DSP + on-device ML (when enabled).
                    </Text>
                  </View>
                  <View>
                    <Text variant="labelLarge">DSP Repair (Worker)</Text>
                    <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                      Full-file processing on the backend worker using FFmpeg chains. Reliable and consistent.
                    </Text>
                  </View>
                  <View>
                    <Text variant="labelLarge">Cloud AI Transform</Text>
                    <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                      Heavy ML (stems / voice / style). Requires extra consent and may be unavailable on minimal servers.
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

            <Card style={{marginTop: 12, backgroundColor: theme.colors.surface}}>
              <Card.Content>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
                  <Text variant="titleMedium">Cloud AI Transform</Text>
                  <Button mode="text" onPress={() => setCloudOpen(v => !v)}>
                    {cloudOpen ? 'Hide' : 'Show'}
                  </Button>
                </View>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant, marginTop: 6}}>
                  Stems / voice / style processing on a worker. Requires consent (and age verification for voice).
                </Text>

                {cloudOpen ? (
                  <View style={{marginTop: 10, gap: 10}}>
                    <TextInput
                      label="Voice preset (optional)"
                      value={cloudVoicePreset}
                      onChangeText={setCloudVoicePreset}
                      mode="outlined"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextInput
                      label="Style preset (optional)"
                      value={cloudStylePreset}
                      onChangeText={setCloudStylePreset}
                      mode="outlined"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />

                    <Text variant="labelLarge">Intensity</Text>
                    <Slider
                      minimumValue={0.1}
                      maximumValue={1.0}
                      step={0.05}
                      value={cloudIntensity}
                      onValueChange={setCloudIntensity}
                      minimumTrackTintColor={theme.colors.primary}
                      maximumTrackTintColor={theme.colors.surfaceVariant}
                      thumbTintColor={theme.colors.primary}
                    />
                    <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                      {Math.round(cloudIntensity * 100)}%
                    </Text>

                    <SegmentedButtons
                      value={cloudQuality}
                      onValueChange={v => setCloudQuality(v as any)}
                      buttons={[
                        {value: 'preview', label: 'Preview'},
                        {value: 'standard', label: 'Standard'},
                        {value: 'high', label: 'High'},
                      ]}
                    />

                    <View style={{flexDirection: 'row', gap: 12, flexWrap: 'wrap'}}>
                      <Chip
                        selected={cloudSeparateStems}
                        onPress={() => setCloudSeparateStems(v => !v)}
                        icon="layers">
                        Separate stems
                      </Chip>
                      <Chip
                        selected={cloudExtractContent}
                        onPress={() => setCloudExtractContent(v => !v)}
                        icon="text-search">
                        Extract content
                      </Chip>
                    </View>

                    <Button
                      mode="contained"
                      icon="cloud"
                      loading={cloudSubmitting}
                      disabled={cloudSubmitting || !user?.consent_audio_processing}
                      onPress={startCloudTransform}>
                      Start Cloud Transform
                    </Button>
                  </View>
                ) : null}
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              onPress={repairAudio}
              icon="toolbox"
              style={styles.button}
              disabled={repairing || !user?.consent_audio_processing}>
              Start Repair
            </Button>

            <Button
              mode="contained-tonal"
              onPress={startOnDeviceRepair}
              icon="cellphone-cog"
              style={styles.button}
              loading={onDeviceSubmitting}
              disabled={onDeviceSubmitting || !user?.consent_audio_processing}>
              On-device repair (full file)
            </Button>
            <SegmentedButtons
              value={onDeviceEngine}
              onValueChange={v => setOnDeviceEngine(v as any)}
              buttons={[
                {value: 'music', label: 'Music (48k ML)'},
                {value: 'speech', label: 'Speech (16k ML)'},
              ]}
              style={{marginTop: 8}}
            />
            {onDeviceSubmitting ? (
              <View style={{marginTop: 8, gap: 8}}>
                <Text variant="bodySmall" style={{color: theme.colors.onSurfaceVariant}}>
                  {onDeviceProgressText || 'Processing…'}
                </Text>
                <Button mode="text" icon="close-circle-outline" onPress={cancelOnDeviceRepair}>
                  Cancel on-device repair
                </Button>
              </View>
            ) : null}
          </Card.Content>
        </Card>
      )}

      {showProgressBanner && (
        <RepairProgressAnimation
          progress={repairProgress}
          status={toVisualRepairStatus(backendJobStatus ?? '')}
          currentStep={currentStep || backendJobStatus || ''}
        />
      )}

      {uploadedFile && (
        <ABPreview
          originalAudio={uploadedFile}
          repairedAudio={repairedFile}
          handsFree={handsFree}
          onHandsFreeChange={setHandsFree}
        />
      )}

      {uploadedFile && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.uploadedFileInfo}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium">
                File uploaded: {uploadedFile.originalFilename}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => !repairing && setDialogVisible(false)}>
          <Dialog.Title>Processing Audio Repair</Dialog.Title>
          <Dialog.Content>
            {repairing && !repairJobId ? (
              <View style={styles.dialogContent}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.dialogText}>
                  Submitting repair job…
                </Text>
              </View>
            ) : repairing && repairJobId ? (
              <View style={styles.dialogContent}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text variant="bodyMedium" style={styles.dialogText}>
                  Repair running (job {repairJobId.slice(0, 8)}…)
                </Text>
                <Text variant="bodySmall" style={styles.dialogSubtext}>
                  Status: {backendJobStatus ?? '…'} — {repairProgress}% —{' '}
                  {currentStep || '—'}
                </Text>
              </View>
            ) : repairStatus === 'completed' ? (
              <View style={styles.dialogContent}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={48}
                  color={theme.colors.primary}
                />
                <Text variant="bodyMedium" style={styles.dialogText}>
                  Repair completed.
                </Text>
              </View>
            ) : (
              <View style={styles.dialogContent}>
                <Text variant="bodyMedium" style={styles.dialogText}>
                  Ready
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDialogVisible(false);
                if (repairStatus === 'completed' || repairStatus === 'failed') {
                  reset();
                }
              }}>
              {repairStatus === 'completed'
                ? 'Done'
                : repairStatus === 'failed'
                  ? 'Close'
                  : 'Hide'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  button: {
    marginTop: 16,
  },
  fileInfo: {
    alignItems: 'center',
    marginVertical: 16,
  },
  fileName: {
    marginTop: 12,
    textAlign: 'center',
  },
  fileSize: {
    marginTop: 4,
    opacity: 0.7,
  },
  progressContainer: {
    marginVertical: 16,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginVertical: 16,
  },
  uploadedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dialogContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dialogText: {
    marginTop: 16,
    textAlign: 'center',
  },
  dialogSubtext: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
});

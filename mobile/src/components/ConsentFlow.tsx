import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { ConsentState } from '../types';

interface ConsentFlowProps {
  onConsent: (state: ConsentState) => void;
  onDecline?: () => void;
}

interface ConsentSectionProps {
  title: string;
  description: string;
  required: boolean;
  value: boolean;
  onToggle: (value: boolean) => void;
}

const ConsentSection: React.FC<ConsentSectionProps> = ({
  title,
  description,
  required,
  value,
  onToggle,
}) => {
  return (
    <View style={styles.consentSection}>
      <View style={styles.consentHeader}>
        <Text style={styles.consentTitle}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      </View>
      <Text style={styles.consentDescription}>{description}</Text>
      <TouchableOpacity
        style={[styles.checkbox, value && styles.checkboxChecked]}
        onPress={() => onToggle(!value)}
        accessibilityLabel={`${value ? 'Uncheck' : 'Check'} ${title}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: value }}
      >
        <Text style={styles.checkboxText}>{value ? '✓' : ''}</Text>
      </TouchableOpacity>
    </View>
  );
};

const ConsentFlow: React.FC<ConsentFlowProps> = ({ onConsent, onDecline }) => {
  const [consent, setConsent] = useState<ConsentState>({
    audioProcessing: false,
    voiceCloning: false,
    dataRetention: false,
    analytics: false,
    modelTraining: false,
  });

  const [ageVerified, setAgeVerified] = useState(false);
  const [ageInput, setAgeInput] = useState('');

  const handleAgeVerification = () => {
    const age = parseInt(ageInput, 10);
    if (isNaN(age) || age < 18) {
      Alert.alert(
        'Age Requirement',
        'You must be 18 years or older to use voice transformation features.',
        [{ text: 'OK' }],
      );
      return;
    }
    setAgeVerified(true);
  };

  const handleConsent = () => {
    if (!consent.audioProcessing) {
      Alert.alert(
        'Required Consent',
        'You must agree to audio processing to use this service.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (consent.voiceCloning && !ageVerified) {
      Alert.alert(
        'Age Verification Required',
        'You must verify that you are 18 or older to use voice cloning features.',
        [{ text: 'OK' }],
      );
      return;
    }

    onConsent(consent);
  };

  const canProceed = consent.audioProcessing && (!consent.voiceCloning || ageVerified);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy & Consent</Text>
      <Text style={styles.subtitle}>
        Please review and consent to the following to use our audio transformation service.
      </Text>

      <ConsentSection
        title="Audio Processing Consent"
        description="We need your permission to process your audio files on our servers using AI models (Demucs, WhisperX, FreeVC, HiFi-GAN). Your audio will be temporarily stored for processing and deleted after 7 days (free tier) or 90 days (premium tier)."
        required={true}
        value={consent.audioProcessing}
        onToggle={value => setConsent({ ...consent, audioProcessing: value })}
      />

      <ConsentSection
        title="Voice Cloning Consent"
        description="Voice transformation features require processing your voice characteristics using open-source models (FreeVC, SO-VITS-SVC). You must be 18+ to use this feature. We prohibit impersonation or deceptive use. Your transformed audio will contain an imperceptible watermark for safety."
        required={false}
        value={consent.voiceCloning}
        onToggle={value => setConsent({ ...consent, voiceCloning: value })}
      />

      {consent.voiceCloning && !ageVerified && (
        <View style={styles.ageGate}>
          <Text style={styles.ageGateTitle}>Age Verification</Text>
          <Text style={styles.ageGateDescription}>
            Voice cloning features require you to be 18 years or older.
          </Text>
          <View style={styles.ageInputContainer}>
            <Text style={styles.ageInputLabel}>Your Age:</Text>
            <View style={styles.ageInputRow}>
              <Text
                style={styles.ageInput}
                accessibilityLabel="Age input"
                accessibilityRole="text"
              >
                {ageInput || 'Enter age'}
              </Text>
              <TouchableOpacity
                style={[styles.ageButton, !ageInput && styles.ageButtonDisabled]}
                onPress={handleAgeVerification}
                disabled={!ageInput}
              >
                <Text style={styles.ageButtonText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ConsentSection
        title="Data Retention"
        description="Your processed audio files will be stored temporarily for you to download. Free tier: 7 days retention. Premium tier: 90 days retention. You can delete your files anytime."
        required={false}
        value={consent.dataRetention}
        onToggle={value => setConsent({ ...consent, dataRetention: value })}
      />

      <ConsentSection
        title="Analytics (Optional)"
        description="Help us improve by sharing anonymous usage statistics. No personal audio data is included."
        required={false}
        value={consent.analytics}
        onToggle={value => setConsent({ ...consent, analytics: value })}
      />

      <ConsentSection
        title="Model Training (Optional)"
        description="Allow us to use anonymized audio (with your voice removed) to improve our open-source AI models. This helps us provide better service to all users. You can opt out anytime."
        required={false}
        value={consent.modelTraining}
        onToggle={value => setConsent({ ...consent, modelTraining: value })}
      />

      <View style={styles.legalNote}>
        <Text style={styles.legalNoteText}>
          By proceeding, you acknowledge that you have read and understood our{' '}
          <Text style={styles.link}>Terms of Service</Text> and{' '}
          <Text style={styles.link}>Privacy Policy</Text>. You agree not to use this service
          for impersonation, fraud, or any deceptive purposes.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {onDecline && (
          <TouchableOpacity
            style={[styles.button, styles.declineButton]}
            onPress={onDecline}
            accessibilityLabel="Decline consent"
            accessibilityRole="button"
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.acceptButton, !canProceed && styles.buttonDisabled]}
          onPress={handleConsent}
          disabled={!canProceed}
          accessibilityLabel="Accept consent and continue"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canProceed }}
        >
          <Text style={[styles.acceptButtonText, !canProceed && styles.buttonTextDisabled]}>
            I Understand and Agree
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  consentSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  consentHeader: {
    marginBottom: 8,
  },
  consentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  required: {
    color: '#d32f2f',
  },
  consentDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ageGate: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  ageGateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  ageGateDescription: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 12,
  },
  ageInputContainer: {
    marginTop: 8,
  },
  ageInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#856404',
    marginBottom: 8,
  },
  ageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'center',
  },
  ageButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  ageButtonDisabled: {
    backgroundColor: '#ccc',
  },
  ageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  legalNote: {
    marginTop: 24,
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  legalNoteText: {
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 18,
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#007AFF',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#999',
  },
});

export default ConsentFlow;


import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import {Text, ProgressBar, Card, useTheme} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface RepairProgressAnimationProps {
  progress: number; // 0-100
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentStep?: string;
}

interface WaveformBar {
  anim: Animated.Value;
  baseHeight: number;
}

export function RepairProgressAnimation({
  progress,
  status,
  currentStep,
}: RepairProgressAnimationProps) {
  const theme = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [waveformBars] = useState<WaveformBar[]>(() =>
    Array.from({length: 20}, () => ({
      anim: new Animated.Value(0.3),
      baseHeight: Math.random() * 20 + 15, // Random base height between 15-35
    })),
  );

  // Clamp progress between 0 and 100
  const clampedProgress = Math.max(0, Math.min(100, progress || 0));

  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    let rotateAnimation: Animated.CompositeAnimation | null = null;
    let waveformAnimations: Animated.CompositeAnimation[] = [];

    if (status === 'processing') {
      // Reset values before starting
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);

      // Pulsing animation
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      // Rotating animation
      rotateAnimation = Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      rotateAnimation.start();

      // Waveform animations - staggered wave effect
      waveformAnimations = waveformBars.map((bar: WaveformBar, index: number) => {
        const delay = index * 50;
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(bar.anim, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false, // Height animation needs JS driver
            }),
            Animated.timing(bar.anim, {
              toValue: 0.3,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: false,
            }),
          ]),
        );
      });

      waveformAnimations.forEach((anim: Animated.CompositeAnimation) => {
        try {
          anim.start();
        } catch {
          // Silently ignore animation errors
        }
      });
    } else {
      // Reset animations
      try {
        pulseAnim.setValue(1);
        rotateAnim.setValue(0);
        waveformBars.forEach((bar: WaveformBar) => bar.anim.setValue(0.3));
      } catch {
        // Silently ignore reset errors
      }
    }

    // Cleanup function
    return () => {
      try {
        pulseAnimation?.stop();
        rotateAnimation?.stop();
        waveformAnimations.forEach((anim: Animated.CompositeAnimation) =>
          anim.stop(),
        );
      } catch (error) {
        // Ignore cleanup errors silently
      }
    };
  }, [status, pulseAnim, rotateAnim, waveformBars]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusIcon = (): string => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'processing':
        return 'cog';
      case 'completed':
        return 'check-circle';
      case 'failed':
        return 'alert-circle';
      default:
        return 'clock-outline';
    }
  };

  const getStatusColor = (): string => {
    switch (status) {
      case 'pending':
        return theme.colors.onSurfaceVariant;
      case 'processing':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.primary;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStepText = (): string => {
    if (currentStep) return currentStep;

    const prog = clampedProgress;
    if (prog < 20) return 'Downloading audio...';
    if (prog < 40) return 'Denoising with DeepFilterNet...';
    if (prog < 60) return 'Separating sources with Demucs...';
    if (prog < 80) return 'Recombining and enhancing...';
    if (prog < 95) return 'Normalizing loudness...';
    return 'Finalizing...';
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.container}>
          {/* Animated Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  {scale: pulseAnim},
                  {rotate: status === 'processing' ? spin : '0deg'},
                ],
              },
            ]}>
            <MaterialCommunityIcons
              name={getStatusIcon()}
              size={64}
              color={getStatusColor()}
            />
          </Animated.View>

          {/* Status Text */}
          <Text variant="titleMedium" style={styles.statusText}>
            {status === 'processing'
              ? 'Processing Audio Repair'
              : status === 'completed'
              ? 'Repair Complete!'
              : status === 'failed'
              ? 'Repair Failed'
              : 'Preparing...'}
          </Text>

          {/* Current Step */}
          {status === 'processing' && (
            <Text variant="bodySmall" style={styles.stepText}>
              {getStepText()}
            </Text>
          )}

          {/* Progress Bar */}
          {status === 'processing' && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={clampedProgress / 100}
                color={theme.colors.primary}
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(clampedProgress)}%
              </Text>
            </View>
          )}

          {/* Progress Bar for completed/failed */}
          {(status === 'completed' || status === 'failed') && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={status === 'completed' ? 1 : 0}
                color={
                  status === 'completed'
                    ? theme.colors.primary
                    : theme.colors.error
                }
                style={styles.progressBar}
              />
              <Text variant="bodySmall" style={styles.progressText}>
                {status === 'completed' ? '100%' : '0%'}
              </Text>
            </View>
          )}

          {/* Waveform Animation */}
          {status === 'processing' && (
            <View style={styles.waveformContainer}>
              {waveformBars.map((bar: WaveformBar, i: number) => {
                // Interpolate height directly
                const animatedHeight = bar.anim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [
                    bar.baseHeight * 0.5,
                    bar.baseHeight * 1.5,
                  ],
                });

                const opacity = bar.anim.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [0.4, 1],
                });

                return (
                  <Animated.View
                    key={`waveform-${i}`}
                    style={[
                      styles.waveformBar,
                      {
                        backgroundColor: theme.colors.primary,
                        height: animatedHeight,
                        opacity: opacity,
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
  },
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  stepText: {
    opacity: 0.7,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: 50,
    marginTop: 24,
    paddingHorizontal: 8,
    gap: 3,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 10,
  },
});

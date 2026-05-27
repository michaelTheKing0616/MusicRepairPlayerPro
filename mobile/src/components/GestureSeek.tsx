import React, {useState, useRef, useEffect} from 'react';
import {View, StyleSheet, Pressable, Animated, Text, Dimensions} from 'react-native';
import {useTheme} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {hapticService} from '../services/hapticService';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SEEK_SECTION_WIDTH = SCREEN_WIDTH / 2;

interface GestureSeekProps {
  onSeekForward: (seconds: number) => void;
  onSeekBackward: (seconds: number) => void;
  currentPosition: number;
  duration: number;
  isVisible?: boolean;
}

export function GestureSeek({
  onSeekForward,
  onSeekBackward,
  currentPosition,
  duration,
  isVisible = true,
}: GestureSeekProps) {
  const theme = useTheme();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekDirection, setSeekDirection] = useState<'forward' | 'backward' | null>(null);
  const [seekAmount, setSeekAmount] = useState(0);
  const seekIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (isSeeking && seekDirection) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSeeking, seekDirection]);

  const startSeek = (direction: 'forward' | 'backward') => {
    if (!isVisible) return;

    setIsSeeking(true);
    setSeekDirection(direction);
    setSeekAmount(5); // Start with 5 seconds

    // Initial haptic feedback
    hapticService.selection();

    // Seek immediately
    if (direction === 'forward') {
      onSeekForward(5);
    } else {
      onSeekBackward(5);
    }

    // Incremental seek while holding
    seekIntervalRef.current = setInterval(() => {
      setSeekAmount(prev => {
        const newAmount = Math.min(prev + 5, direction === 'forward' ? duration - currentPosition : currentPosition);
        
        // Haptic feedback every 5 seconds
        hapticService.light();
        
        if (direction === 'forward') {
          onSeekForward(Math.min(newAmount, duration - currentPosition));
        } else {
          onSeekBackward(Math.min(newAmount, currentPosition));
        }
        
        return newAmount;
      });
    }, 500); // Update every 500ms for smooth seeking

    // Increase speed after 1 second of holding
    seekTimerRef.current = setTimeout(() => {
      if (seekIntervalRef.current) {
        clearInterval(seekIntervalRef.current);
      }
      
      seekIntervalRef.current = setInterval(() => {
        setSeekAmount(prev => {
          const newAmount = Math.min(prev + 10, direction === 'forward' ? duration - currentPosition : currentPosition);
          
          // Stronger haptic every 10 seconds
          hapticService.medium();
          
          if (direction === 'forward') {
            onSeekForward(Math.min(newAmount, duration - currentPosition));
          } else {
            onSeekBackward(Math.min(newAmount, currentPosition));
          }
          
          return newAmount;
        });
      }, 300); // Faster updates after 1 second
    }, 1000);
  };

  const stopSeek = () => {
    if (seekIntervalRef.current) {
      clearInterval(seekIntervalRef.current);
      seekIntervalRef.current = null;
    }
    if (seekTimerRef.current) {
      clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
    }
    
    setIsSeeking(false);
    setSeekDirection(null);
    setSeekAmount(0);
    
    // Final haptic feedback
    hapticService.success();
  };

  const formatSeekTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Left side - Rewind */}
      <Pressable
        style={[styles.seekArea, styles.leftArea]}
        onPressIn={() => startSeek('backward')}
        onPressOut={stopSeek}
        onLongPress={() => startSeek('backward')}>
        <View style={styles.seekAreaContent} />
      </Pressable>

      {/* Right side - Fast Forward */}
      <Pressable
        style={[styles.seekArea, styles.rightArea]}
        onPressIn={() => startSeek('forward')}
        onPressOut={stopSeek}
        onLongPress={() => startSeek('forward')}>
        <View style={styles.seekAreaContent} />
      </Pressable>

      {/* Seek Indicator Overlay */}
      {isSeeking && seekDirection && (
        <Animated.View
          style={[
            styles.seekIndicator,
            {
              opacity: fadeAnim,
              transform: [{scale: scaleAnim}],
              backgroundColor: theme.colors.surface,
            },
            seekDirection === 'forward' ? styles.forwardIndicator : styles.backwardIndicator,
          ]}
          pointerEvents="none">
          <MaterialCommunityIcons
            name={seekDirection === 'forward' ? 'fast-forward' : 'rewind'}
            size={48}
            color={theme.colors.primary}
          />
          <Text
            style={[
              styles.seekText,
              {
                color: theme.colors.primary,
              },
            ]}>
            {formatSeekTime(seekAmount)}
          </Text>
          <Text
            style={[
              styles.seekHint,
              {
                color: theme.colors.onSurfaceVariant,
              },
            ]}>
            {seekDirection === 'forward' ? 'Fast Forward' : 'Rewind'}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 10,
  },
  seekArea: {
    flex: 1,
    height: '100%',
  },
  leftArea: {
    // Left side for rewind
  },
  rightArea: {
    // Right side for fast forward
  },
  seekAreaContent: {
    flex: 1,
  },
  seekIndicator: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    minWidth: 140,
    minHeight: 140,
  },
  forwardIndicator: {
    // Positioned for forward
  },
  backwardIndicator: {
    // Positioned for backward
  },
  seekText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  seekHint: {
    fontSize: 14,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});


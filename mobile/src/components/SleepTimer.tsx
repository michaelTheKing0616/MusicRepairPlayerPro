import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {
  Card,
  Text,
  Button,
  useTheme,
  IconButton,
  Menu,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {sleepTimerService, SLEEP_TIMER_PRESETS} from '../services/sleepTimerService';
import {DeviceEventEmitter} from 'react-native';

export function SleepTimer() {
  const theme = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    setIsActive(sleepTimerService.getIsActive());
    setRemainingSeconds(sleepTimerService.getRemainingSeconds());

    const tickListener = DeviceEventEmitter.addListener(
      'sleepTimerTick',
      (seconds: number) => {
        setRemainingSeconds(seconds);
        setIsActive(seconds > 0);
      }
    );

    const endListener = DeviceEventEmitter.addListener('sleepTimerEnd', () => {
      setIsActive(false);
      setRemainingSeconds(0);
    });

    return () => {
      tickListener.remove();
      endListener.remove();
    };
  }, []);

  const handleStart = (minutes: number) => {
    sleepTimerService.start(minutes);
    setIsActive(true);
    setRemainingSeconds(minutes * 60);
    setMenuVisible(false);
  };

  const handleStop = () => {
    sleepTimerService.stop();
    setIsActive(false);
    setRemainingSeconds(0);
  };

  const handleAddTime = (minutes: number) => {
    sleepTimerService.addMinutes(minutes);
    setRemainingSeconds(sleepTimerService.getRemainingSeconds());
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) {
    return (
      <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Card.Content style={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.title, {color: theme.colors.onSurface}]}>
              Sleep Timer
            </Text>
          </View>

          <Text
            style={[styles.description, {color: theme.colors.onSurfaceVariant}]}>
            Automatically stop playback after a set time
          </Text>

          <View style={styles.presets}>
            {Object.entries(SLEEP_TIMER_PRESETS)
              .filter(([, value]) => value > 0)
              .map(([key, value]) => (
                <Chip
                  key={key}
                  mode="outlined"
                  onPress={() => handleStart(value)}
                  style={styles.presetChip}
                  icon="timer">
                  {value} min
                </Chip>
              ))}
          </View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card
      style={[
        styles.card,
        styles.activeCard,
        {backgroundColor: theme.colors.primaryContainer},
      ]}>
      <Card.Content style={styles.content}>
        <View style={styles.activeHeader}>
          <View style={styles.activeInfo}>
            <MaterialCommunityIcons
              name="timer"
              size={24}
              color={theme.colors.onPrimaryContainer}
            />
            <Text
              style={[
                styles.activeTitle,
                {color: theme.colors.onPrimaryContainer},
              ]}>
              Sleep Timer Active
            </Text>
          </View>
          <IconButton
            icon="close"
            size={20}
            iconColor={theme.colors.onPrimaryContainer}
            onPress={handleStop}
          />
        </View>

        <Text
          style={[
            styles.timeRemaining,
            {color: theme.colors.onPrimaryContainer},
          ]}>
          {formatTime(remainingSeconds)}
        </Text>

        <View style={styles.actions}>
          <Button
            mode="text"
            onPress={() => handleAddTime(5)}
            textColor={theme.colors.onPrimaryContainer}
            icon="plus">
            +5 min
          </Button>
          <Button
            mode="text"
            onPress={() => handleAddTime(15)}
            textColor={theme.colors.onPrimaryContainer}
            icon="plus">
            +15 min
          </Button>
          <Button
            mode="text"
            onPress={handleStop}
            textColor={theme.colors.onPrimaryContainer}
            icon="stop">
            Stop
          </Button>
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
  activeCard: {
    elevation: 4,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  timeRemaining: {
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
});


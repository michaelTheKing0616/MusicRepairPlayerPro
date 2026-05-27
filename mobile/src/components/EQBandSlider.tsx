import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, useTheme} from 'react-native-paper';
import Slider from '@react-native-community/slider';
import {EQBand} from '../types/audioSettings';

interface EQBandSliderProps {
  band: EQBand;
  onValueChange: (gain: number) => void;
  disabled?: boolean;
}

export function EQBandSlider({
  band,
  onValueChange,
  disabled = false,
}: EQBandSliderProps) {
  const theme = useTheme();

  const formatFrequency = (freq: number): string => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(1)}k`;
    }
    return freq.toString();
  };

  return (
    <View style={styles.container}>
      <Text
        variant="labelSmall"
        style={[styles.label, {color: theme.colors.onSurfaceVariant}]}>
        {formatFrequency(band.frequency)}
      </Text>
      <Slider
        style={styles.slider}
        value={band.gain}
        onValueChange={onValueChange}
        minimumValue={-12}
        maximumValue={12}
        step={0.5}
        disabled={disabled}
        minimumTrackTintColor={theme.colors.primary}
        maximumTrackTintColor={theme.colors.surfaceVariant}
      />
      <Text
        variant="labelSmall"
        style={[styles.value, {color: theme.colors.onSurfaceVariant}]}>
        {band.gain > 0 ? '+' : ''}
        {band.gain.toFixed(1)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  label: {
    marginBottom: 4,
    fontSize: 10,
  },
  slider: {
    width: '100%',
    height: 120,
  },
  value: {
    marginTop: 4,
    fontSize: 10,
  },
});


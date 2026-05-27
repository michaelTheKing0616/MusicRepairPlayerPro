import React, {useMemo, useState} from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {SegmentedButtons, Text, Card, useTheme} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {LISTENING_PRESETS} from '../preset-engine/catalog';
import type {PresetCategory, ListeningPresetDefinition} from '../preset-engine/types';
import {RootStackParamList} from '../navigation/AppNavigator';
import {hapticService} from '../services/hapticService';

type Nav = StackNavigationProp<RootStackParamList>;

const CATS: {value: PresetCategory | 'all'; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'home', label: 'Home'},
  {value: 'browse', label: 'Browse'},
  {value: 'pro', label: 'Pro'},
  {value: 'spatial', label: 'Spatial'},
];

export function ListeningPresetsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const [cat, setCat] = useState<(typeof CATS)[number]['value']>('all');

  const data = useMemo(() => {
    if (cat === 'all') return LISTENING_PRESETS;
    return LISTENING_PRESETS.filter(p => p.category === cat);
  }, [cat]);

  const open = (p: ListeningPresetDefinition) => {
    hapticService.light();
    const parent = navigation.getParent();
    if (parent) {
      parent.navigate('PresetDetail', {presetId: p.id});
    } else {
      navigation.navigate('PresetDetail', {presetId: p.id});
    }
  };

  return (
    <View style={[styles.root, {backgroundColor: theme.colors.background}]}>
      <Text variant="headlineSmall" style={styles.title}>
        Listening presets
      </Text>
      <Text variant="bodyMedium" style={{color: theme.colors.onSurfaceVariant, marginBottom: 8}}>
        90 deterministic chains (10 families × 9 tiers). Realtime uses EQ map; full graph =
        cloud render.
      </Text>
      <SegmentedButtons
        value={cat}
        onValueChange={v => setCat(v as (typeof CATS)[number]['value'])}
        buttons={CATS}
        style={styles.seg}
      />
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({item}) => (
          <Card style={styles.card} onPress={() => open(item)}>
            <Card.Title title={item.name} subtitle={item.summary} />
            <Card.Content>
              <Text variant="labelSmall" style={{color: theme.colors.primary}}>
                {item.category.toUpperCase()} · {item.routing}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, padding: 16},
  title: {marginBottom: 4},
  seg: {marginBottom: 12},
  list: {paddingBottom: 48, gap: 8},
  card: {marginBottom: 8},
});

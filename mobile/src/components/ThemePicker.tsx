import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {
  Card,
  Text,
  RadioButton,
  useTheme,
  Button,
  Chip,
} from 'react-native-paper';
import {themeService, ThemeMode, CustomColorScheme} from '../services/themeService';
import {useTheme as useAppTheme} from '../context/ThemeContext';
import {hapticService} from '../services/hapticService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export function ThemePicker() {
  const theme = useTheme();
  const {setTheme} = useAppTheme();
  const [selectedMode, setSelectedMode] = useState<ThemeMode>('auto');
  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [predefinedSchemes] = useState(themeService.getPredefinedSchemes());

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const config = await themeService.getTheme();
    setSelectedMode(config.mode);
    setSelectedScheme(config.name || null);
  };

  const handleModeChange = async (mode: ThemeMode) => {
    hapticService.light();
    setSelectedMode(mode);
    await themeService.setThemeMode(mode);
    setTheme(themeService.getPaperTheme(mode === 'dark'));
  };

  const handleSchemeSelect = async (schemeName: string, colors: CustomColorScheme) => {
    hapticService.medium();
    setSelectedScheme(schemeName);
    await themeService.setCustomColors(colors, schemeName);
    setTheme(themeService.getPaperTheme(false));
  };

  const handleReset = async () => {
    hapticService.medium();
    await themeService.resetTheme();
    setSelectedMode('auto');
    setSelectedScheme(null);
    setTheme(themeService.getPaperTheme(false));
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.colors.background}]}>
      <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Card.Content>
          <Text
            style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
            Theme Mode
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Choose how the app theme adapts
          </Text>

          <RadioButton.Group
            onValueChange={value => handleModeChange(value as ThemeMode)}
            value={selectedMode}>
            <View style={styles.radioOption}>
              <RadioButton value="light" />
              <Text style={[styles.radioLabel, {color: theme.colors.onSurface}]}>
                Light
              </Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="dark" />
              <Text style={[styles.radioLabel, {color: theme.colors.onSurface}]}>
                Dark
              </Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="auto" />
              <Text style={[styles.radioLabel, {color: theme.colors.onSurface}]}>
                Auto (Follow System)
              </Text>
            </View>
          </RadioButton.Group>
        </Card.Content>
      </Card>

      <Card style={[styles.card, {backgroundColor: theme.colors.surface}]}>
        <Card.Content>
          <Text
            style={[styles.sectionTitle, {color: theme.colors.onSurface}]}>
            Color Schemes
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              {color: theme.colors.onSurfaceVariant},
            ]}>
            Choose a color theme for your app
          </Text>

          <View style={styles.schemesGrid}>
            {predefinedSchemes.map((scheme, index) => (
              <Card
                key={index}
                style={[
                  styles.schemeCard,
                  {
                    backgroundColor: scheme.colors.surface,
                    borderColor:
                      selectedScheme === scheme.name
                        ? scheme.colors.primary
                        : theme.colors.outline,
                    borderWidth: selectedScheme === scheme.name ? 2 : 1,
                  },
                ]}
                onPress={() => handleSchemeSelect(scheme.name, scheme.colors)}>
                <Card.Content style={styles.schemeContent}>
                  <View
                    style={[
                      styles.colorPreview,
                      {backgroundColor: scheme.colors.primary},
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreview,
                      {backgroundColor: scheme.colors.secondary},
                    ]}
                  />
                  <View
                    style={[
                      styles.colorPreview,
                      {backgroundColor: scheme.colors.tertiary},
                    ]}
                  />
                  <Text
                    style={[
                      styles.schemeName,
                      {color: scheme.colors.primary},
                    ]}>
                    {scheme.name}
                  </Text>
                  {selectedScheme === scheme.name && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={scheme.colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </Card.Content>
              </Card>
            ))}
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleReset}
          icon="refresh"
          style={styles.resetButton}>
          Reset to Default
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  schemesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  schemeCard: {
    width: '47%',
    elevation: 2,
  },
  schemeContent: {
    alignItems: 'center',
    padding: 12,
    minHeight: 120,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginBottom: 8,
  },
  schemeName: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  checkIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  actions: {
    padding: 16,
  },
  resetButton: {
    marginTop: 8,
  },
});


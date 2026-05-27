import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import {View, ActivityIndicator, StyleSheet} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTheme, Switch} from 'react-native-paper';
import {useAuth} from '../context/AuthContext';
import {useHandsFree} from '../context/HandsFreeContext';

// Screens
import {LibraryScreen} from '../screens/LibraryScreen';
import {LocalMusicScreen} from '../screens/LocalMusicScreen';
import {AudioPlayerScreen} from '../screens/AudioPlayerScreen';
import {AudioRepairUploadScreen} from '../screens/AudioRepairUploadScreen';
import {RecentlyPlayedScreen} from '../screens/RecentlyPlayedScreen';
import {RecommendationsScreen} from '../screens/RecommendationsScreen';
import {DiscoveryScreen} from '../screens/DiscoveryScreen';
import {ArtistAlbumScreen} from '../screens/ArtistAlbumScreen';
import {MusicIdentificationScreen} from '../screens/MusicIdentificationScreen';
import {MusicChartsScreen} from '../screens/MusicChartsScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {ListeningPresetsScreen} from '../screens/ListeningPresetsScreen';
import {PresetDetailScreen} from '../screens/PresetDetailScreen';
import {ActivityScreen} from '../screens/ActivityScreen';
import {MixedPlaylistsScreen} from '../screens/MixedPlaylistsScreen';

// Types
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  AudioPlayer: {
    audioId: string;
    localPath?: string;
    /** Direct HTTP(S) playback (radio / podcast enclosures) — skips `/audio/files/{id}` */
    streamUrl?: string;
    streamTitle?: string;
    /** When `streamUrl` is provided, clarify whether it's radio or a podcast episode. */
    streamKind?: 'radio_station' | 'podcast_episode';
    podcastEpisodeId?: string;
    /** Optional initial seek, seconds. */
    startAtSec?: number;
  };
  RecentlyPlayed: undefined;
  Recommendations: undefined;
  Discovery: undefined;
  ArtistAlbum: {type: 'artist' | 'album'; name: string};
  PresetDetail: {presetId: string};
  /** Jobs, radio/podcast streams, clips & moments */
  Activity: {initialSegment?: 'jobs' | 'streams' | 'marks' | 'offline'};
  MixedPlaylists: undefined;
};

export type MainTabParamList = {
  Library: undefined;
  Repair: undefined;
  Identify: undefined;
  Charts: undefined;
  Recent: undefined;
  Discover: undefined;
  Recommendations: undefined;
  Sound: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();

function MainTabs() {
  const theme = useTheme();
  const {enabled: handsFree, toggle: toggleHandsFree} = useHandsFree();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerRight: () => (
          <View style={styles.headerRight}>
            <MaterialCommunityIcons
              name="gesture-tap"
              size={20}
              color={theme.colors.onSurface}
              style={styles.icon}
            />
            <Switch
              value={handsFree}
              onValueChange={toggleHandsFree}
              style={styles.switch}
            />
          </View>
        ),
      }}>
      <Tab.Screen
        name="Library"
        component={LocalMusicScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="library-music" color={color} size={size} />
          ),
          title: 'My Music',
        }}
      />
        <Tab.Screen
          name="Repair"
          component={AudioRepairUploadScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialCommunityIcons name="toolbox" color={color} size={size} />
            ),
            title: 'Repair Audio',
          }}
        />
        <Tab.Screen
          name="Identify"
          component={MusicIdentificationScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialCommunityIcons name="music-search" color={color} size={size} />
            ),
            title: 'Identify',
          }}
        />
        <Tab.Screen
          name="Charts"
          component={MusicChartsScreen}
          options={{
            tabBarIcon: ({color, size}) => (
              <MaterialCommunityIcons name="chart-line" color={color} size={size} />
            ),
            title: 'Charts',
          }}
        />
        <Tab.Screen
          name="Recent"
          component={RecentlyPlayedScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="clock-outline" color={color} size={size} />
          ),
          title: 'Recent',
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoveryScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="compass" color={color} size={size} />
          ),
          title: 'Discover',
        }}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="recommend" color={color} size={size} />
          ),
          title: 'For You',
        }}
      />
      <Tab.Screen
        name="Sound"
        component={ListeningPresetsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <MaterialCommunityIcons name="tune-vertical" color={color} size={size} />
          ),
          title: 'Sound',
        }}
      />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  const theme = useTheme();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export function AppNavigator() {
  const {user, isLoading} = useAuth();
  const theme = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: theme.colors.background}]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="AudioPlayer"
            component={AudioPlayerScreen}
            options={{headerShown: true, title: 'Now Playing'}}
          />
          <Stack.Screen
            name="RecentlyPlayed"
            component={RecentlyPlayedScreen}
            options={{headerShown: true, title: 'Recently Played'}}
          />
          <Stack.Screen
            name="Recommendations"
            component={RecommendationsScreen}
            options={{headerShown: true, title: 'Recommendations'}}
          />
          <Stack.Screen
            name="Discovery"
            component={DiscoveryScreen}
            options={{headerShown: true, title: 'Discover Music'}}
          />
          <Stack.Screen
            name="ArtistAlbum"
            component={ArtistAlbumScreen}
            options={({route}) => ({
              headerShown: true,
              title: route.params?.name || (route.params?.type === 'artist' ? 'Artist' : 'Album'),
            })}
          />
          <Stack.Screen
            name="PresetDetail"
            component={PresetDetailScreen}
            options={{headerShown: true, title: 'Listening preset'}}
          />
          <Stack.Screen
            name="Activity"
            component={ActivityScreen}
            options={{headerShown: true, title: 'Activity'}}
          />
          <Stack.Screen
            name="MixedPlaylists"
            component={MixedPlaylistsScreen}
            options={{headerShown: true, title: 'Playlists'}}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  switch: {
    margin: 0,
  },
});


import React, {useEffect, useRef} from 'react';
import {Linking} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer, type LinkingOptions} from '@react-navigation/native';
import {createNavigationContainerRef} from '@react-navigation/native';
import {AuthProvider} from './src/context/AuthContext';
import {HandsFreeProvider} from './src/context/HandsFreeContext';
import {PresetProvider} from './src/context/PresetContext';
import {PlayerProvider} from './src/context/PlayerContext';
import {ThemeAppProvider} from './src/context/ThemeAppContext';
import {AppNavigator} from './src/navigation/AppNavigator';
import {AppErrorBoundary} from './src/components/AppErrorBoundary';
import type {RootStackParamList} from './src/navigation/AppNavigator';
import {DEEP_LINK_PREFIX, parseDeepLink} from './src/services/deepLinkService';
import {apiService} from './src/services/api';
import {createLogger} from './src/utils/logger';
import {offlineManagerService} from './src/services/offlineManagerService';

const log = createLogger('App');
const navRef = createNavigationContainerRef<RootStackParamList>();

const App: React.FC = () => {
  const linking: LinkingOptions<RootStackParamList> = {
    prefixes: [DEEP_LINK_PREFIX],
    config: {
      screens: {
        AudioPlayer: {
          path: 'play/library/:audioId',
          parse: {
            audioId: String,
            startAtSec: (v: string) => Number(v),
          } as any,
        },
        Activity: {
          path: 'activity',
          parse: {
            initialSegment: (v: string) => v,
          } as any,
        },
      },
    },
    // We handle moment/clip deep links at runtime (need to fetch details).
  };

  const lastHandledUrlRef = useRef<string | null>(null);

  const handleDeepLinkUrl = async (url: string) => {
    if (!url) return;
    if (lastHandledUrlRef.current === url) return;
    lastHandledUrlRef.current = url;

    const parsed = parseDeepLink(url);
    if (!parsed) return;
    if (!navRef.isReady()) return;

    try {
      if (parsed.kind === 'library_audio') {
        navRef.navigate('AudioPlayer', {
          audioId: parsed.audioId,
          startAtSec: parsed.startAtSec,
        });
        return;
      }
      if (parsed.kind === 'moment') {
        const raw: any = await apiService.getMoment(parsed.momentId);
        const audioId = String(raw.audioFileId ?? raw.audio_file_id ?? '');
        const posMs = Number(raw.positionMs ?? raw.position_ms ?? 0);
        if (!audioId) return;
        navRef.navigate('AudioPlayer', {
          audioId,
          startAtSec: Math.max(0, posMs / 1000),
        });
        return;
      }
      if (parsed.kind === 'clip') {
        const raw: any = await apiService.getClip(parsed.clipId);
        const artifactId = raw.artifactAudioFileId ?? raw.artifact_audio_file_id;
        if (artifactId) {
          navRef.navigate('AudioPlayer', {audioId: String(artifactId), startAtSec: 0});
          return;
        }
        const audioId = String(raw.audioFileId ?? raw.audio_file_id ?? '');
        const startMs = Number(raw.startMs ?? raw.start_ms ?? 0);
        if (!audioId) return;
        navRef.navigate('AudioPlayer', {
          audioId,
          startAtSec: Math.max(0, startMs / 1000),
        });
        return;
      }
    } catch (e) {
      log.warn('deep link handle failed', {message: String(e), url});
    }
  };

  useEffect(() => {
    let sub: {remove: () => void} | null = null;
    (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          await handleDeepLinkUrl(initialUrl);
        }
      } catch (e) {
        log.warn('getInitialURL failed', {message: String(e)});
      }
    })();
    sub = Linking.addEventListener('url', ({url}) => {
      handleDeepLinkUrl(url);
    });
    return () => {
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    offlineManagerService.initialize().catch(e => {
      log.warn('offline manager init failed', {message: String(e)});
    });
  }, []);

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ThemeAppProvider>
          <AuthProvider>
            <PresetProvider>
              <PlayerProvider>
                <HandsFreeProvider>
                  <NavigationContainer ref={navRef} linking={linking} fallback={null}>
                    <AppNavigator />
                  </NavigationContainer>
                </HandsFreeProvider>
              </PlayerProvider>
            </PresetProvider>
          </AuthProvider>
        </ThemeAppProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
};

export default App;


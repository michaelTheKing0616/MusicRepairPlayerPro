import {ListeningPresetDefinition, PresetRouting} from './types';

/** Server-side FFmpeg render is required whenever routing is offline-only. */
export function requiresOfflineRender(routing: PresetRouting): boolean {
  return routing === 'offline';
}

/** In-app realtime preview chain (approximate EQ + dynamics map) applies for realtime + hybrid while playing. */
export function prefersRealtimePlayback(routing: PresetRouting): boolean {
  return routing === 'realtime' || routing === 'hybrid';
}

export function pickListeningRoute(plan: ListeningPresetDefinition, opts?: {preferFullChain?: boolean}): PresetRouting {
  if (opts?.preferFullChain) return 'offline';
  return requiresOfflineRender(plan.routing) ? 'offline' : plan.routing === 'offline' ? 'offline' : 'hybrid';
}

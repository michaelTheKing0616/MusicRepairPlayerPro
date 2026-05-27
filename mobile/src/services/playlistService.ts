import AsyncStorage from '@react-native-async-storage/async-storage';
import type {PlayableRef} from '../types';
import {createLogger} from '../utils/logger';

export interface Playlist {
  id: string;
  name: string;
  tracks: PlaylistTrack[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlaylistTrack {
  audioFileId: string;
  position: number;
  addedAt: Date;
}

const STORAGE_KEY = '@playlists';

// Phase 4: mixed-source playlists (new key + forward-compatible share schema)
const STORAGE_KEY_V2 = '@playlists_v2';

const log = createLogger('Playlists');

export type MixedPlaylistItem = {
  playable: PlayableRef;
  position: number;
  addedAt: Date;
};

export interface MixedPlaylist {
  id: string;
  name: string;
  items: MixedPlaylistItem[];
  createdAt: Date;
  updatedAt: Date;
}

export type PlaylistSharePayloadV1 = {
  schema: 'musicrepair.playlist_share.v1';
  exportedAtIso: string;
  playlist: {
    id: string;
    name: string;
    items: Array<{
      playable: PlayableRef;
      position: number;
      addedAtIso: string;
    }>;
  };
};

class PlaylistService {
  /**
   * Get all playlists
   */
  async getPlaylists(): Promise<Playlist[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const playlists = JSON.parse(stored);
        // Convert date strings back to Date objects
        return playlists.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          tracks: p.tracks.map((t: any) => ({
            ...t,
            addedAt: new Date(t.addedAt),
          })),
        }));
      }
      return [];
    } catch (error) {
      log.error('getPlaylists failed', {message: String(error)});
      return [];
    }
  }

  /**
   * Phase 4: get all mixed-source playlists
   */
  async getMixedPlaylists(): Promise<MixedPlaylist[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_V2);
      if (stored) {
        const playlists = JSON.parse(stored);
        return playlists.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt),
          items: (p.items ?? []).map((it: any) => ({
            ...it,
            addedAt: new Date(it.addedAt),
          })),
        }));
      }
      return [];
    } catch (e) {
      log.error('getMixedPlaylists failed', {message: String(e)});
      return [];
    }
  }

  async createMixedPlaylist(name: string): Promise<MixedPlaylist> {
    const playlists = await this.getMixedPlaylists();
    const newPlaylist: MixedPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playlists.push(newPlaylist);
    await this.saveMixedPlaylists(playlists);
    return newPlaylist;
  }

  async addItemToMixedPlaylist(playlistId: string, playable: PlayableRef): Promise<void> {
    const playlists = await this.getMixedPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;

    const exists = playlist.items.some(it => JSON.stringify(it.playable) === JSON.stringify(playable));
    if (exists) return;

    playlist.items.push({
      playable,
      position: playlist.items.length,
      addedAt: new Date(),
    });
    playlist.updatedAt = new Date();
    await this.saveMixedPlaylists(playlists);
  }

  async exportMixedPlaylist(playlistId: string): Promise<PlaylistSharePayloadV1 | null> {
    const playlists = await this.getMixedPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return null;
    return {
      schema: 'musicrepair.playlist_share.v1',
      exportedAtIso: new Date().toISOString(),
      playlist: {
        id: playlist.id,
        name: playlist.name,
        items: playlist.items.map(it => ({
          playable: it.playable,
          position: it.position,
          addedAtIso: it.addedAt.toISOString(),
        })),
      },
    };
  }

  async importMixedPlaylist(payload: PlaylistSharePayloadV1): Promise<MixedPlaylist> {
    const playlists = await this.getMixedPlaylists();
    const imported: MixedPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: payload.playlist.name,
      items: payload.playlist.items
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((it, idx) => ({
          playable: it.playable,
          position: idx,
          addedAt: new Date(it.addedAtIso),
        })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    playlists.push(imported);
    await this.saveMixedPlaylists(playlists);
    return imported;
  }

  /**
   * Get a specific playlist
   */
  async getPlaylist(id: string): Promise<Playlist | null> {
    const playlists = await this.getPlaylists();
    return playlists.find(p => p.id === id) || null;
  }

  /**
   * Create a new playlist
   */
  async createPlaylist(name: string): Promise<Playlist> {
    const playlists = await this.getPlaylists();
    const newPlaylist: Playlist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      tracks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    playlists.push(newPlaylist);
    await this.savePlaylists(playlists);
    return newPlaylist;
  }

  /**
   * Update playlist name
   */
  async updatePlaylist(id: string, name: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const index = playlists.findIndex(p => p.id === id);
    if (index !== -1) {
      playlists[index].name = name;
      playlists[index].updatedAt = new Date();
      await this.savePlaylists(playlists);
    }
  }

  /**
   * Delete a playlist
   */
  async deletePlaylist(id: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const filtered = playlists.filter(p => p.id !== id);
    await this.savePlaylists(filtered);
  }

  /**
   * Add track to playlist
   */
  async addTrackToPlaylist(playlistId: string, audioFileId: string): Promise<void> {
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      // Check if track already exists
      const exists = playlist.tracks.some(t => t.audioFileId === audioFileId);
      if (!exists) {
        playlist.tracks.push({
          audioFileId,
          position: playlist.tracks.length,
          addedAt: new Date(),
        });
        playlist.updatedAt = new Date();
        await this.savePlaylists(playlists);
      }
    }
  }

  /**
   * Remove track from playlist
   */
  async removeTrackFromPlaylist(
    playlistId: string,
    audioFileId: string,
  ): Promise<void> {
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.tracks = playlist.tracks.filter(t => t.audioFileId !== audioFileId);
      // Reorder positions
      playlist.tracks = playlist.tracks.map((t, index) => ({
        ...t,
        position: index,
      }));
      playlist.updatedAt = new Date();
      await this.savePlaylists(playlists);
    }
  }

  /**
   * Reorder tracks in playlist
   */
  async reorderPlaylistTracks(
    playlistId: string,
    tracks: PlaylistTrack[],
  ): Promise<void> {
    const playlists = await this.getPlaylists();
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist) {
      playlist.tracks = tracks.map((t, index) => ({
        ...t,
        position: index,
      }));
      playlist.updatedAt = new Date();
      await this.savePlaylists(playlists);
    }
  }

  /**
   * Save playlists to storage
   */
  private async savePlaylists(playlists: Playlist[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
    } catch (error) {
      log.error('savePlaylists failed', {message: String(error)});
      throw error;
    }
  }

  private async saveMixedPlaylists(playlists: MixedPlaylist[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY_V2, JSON.stringify(playlists));
  }
}

export const playlistService = new PlaylistService();


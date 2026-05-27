import {DEEP_LINK_PREFIX, buildClipLink, buildMomentLink, buildLibraryAudioLink} from './deepLinkService';

export type SharePayloadV1 =
  | {
      schema: 'musicrepair.share.v1';
      exportedAtIso: string;
      kind: 'moment';
      momentId: string;
      deepLink: string;
    }
  | {
      schema: 'musicrepair.share.v1';
      exportedAtIso: string;
      kind: 'clip';
      clipId: string;
      deepLink: string;
    }
  | {
      schema: 'musicrepair.share.v1';
      exportedAtIso: string;
      kind: 'library_audio';
      audioId: string;
      startAtSec?: number;
      deepLink: string;
    };

export function buildMomentSharePayloadV1(momentId: string): SharePayloadV1 {
  return {
    schema: 'musicrepair.share.v1',
    exportedAtIso: new Date().toISOString(),
    kind: 'moment',
    momentId,
    deepLink: buildMomentLink(momentId),
  };
}

export function buildClipSharePayloadV1(clipId: string): SharePayloadV1 {
  return {
    schema: 'musicrepair.share.v1',
    exportedAtIso: new Date().toISOString(),
    kind: 'clip',
    clipId,
    deepLink: buildClipLink(clipId),
  };
}

export function buildLibraryAudioSharePayloadV1(audioId: string, startAtSec?: number): SharePayloadV1 {
  return {
    schema: 'musicrepair.share.v1',
    exportedAtIso: new Date().toISOString(),
    kind: 'library_audio',
    audioId,
    startAtSec,
    deepLink: buildLibraryAudioLink(audioId, startAtSec),
  };
}


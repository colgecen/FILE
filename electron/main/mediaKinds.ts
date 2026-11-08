// Medya türleri ve yardımcılar (Electron main + renderer tarafından paylaşılır).
// Not: Renderer tarafı da aynı uzantı listesini kullanır; değiştirdiğinde ikisini de güncelle.

export type MediaKind = 'image' | 'video' | 'audio';

const IMAGE_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif', 'tif', 'tiff', 'svg',
]);
const VIDEO_EXT = new Set(['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv']);
const AUDIO_EXT = new Set(['mp3', 'wav', 'flac', 'ogg', 'oga', 'm4a', 'aac', 'opus', 'wma']);

export function extOf(path: string): string {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return '';
  return path.slice(dot + 1).toLowerCase();
}

export function mediaKindForPath(path: string): MediaKind | null {
  const ext = extOf(path);
  if (IMAGE_EXT.has(ext)) return 'image';
  if (VIDEO_EXT.has(ext)) return 'video';
  if (AUDIO_EXT.has(ext)) return 'audio';
  return null;
}

export const MEDIA_EXTENSIONS = [...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT];

export const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif',
  tif: 'image/tiff', tiff: 'image/tiff', svg: 'image/svg+xml',
  mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska', mov: 'video/quicktime',
  avi: 'video/x-msvideo', m4v: 'video/x-m4v', ogv: 'video/ogg',
  mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg',
  oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', opus: 'audio/opus', wma: 'audio/x-ms-wma',
};

export function mimeForPath(path: string): string {
  return MIME_BY_EXT[extOf(path)] ?? 'application/octet-stream';
}

// file-media:// şeması için tek bir yol kodlayıcı/çözücü.
export function encodeMediaPath(path: string): string {
  return encodeURIComponent(path);
}

export function decodeMediaPath(encoded: string): string | null {
  try {
    const decoded = decodeURIComponent(encoded);
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}
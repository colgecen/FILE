// Renderer-side media helpers (mirrors electron/main/mediaKinds.ts).

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

export function mediaUrlForPath(path: string): string {
  return `file-media://local/${encodeURIComponent(path)}`;
}

export const MEDIA_EXTENSIONS = [...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT];
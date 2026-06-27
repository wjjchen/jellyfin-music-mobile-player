// Formatting utilities

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(ticks?: number): string {
  if (!ticks) return '';
  const totalSeconds = Math.floor(ticks / 10000000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatBitrate(kbps?: number): string {
  if (!kbps) return '';
  return kbps >= 1000 ? `${Math.round(kbps / 1000)}M` : `${kbps}K`;
}

export function formatCount(n?: number): string {
  if (!n) return '0';
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toString();
}

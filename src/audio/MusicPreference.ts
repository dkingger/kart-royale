const KEY = 'kart-royale-music-enabled';
let enabled = true;
try { enabled = localStorage.getItem(KEY) !== 'false'; } catch { /* storage is optional */ }

export const isMusicEnabled = () => enabled;
export function setMusicEnabled(value: boolean) {
  enabled = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* keep the session preference */ }
}

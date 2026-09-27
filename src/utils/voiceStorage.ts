const VOICE_STORAGE_KEY = 'selectedVoice';

export type VoiceOption = 'metan' | 'tsumugi' | 'hau' | 'browser';

export function getSelectedVoice(): VoiceOption {
  if (typeof window === 'undefined') return 'metan';
  
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  if (stored === 'metan' || stored === 'tsumugi' || stored === 'hau' || stored === 'browser') {
    return stored;
  }
  
  return 'metan';
}

export function setSelectedVoice(voice: VoiceOption): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_STORAGE_KEY, voice);
}

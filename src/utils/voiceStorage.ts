const VOICE_STORAGE_KEY = 'selectedVoice';

export type VoiceOption = 'metan' | 'tsumugi' | 'sora' | 'browser';

export function getSelectedVoice(): VoiceOption {
  if (typeof window === 'undefined') return 'metan';
  
  const stored = localStorage.getItem(VOICE_STORAGE_KEY);
  
  // Migrate old 'hau' selection to 'sora'
  if (stored === 'hau') {
    localStorage.setItem(VOICE_STORAGE_KEY, 'sora');
    return 'sora';
  }
  
  if (stored === 'metan' || stored === 'tsumugi' || stored === 'sora' || stored === 'browser') {
    return stored;
  }
  
  return 'metan';
}

export function setSelectedVoice(voice: VoiceOption): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_STORAGE_KEY, voice);
}

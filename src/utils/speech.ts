import { getSelectedVoice } from './voiceStorage';

let japaneseVoice: SpeechSynthesisVoice | null = null;
let audioCache: Map<string, HTMLAudioElement> = new Map();

export function initSpeech(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    return;
  }

  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    japaneseVoice = voices.find(voice => voice.lang.startsWith('ja')) || null;
  };

  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function playPreGeneratedAudio(text: string, voiceId: string): boolean {
  if (typeof window === 'undefined') return false;

  const cacheKey = `${voiceId}-${text}`;
  let audio = audioCache.get(cacheKey);

  if (!audio) {
    audio = new Audio(`/audio/${voiceId}/${text}.mp3`);
    audioCache.set(cacheKey, audio);
  }

  audio.currentTime = 0;
  
  const playPromise = audio.play();
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.warn('預生成音頻播放失敗，回退到瀏覽器語音:', error);
      return false;
    });
  }

  return true;
}

function speakWithBrowser(text: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('語音合成不支援');
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ja-JP';
  utterance.rate = 0.8;

  if (japaneseVoice) {
    utterance.voice = japaneseVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function speakKana(text: string): void {
  const selectedVoice = getSelectedVoice();

  if (selectedVoice === 'browser') {
    speakWithBrowser(text);
    return;
  }

  const success = playPreGeneratedAudio(text, selectedVoice);
  if (!success) {
    speakWithBrowser(text);
  }
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && ('speechSynthesis' in window || getSelectedVoice() !== 'browser');
}

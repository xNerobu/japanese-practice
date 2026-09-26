let japaneseVoice: SpeechSynthesisVoice | null = null;

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

export function speakKana(text: string): void {
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

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

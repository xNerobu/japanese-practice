import { useState } from 'react';
import { VOICE_CHARACTERS } from '../data/voiceConfig';
import { getSelectedVoice, setSelectedVoice, type VoiceOption } from '../utils/voiceStorage';
import { speakKana } from '../utils/speech';
import { Volume2, Check } from 'lucide-react';

interface VoicePickerProps {
  onClose: () => void;
}

export function VoicePicker({ onClose }: VoicePickerProps) {
  const [selectedVoice, setSelectedVoiceState] = useState<VoiceOption>(getSelectedVoice());

  const handleVoiceSelect = (voice: VoiceOption) => {
    setSelectedVoiceState(voice);
    setSelectedVoice(voice);
  };

  const handlePreview = (voiceId: VoiceOption) => {
    if (voiceId === 'browser') {
      const prevVoice = getSelectedVoice();
      setSelectedVoice('browser');
      speakKana('あ');
      setTimeout(() => setSelectedVoice(prevVoice), 100);
    } else {
      const prevVoice = getSelectedVoice();
      setSelectedVoice(voiceId);
      speakKana('あ');
      setTimeout(() => setSelectedVoice(prevVoice), 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            聲音設定
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-700 dark:text-gray-300"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          選擇你喜歡的動畫風格語音角色
        </p>

        <div className="space-y-3">
          {VOICE_CHARACTERS.map((character) => (
            <div
              key={character.id}
              className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                selectedVoice === character.id
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
              }`}
              onClick={() => handleVoiceSelect(character.id as VoiceOption)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">
                      {character.name}
                    </h3>
                    {selectedVoice === character.id && (
                      <Check size={20} className="text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {character.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {character.credit}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(character.id as VoiceOption);
                  }}
                  className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors ml-2"
                >
                  <Volume2 size={20} />
                </button>
              </div>
            </div>
          ))}

          <div
            className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
              selectedVoice === 'browser'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
            }`}
            onClick={() => handleVoiceSelect('browser')}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-gray-800 dark:text-gray-200">
                    瀏覽器語音
                  </h3>
                  {selectedVoice === 'browser' && (
                    <Check size={20} className="text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  使用系統內建的語音合成
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview('browser');
                }}
                className="p-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors ml-2"
              >
                <Volume2 size={20} />
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition-colors"
        >
          完成
        </button>
      </div>
    </div>
  );
}

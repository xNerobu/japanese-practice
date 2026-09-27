#!/usr/bin/env python3
"""Generate audio for 九州そら (Kyushu Sora) - Speaker ID 16"""

import requests
import time
from pathlib import Path

VOICEVOX_URL = "http://127.0.0.1:50021"
SPEAKER_ID = 16  # 九州そら ノーマル

HIRAGANA = [
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'さ', 'し', 'す', 'せ', 'そ',
    'た', 'ち', 'つ', 'て', 'と',
    'な', 'に', 'ぬ', 'ね', 'の',
    'は', 'ひ', 'ふ', 'へ', 'ほ',
    'ま', 'み', 'む', 'め', 'も',
    'や', 'ゆ', 'よ',
    'ら', 'り', 'る', 'れ', 'ろ',
    'わ', 'を', 'ん',
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
    'きゃ', 'きゅ', 'きょ',
    'しゃ', 'しゅ', 'しょ',
    'ちゃ', 'ちゅ', 'ちょ',
    'にゃ', 'にゅ', 'にょ',
    'ひゃ', 'ひゅ', 'ひょ',
    'みゃ', 'みゅ', 'みょ',
    'りゃ', 'りゅ', 'りょ',
    'ぎゃ', 'ぎゅ', 'ぎょ',
    'じゃ', 'じゅ', 'じょ',
    'びゃ', 'びゅ', 'びょ',
    'ぴゃ', 'ぴゅ', 'ぴょ',
]

KATAKANA = [
    'ア', 'イ', 'ウ', 'エ', 'オ',
    'カ', 'キ', 'ク', 'ケ', 'コ',
    'サ', 'シ', 'ス', 'セ', 'ソ',
    'タ', 'チ', 'ツ', 'テ', 'ト',
    'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
    'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
    'マ', 'ミ', 'ム', 'メ', 'モ',
    'ヤ', 'ユ', 'ヨ',
    'ラ', 'リ', 'ル', 'レ', 'ロ',
    'ワ', 'ヲ', 'ン',
    'ガ', 'ギ', 'グ', 'ゲ', 'ゴ',
    'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ',
    'ダ', 'ヂ', 'ヅ', 'デ', 'ド',
    'バ', 'ビ', 'ブ', 'ベ', 'ボ',
    'パ', 'ピ', 'プ', 'ペ', 'ポ',
    'キャ', 'キュ', 'キョ',
    'シャ', 'シュ', 'ショ',
    'チャ', 'チュ', 'チョ',
    'ニャ', 'ニュ', 'ニョ',
    'ヒャ', 'ヒュ', 'ヒョ',
    'ミャ', 'ミュ', 'ミョ',
    'リャ', 'リュ', 'リョ',
    'ギャ', 'ギュ', 'ギョ',
    'ジャ', 'ジュ', 'ジョ',
    'ビャ', 'ビュ', 'ビョ',
    'ピャ', 'ピュ', 'ピョ',
]

def generate_audio(text, speaker_id, output_path):
    try:
        query_response = requests.post(
            f"{VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker_id},
            timeout=10
        )
        query_response.raise_for_status()
        query = query_response.json()
        
        synthesis_response = requests.post(
            f"{VOICEVOX_URL}/synthesis",
            params={"speaker": speaker_id},
            json=query,
            timeout=30
        )
        synthesis_response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(synthesis_response.content)
        
        return True
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")
        return False

def main():
    voice_path = Path("public/audio/sora")
    voice_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Generating audio for 九州そら (Speaker ID {SPEAKER_ID})...")
    
    all_kana = HIRAGANA + KATAKANA
    total_files = 0
    
    for i, char in enumerate(all_kana):
        output_file = voice_path / f"{char}.wav"
        
        if generate_audio(char, SPEAKER_ID, output_file):
            file_size = output_file.stat().st_size
            total_files += 1
            print(f"  [{i+1}/{len(all_kana)}] Generated: {char} ({file_size} bytes)")
        
        time.sleep(0.1)
    
    print(f"\n✓ Generated {total_files} audio files for 九州そら")

if __name__ == "__main__":
    main()

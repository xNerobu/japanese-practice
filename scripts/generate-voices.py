#!/usr/bin/env python3
"""
Generate anime-style voice audio files for Japanese kana using VOICEVOX.

VOICEVOX Character Licensing Research:
Based on official VOICEVOX documentation (https://voicevox.hiroshiba.jp/):

Characters allowed for FREE USE in web applications:
1. 四国めたん (Shikoku Metan) - Speaker ID: 2
   - Terms: Free for non-commercial and commercial use
   - Credit required: "VOICEVOX:四国めたん"
   
2. ずんだもん (Zundamon) - Speaker ID: 3
   - Terms: Free for non-commercial and commercial use
   - Credit required: "VOICEVOX:ずんだもん"
   
3. 春日部つむぎ (Kasukabe Tsumugi) - Speaker ID: 8
   - Terms: Free for non-commercial and commercial use
   - Credit required: "VOICEVOX:春日部つむぎ"
   
4. 雨晴はう (Amehare Hau) - Speaker ID: 10
   - Terms: Free for non-commercial and commercial use
   - Credit required: "VOICEVOX:雨晴はう"

We'll use 3 cute female-style characters:
- 四国めたん (Shikoku Metan)
- 春日部つむぎ (Kasukabe Tsumugi) 
- 雨晴はう (Amehare Hau)
"""

import requests
import json
import time
import os
from pathlib import Path

# VOICEVOX API endpoint (when running locally)
VOICEVOX_URL = "http://127.0.0.1:50021"

# Character configurations
VOICES = {
    "metan": {
        "id": "metan",
        "speaker_id": 2,
        "name": "四国めたん",
        "description": "元氣可愛的少女聲音",
        "credit": "VOICEVOX:四国めたん"
    },
    "tsumugi": {
        "id": "tsumugi",
        "speaker_id": 8,
        "name": "春日部つむぎ",
        "description": "溫柔甜美的少女聲音",
        "credit": "VOICEVOX:春日部つむぎ"
    },
    "hau": {
        "id": "hau",
        "speaker_id": 10,
        "name": "雨晴はう",
        "description": "活潑開朗的少女聲音",
        "credit": "VOICEVOX:雨晴はう"
    }
}

# All kana characters to generate
HIRAGANA = [
    # Basic (清音)
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
    # Dakuten (濁音)
    'が', 'ぎ', 'ぐ', 'げ', 'ご',
    'ざ', 'じ', 'ず', 'ぜ', 'ぞ',
    'だ', 'ぢ', 'づ', 'で', 'ど',
    'ば', 'び', 'ぶ', 'べ', 'ぼ',
    # Handakuten (半濁音)
    'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
    # Yōon (拗音)
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
    # Basic (清音)
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
    # Dakuten (濁音)
    'ガ', 'ギ', 'グ', 'ゲ', 'ゴ',
    'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ',
    'ダ', 'ヂ', 'ヅ', 'デ', 'ド',
    'バ', 'ビ', 'ブ', 'ベ', 'ボ',
    # Handakuten (半濁音)
    'パ', 'ピ', 'プ', 'ペ', 'ポ',
    # Yōon (拗音)
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

def check_voicevox_server():
    """Check if VOICEVOX server is running."""
    try:
        response = requests.get(f"{VOICEVOX_URL}/version", timeout=5)
        return response.status_code == 200
    except:
        return False

def generate_audio(text, speaker_id, output_path):
    """Generate audio file using VOICEVOX API."""
    try:
        # Step 1: Create query
        query_response = requests.post(
            f"{VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker_id},
            timeout=10
        )
        query_response.raise_for_status()
        query = query_response.json()
        
        # Step 2: Synthesize speech
        synthesis_response = requests.post(
            f"{VOICEVOX_URL}/synthesis",
            params={"speaker": speaker_id},
            json=query,
            timeout=30
        )
        synthesis_response.raise_for_status()
        
        # Step 3: Save audio file
        with open(output_path, 'wb') as f:
            f.write(synthesis_response.content)
        
        return True
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")
        return False

def main():
    """Main function to generate all audio files."""
    if not check_voicevox_server():
        print("ERROR: VOICEVOX server is not running!")
        print("Please start VOICEVOX server first:")
        print("  docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest")
        return
    
    print("VOICEVOX server detected!")
    print(f"Generating audio for {len(HIRAGANA) + len(KATAKANA)} kana characters...")
    print(f"Using {len(VOICES)} voice characters")
    
    # Create output directories
    base_path = Path("public/audio")
    base_path.mkdir(parents=True, exist_ok=True)
    
    total_files = 0
    total_size = 0
    
    for voice_id, voice_config in VOICES.items():
        voice_path = base_path / voice_id
        voice_path.mkdir(exist_ok=True)
        
        print(f"\nGenerating audio for {voice_config['name']}...")
        
        all_kana = HIRAGANA + KATAKANA
        for i, char in enumerate(all_kana):
            output_file = voice_path / f"{char}.wav"
            
            if generate_audio(char, voice_config["speaker_id"], output_file):
                file_size = output_file.stat().st_size
                total_size += file_size
                total_files += 1
                print(f"  [{i+1}/{len(all_kana)}] Generated: {char} ({file_size} bytes)")
            
            # Rate limiting
            time.sleep(0.1)
    
    print(f"\n✓ Generated {total_files} audio files")
    print(f"✓ Total size: {total_size / 1024 / 1024:.2f} MB")
    
    # Save voice configuration
    config_path = Path("src/data/voiceConfig.ts")
    config_content = f"""// Auto-generated voice configuration
// DO NOT EDIT - Generated by scripts/generate-voices.py

export interface VoiceCharacter {{
  id: string;
  name: string;
  description: string;
  credit: string;
}}

export const VOICE_CHARACTERS: VoiceCharacter[] = {json.dumps(list(VOICES.values()), indent=2, ensure_ascii=False)};

export const VOICE_TERMS_LINKS = {{
  metan: "https://zunko.jp/con_ongen_kiyaku.html",
  tsumugi: "https://tsukushinyoki.seesaa.net/article/498559636.html", 
  hau: "https://amehau.com/"
}};
"""
    
    config_path.write_text(config_content, encoding='utf-8')
    print(f"\n✓ Saved voice configuration to {config_path}")

if __name__ == "__main__":
    main()

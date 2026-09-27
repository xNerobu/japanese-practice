#!/usr/bin/env python3
"""
Consolidated script to generate high-quality VOICEVOX kana audio files.

Generates audio at 24kHz, mono, MP3 96kbps (libmp3lame high quality) 
with pre/post phoneme padding for all three voice characters:
- 四国めたん (Metan) - Speaker ID: 2
- 春日部つむぎ (Tsumugi) - Speaker ID: 8  
- 九州そら (Sora) - Speaker ID: 16

Audio Quality Settings:
- Sample Rate: 24000 Hz
- Channels: Mono
- Bitrate: 96 kbps
- Codec: libmp3lame (high quality)
- Format: MP3
- Phoneme Padding: Pre/post silence for smooth playback
"""

import requests
import json
import time
import os
import subprocess
from pathlib import Path

# VOICEVOX API endpoint
VOICEVOX_URL = "http://127.0.0.1:50021"

# Audio quality settings
SAMPLE_RATE = 24000  # 24kHz
MP3_BITRATE = "96k"  # 96 kbps
PHONEME_PRE_PADDING = 0.15  # 150ms pre-padding
PHONEME_POST_PADDING = 0.15  # 150ms post-padding

# Voice character configurations
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
    "sora": {
        "id": "sora",
        "speaker_id": 16,
        "name": "九州そら",
        "description": "開朗活潑的少女聲音",
        "credit": "VOICEVOX:九州そら"
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

def check_ffmpeg():
    """Check if ffmpeg is available."""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except:
        return False

def generate_audio(text, speaker_id, output_path):
    """Generate audio file using VOICEVOX API with enhanced quality settings."""
    try:
        # Step 1: Create audio query with phoneme padding
        query_response = requests.post(
            f"{VOICEVOX_URL}/audio_query",
            params={"text": text, "speaker": speaker_id},
            timeout=10
        )
        query_response.raise_for_status()
        query = query_response.json()
        
        # Add pre/post phoneme padding for smoother playback
        query["prePhonemeLength"] = PHONEME_PRE_PADDING
        query["postPhonemeLength"] = PHONEME_POST_PADDING
        
        # Set output sample rate to 24kHz
        query["outputSamplingRate"] = SAMPLE_RATE
        
        # Step 2: Synthesize speech
        synthesis_response = requests.post(
            f"{VOICEVOX_URL}/synthesis",
            params={"speaker": speaker_id},
            json=query,
            timeout=30
        )
        synthesis_response.raise_for_status()
        
        # Step 3: Save as temporary WAV file
        temp_wav = output_path.with_suffix('.wav.tmp')
        with open(temp_wav, 'wb') as f:
            f.write(synthesis_response.content)
        
        # Step 4: Convert to MP3 with ffmpeg (high quality, 96kbps, mono)
        subprocess.run([
            'ffmpeg',
            '-i', str(temp_wav),
            '-codec:a', 'libmp3lame',
            '-b:a', MP3_BITRATE,
            '-ac', '1',  # mono
            '-ar', str(SAMPLE_RATE),  # 24kHz
            '-q:a', '2',  # high quality (0-9, 2 is high quality)
            '-y',  # overwrite
            str(output_path)
        ], capture_output=True, check=True)
        
        # Clean up temporary WAV file
        temp_wav.unlink()
        
        return True
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")
        # Clean up temp file if it exists
        if temp_wav.exists():
            temp_wav.unlink()
        return False

def main():
    """Main function to generate all audio files."""
    if not check_voicevox_server():
        print("ERROR: VOICEVOX server is not running!")
        print("Please start VOICEVOX server first:")
        print("  docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-ubuntu20.04-latest")
        return 1
    
    if not check_ffmpeg():
        print("ERROR: ffmpeg is not installed!")
        print("Please install ffmpeg first:")
        print("  sudo apt-get install ffmpeg")
        return 1
    
    print("VOICEVOX server detected!")
    print(f"Generating high-quality audio for {len(HIRAGANA) + len(KATAKANA)} kana characters...")
    print(f"Audio settings: {SAMPLE_RATE}Hz, mono, MP3 {MP3_BITRATE}, libmp3lame high quality")
    print(f"Phoneme padding: {PHONEME_PRE_PADDING}s pre, {PHONEME_POST_PADDING}s post")
    print(f"Using {len(VOICES)} voice characters")
    
    # Create output directories
    base_path = Path("public/audio")
    base_path.mkdir(parents=True, exist_ok=True)
    
    total_files = 0
    total_size = 0
    
    for voice_id, voice_config in VOICES.items():
        voice_path = base_path / voice_id
        voice_path.mkdir(exist_ok=True)
        
        print(f"\nGenerating audio for {voice_config['name']} (Speaker ID {voice_config['speaker_id']})...")
        
        all_kana = HIRAGANA + KATAKANA
        for i, char in enumerate(all_kana):
            output_file = voice_path / f"{char}.mp3"
            
            if generate_audio(char, voice_config["speaker_id"], output_file):
                file_size = output_file.stat().st_size
                total_size += file_size
                total_files += 1
                print(f"  [{i+1}/{len(all_kana)}] Generated: {char} ({file_size} bytes)")
            else:
                print(f"  [{i+1}/{len(all_kana)}] Failed: {char}")
            
            # Rate limiting to avoid overwhelming the server
            time.sleep(0.1)
    
    print(f"\n✓ Generated {total_files} audio files")
    print(f"✓ Total size: {total_size / 1024 / 1024:.2f} MB")
    print(f"\nNote: voiceConfig.ts is NOT modified by this script.")
    print(f"Voice configuration should be manually managed in src/data/voiceConfig.ts")
    
    return 0

if __name__ == "__main__":
    exit(main())

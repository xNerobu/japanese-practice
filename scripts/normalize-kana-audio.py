#!/usr/bin/env python3
"""
Post-process existing kana audio files to apply consistent loudness normalization.

This script applies RMS-based loudness normalization to all existing kana MP3 files
to ensure consistent perceived loudness across all voices while preserving weak
consonant onsets (h/f/s/ts/k/p breath sounds).

Normalization approach:
- Measure current RMS level of each file
- Apply gain to reach target -20 dBFS RMS
- Apply peak limiter at -1 dBFS to prevent clipping
- Preserve phoneme padding and audio quality
"""

import subprocess
import re
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Audio quality settings
SAMPLE_RATE = 24000  # 24kHz
MP3_BITRATE = "96k"  # 96 kbps

# Loudness normalization settings
TARGET_RMS_DB = -20.0  # Target RMS level in dBFS
PEAK_LIMIT_DB = -1.0  # Peak limiter threshold in dBFS

def measure_rms(audio_file):
    """Measure RMS level of audio file in dBFS using ffmpeg volumedetect."""
    try:
        result = subprocess.run([
            'ffmpeg',
            '-i', str(audio_file),
            '-filter:a', 'volumedetect',
            '-f', 'null',
            '/dev/null'
        ], capture_output=True, text=True)
        
        # Parse mean_volume from stderr (ffmpeg outputs to stderr)
        output = result.stderr + result.stdout
        for line in output.split('\n'):
            if 'mean_volume:' in line:
                match = re.search(r'mean_volume:\s*([-\d.]+)\s*dB', line)
                if match:
                    return float(match.group(1))
        
        return None
    except Exception as e:
        print(f"Error measuring RMS for {audio_file}: {e}")
        return None

def normalize_audio_file(mp3_file):
    """Normalize a single audio file."""
    try:
        # Measure current RMS level
        current_rms = measure_rms(mp3_file)
        if current_rms is None:
            return {
                'file': str(mp3_file),
                'success': False,
                'error': 'Could not measure RMS'
            }
        
        # Calculate gain needed to reach target RMS
        gain_db = TARGET_RMS_DB - current_rms
        
        # Create temporary normalized file
        temp_file = mp3_file.with_suffix('.normalized.tmp.mp3')
        
        # Apply loudness normalization with peak limiting
        # Use volume filter for gain adjustment and alimiter for peak control
        # alimiter with gentle attack/release preserves weak onsets
        subprocess.run([
            'ffmpeg',
            '-i', str(mp3_file),
            '-filter:a', f'volume={gain_db}dB,alimiter=limit={PEAK_LIMIT_DB}dB:attack=1:release=50',
            '-codec:a', 'libmp3lame',
            '-b:a', MP3_BITRATE,
            '-ac', '1',
            '-ar', str(SAMPLE_RATE),
            '-q:a', '2',
            '-y',
            str(temp_file)
        ], capture_output=True, check=True)
        
        # Measure new RMS to verify
        new_rms = measure_rms(temp_file)
        
        # Replace original file with normalized version
        temp_file.replace(mp3_file)
        
        return {
            'file': str(mp3_file),
            'success': True,
            'original_rms': current_rms,
            'target_rms': TARGET_RMS_DB,
            'gain_applied': gain_db,
            'final_rms': new_rms
        }
        
    except Exception as e:
        # Clean up temp file if it exists
        temp_file = mp3_file.with_suffix('.normalized.tmp.mp3')
        if temp_file.exists():
            temp_file.unlink()
        
        return {
            'file': str(mp3_file),
            'success': False,
            'error': str(e)
        }

def main():
    """Main function to normalize all audio files."""
    print("=" * 70)
    print("Kana Audio Loudness Normalization")
    print("=" * 70)
    print(f"Target RMS level: {TARGET_RMS_DB} dBFS")
    print(f"Peak limiter: {PEAK_LIMIT_DB} dBFS")
    print()
    
    # Find all MP3 files
    audio_dir = Path("public/audio")
    if not audio_dir.exists():
        print(f"Error: Audio directory {audio_dir} does not exist!")
        return 1
    
    voices = ['metan', 'sora', 'tsumugi']
    all_files = []
    
    for voice in voices:
        voice_dir = audio_dir / voice
        if voice_dir.exists():
            mp3_files = sorted(voice_dir.glob("*.mp3"))
            all_files.extend(mp3_files)
            print(f"Found {len(mp3_files)} files for {voice}")
    
    if not all_files:
        print("No MP3 files found!")
        return 1
    
    print(f"\nTotal files to normalize: {len(all_files)}")
    print()
    
    # Process files with parallel execution for speed
    results = []
    successful = 0
    failed = 0
    
    print("Normalizing files...")
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(normalize_audio_file, f): f for f in all_files}
        
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            results.append(result)
            
            if result['success']:
                successful += 1
                gain = result['gain_applied']
                print(f"  [{i}/{len(all_files)}] ✓ {Path(result['file']).name:15s} "
                      f"RMS: {result['original_rms']:6.1f} → {result['final_rms']:6.1f} dB "
                      f"(gain: {gain:+5.1f} dB)")
            else:
                failed += 1
                print(f"  [{i}/{len(all_files)}] ✗ {Path(result['file']).name:15s} "
                      f"Error: {result.get('error', 'Unknown')}")
    
    print()
    print("=" * 70)
    print(f"Normalization complete!")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")
    print("=" * 70)
    
    # Save detailed results
    results_file = Path("loudness-normalization-results.json")
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nDetailed results saved to: {results_file}")
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    exit(main())

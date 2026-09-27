#!/usr/bin/env python3
"""
Measure loudness of all kana audio files and generate a report.
"""

import subprocess
import re
import json
from pathlib import Path
from collections import defaultdict

def measure_rms_and_peak(audio_file):
    """Measure RMS and peak level of audio file using ffmpeg volumedetect."""
    try:
        result = subprocess.run([
            'ffmpeg',
            '-i', str(audio_file),
            '-filter:a', 'volumedetect',
            '-f', 'null',
            '/dev/null'
        ], capture_output=True, text=True)
        
        output = result.stderr + result.stdout
        mean_volume = None
        max_volume = None
        
        for line in output.split('\n'):
            if 'mean_volume:' in line:
                match = re.search(r'mean_volume:\s*([-\d.]+)\s*dB', line)
                if match:
                    mean_volume = float(match.group(1))
            elif 'max_volume:' in line:
                match = re.search(r'max_volume:\s*([-\d.]+)\s*dB', line)
                if match:
                    max_volume = float(match.group(1))
        
        return mean_volume, max_volume
    except Exception as e:
        print(f"Error measuring {audio_file}: {e}")
        return None, None

def main():
    """Measure all audio files and generate report."""
    audio_dir = Path("public/audio")
    voices = ['metan', 'sora', 'tsumugi']
    
    measurements = defaultdict(list)
    
    print("Measuring loudness of all normalized audio files...")
    print()
    
    for voice in voices:
        voice_dir = audio_dir / voice
        if not voice_dir.exists():
            continue
        
        mp3_files = sorted(voice_dir.glob("*.mp3"))
        print(f"Measuring {voice} ({len(mp3_files)} files)...")
        
        for mp3_file in mp3_files:
            mean_vol, max_vol = measure_rms_and_peak(mp3_file)
            if mean_vol is not None:
                measurements[voice].append({
                    'file': mp3_file.name,
                    'mean_volume': mean_vol,
                    'max_volume': max_vol
                })
    
    print()
    print("=" * 80)
    print("LOUDNESS NORMALIZATION REPORT")
    print("=" * 80)
    print()
    
    # Calculate statistics per voice
    for voice in voices:
        if voice not in measurements:
            continue
        
        mean_volumes = [m['mean_volume'] for m in measurements[voice]]
        max_volumes = [m['max_volume'] for m in measurements[voice]]
        
        mean_volumes_sorted = sorted(mean_volumes)
        median_idx = len(mean_volumes_sorted) // 2
        median_mean = mean_volumes_sorted[median_idx]
        
        print(f"{voice.upper()}:")
        print(f"  Count: {len(mean_volumes)} files")
        print(f"  Mean volume (RMS):")
        print(f"    Median: {median_mean:.1f} dB")
        print(f"    Min:    {min(mean_volumes):.1f} dB")
        print(f"    Max:    {max(mean_volumes):.1f} dB")
        print(f"    Range:  {max(mean_volumes) - min(mean_volumes):.1f} dB")
        print(f"  Peak volume:")
        print(f"    Min:    {min(max_volumes):.1f} dB")
        print(f"    Max:    {max(max_volumes):.1f} dB")
        print()
    
    # Find outliers (files more than 2 dB away from -19.5)
    target = -19.5
    threshold = 2.0
    
    print("=" * 80)
    print("OUTLIERS (more than ±2 dB from -19.5 dB):")
    print("=" * 80)
    
    outliers_found = False
    for voice in voices:
        if voice not in measurements:
            continue
        
        voice_outliers = []
        for m in measurements[voice]:
            if abs(m['mean_volume'] - target) > threshold:
                voice_outliers.append(m)
        
        if voice_outliers:
            outliers_found = True
            print(f"\n{voice}:")
            for m in sorted(voice_outliers, key=lambda x: x['mean_volume']):
                print(f"  {m['file']:15s} {m['mean_volume']:6.1f} dB")
    
    if not outliers_found:
        print("\nNo significant outliers found! All files are within ±2 dB of target.")
    
    print()
    print("=" * 80)
    
    # Save detailed measurements
    output_file = Path("loudness-measurements-normalized.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dict(measurements), f, indent=2, ensure_ascii=False)
    
    print(f"\nDetailed measurements saved to: {output_file}")

if __name__ == "__main__":
    main()

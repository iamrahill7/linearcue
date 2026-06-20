#!/usr/bin/env python3
# LinearCue — Voice recorder + Whisper transcriber
# Records 5 seconds of audio then transcribes it

import subprocess
import os
import sys
import tempfile

AUDIO_PATH = "/tmp/linearcue_audio.wav"
TRANSCRIPT_PATH = "/tmp/linearcue_transcript.txt"

def record_audio(seconds=5):
    """Record audio from microphone using sox"""
    result = subprocess.run([
        "sox", "-d", "-r", "16000", "-c", "1", "-b", "16",
        AUDIO_PATH, "trim", "0", str(seconds)
    ], capture_output=True)
    return result.returncode == 0

def record_audio_afrecord(seconds=5):
    """Fallback: record using macOS built-in"""
    result = subprocess.run([
        "python3", "-c", f"""
import sounddevice as sd
import soundfile as sf
import numpy as np
audio = sd.rec(int({seconds} * 16000), samplerate=16000, channels=1, dtype="int16")
sd.wait()
sf.write("{AUDIO_PATH}", audio, 16000)
print("recorded")
"""
    ], capture_output=True, text=True)
    return result.returncode == 0

def transcribe():
    """Transcribe audio using Whisper"""
    result = subprocess.run([
        "whisper", AUDIO_PATH,
        "--model", "tiny",
        "--language", "en",
        "--output_format", "txt",
        "--output_dir", "/tmp",
        "--fp16", "False"
    ], capture_output=True, text=True)
    
    # whisper saves as /tmp/linearcue_audio.txt
    txt_path = "/tmp/linearcue_audio.txt"
    if os.path.exists(txt_path):
        with open(txt_path) as f:
            return f.read().strip()
    return ""

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "record"
    
    if mode == "transcribe":
        text = transcribe()
        print(text)
    else:
        # try sox first
        success = record_audio()
        if not success:
            # try sounddevice
            success = record_audio_afrecord()
        if success:
            print("recorded")
        else:
            print("error", file=sys.stderr)

if __name__ == "__main__":
    main()

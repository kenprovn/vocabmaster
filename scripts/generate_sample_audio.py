"""
Script tạo file MP3 phát âm mẫu cho frontend
Sử dụng Windows SAPI + ffmpeg để tạo file MP3 nội bộ chuẩn cho môi trường local/dev.
Đối với môi trường production, có thể thay thế bằng script gọi Google Cloud TTS / AWS Polly / Azure Speech.
"""

import os
import subprocess

WORDS = ["a", "about", "above"]
OUTPUT_DIR = os.path.join("public", "audio", "en-gb")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_word(word):
    wav_path = os.path.join(OUTPUT_DIR, f"{word}.wav")
    mp3_path = os.path.join(OUTPUT_DIR, f"{word}.mp3")
    
    ps_cmd = f"""
    Add-Type -AssemblyName System.Speech;
    $s = New-Object System.Speech.Synthesis.SpeechSynthesizer;
    $s.SetOutputToWaveFile('{wav_path}');
    $s.Speak('{word}');
    $s.Dispose();
    """
    
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], check=True)
    
    if os.path.exists(wav_path):
        subprocess.run([
            "ffmpeg", "-y", "-i", wav_path,
            "-codec:a", "libmp3lame", "-b:a", "64k",
            mp3_path
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        os.remove(wav_path)
        print(f"[OK] Generated: {mp3_path} ({os.path.getsize(mp3_path)} bytes)")

if __name__ == "__main__":
    print(f"Bắt đầu tạo {len(WORDS)} file MP3 mẫu trong {OUTPUT_DIR}...")
    for w in WORDS:
        generate_word(w)
    print("Hoàn tất!")


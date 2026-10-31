"""
Batch TTS Generator Script Template (Dành cho việc tạo trước 3.000 file MP3)
=============================================================================

MỤC ĐÍCH:
Tạo trước file MP3 phát âm chuẩn tiếng Anh bản ngữ (en-GB / en-US) lưu vào public/audio/
để tự phục vụ tĩnh trên cùng domain, triệt tiêu 100% lỗi Autoplay & TTS Engine trên Android.

LƯU Ý TRƯỚC KHI TẠO HÀNG LOẠT:
1. Chi phí:
   - Google Cloud TTS: 1 triệu ký tự miễn phí mỗi tháng (Standard), sau đó $4.00 / 1M ký tự.
     Kho 3.000 từ (~20.000 ký tự) hoàn toàn MIỄN PHÍ nằm trong hạn mức.
   - Azure Speech: 500.000 ký tự Neural miễn phí / tháng (F0 tier).
   - AWS Polly: 5 triệu ký tự miễn phí / tháng trong 12 tháng đầu.
2. Tốc độ & Rate Limit: Thêm độ trễ 100ms - 200ms giữa các request để tránh bị rate limit.
3. Định dạng: MP3, 24kHz hoặc 44.1kHz, 64kbps CBR (kích thước mỗi từ chỉ ~8KB - 12KB, tổng 3.000 từ chỉ ~30MB).
4. Điều khoản: File audio tạo ra lưu trữ và phục vụ dưới dạng static assets trên CDN/hosting (Vercel/Cloudflare).
"""

import os
import json
import time

# Đường dẫn dữ liệu từ vựng
WORDS_JSON = os.path.join("unit", "Oxford_3000_Vong_1_516_tu.json")
OUTPUT_DIR = os.path.join("public", "audio", "en-gb")

os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_with_google_cloud_tts_sample():
    """
    Mẫu code sử dụng thư viện chính thức google-cloud-texttospeech:
    pip install google-cloud-texttospeech
    Cần thiết lập: export GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
    """
    try:
        from google.cloud import texttospeech
        client = texttospeech.TextToSpeechClient()
        
        voice = texttospeech.VoiceSelectionParams(
            language_code="en-GB",
            name="en-GB-Neural2-B", # Giọng Anh-Anh chất lượng cao
            ssml_gender=texttospeech.SsmlVoiceGender.MALE
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=0.9
        )
        print("[Google Cloud TTS] Client đã sẵn sàng.")
        return client, voice, audio_config
    except ImportError:
        print("[Google Cloud TTS] Chưa cài đặt package `google-cloud-texttospeech`.")
        return None, None, None

def generate_local_sample():
    """
    Tạo thử 3 từ mẫu bằng script local:
    python scripts/generate_sample_audio.py
    """
    print("Để tạo thử 3 file mẫu ('a', 'about', 'above'), chạy:")
    print("  python scripts/generate_sample_audio.py")

if __name__ == "__main__":
    generate_local_sample()


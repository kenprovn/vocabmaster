#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/generate_oxford5000_sonia.py
====================================
Script sinh file MP3 phát âm cho danh sách từ vựng Oxford 5000 Extra (1.996 từ)
bằng Microsoft Edge TTS - Giọng Anh-Anh cao cấp: en-GB-SoniaNeural.

Đặc điểm an toàn:
1. Đường dẫn độc lập: Tính toán dựa theo vị trí file script, không phụ thuộc CWD terminal.
2. Không ghi đè: Bỏ qua toàn bộ các file MP3 hợp lệ (> 0 bytes) đã tồn tại.
3. Ghi tệp nguyên tử (Atomic Write): Tải về file tạm .tmp rồi mới đổi tên thành .mp3.
4. Giới hạn đồng thời (Concurrency Control): Dùng asyncio.Semaphore (3 - 5 luồng).
5. Cơ chế Retry & Backoff: Thử lại tối đa 3 lần khi gặp lỗi mạng tạm thời.
6. Hỗ trợ các cờ chạy:
   - --dry-run: Chỉ quét và thống kê số từ, không tải file nào.
   - --limit N: Chỉ tải tối đa N từ thiếu (dùng cho Giai đoạn B thử nghiệm).
   - Mặc định: Chạy toàn bộ các từ còn thiếu.
"""

import os
import sys
import re
import argparse
import asyncio
import edge_tts

# Cấu hình chuẩn cho dự án VocabMaster
VOICE = "en-GB-SoniaNeural"
CONCURRENCY_LIMIT = 4
SLEEP_BETWEEN_REQUESTS = 0.2
MAX_RETRIES = 3

# Xác định đường dẫn gốc dự án (D:\vocab)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
TXT_PATH = os.path.join(PROJECT_ROOT, "Oxford_2000_Extra.txt")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio", "en-gb")


def sanitize_filename(word: str) -> str:
    """Chuẩn hóa tên file theo đúng quy chuẩn VocabMaster"""
    clean = word.strip().lower()
    clean = re.sub(r'[\s/\\:]+', '_', clean)
    clean = re.sub(r'[^a-z0-9_-]', '', clean)
    return clean


def read_words_from_txt(path: str):
    """Đọc danh sách từ từ file TXT, làm sạch và bảo toàn thứ tự"""
    if not os.path.exists(path):
        raise FileNotFoundError(f"Không tìm thấy file nguồn tại: {path}")

    words = []
    seen = set()
    duplicates = []

    with open(path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f, start=1):
            cleaned = line.strip()
            if not cleaned:
                continue
            lower_word = cleaned.lower()
            if lower_word in seen:
                duplicates.append((idx, cleaned))
            else:
                seen.add(lower_word)
                words.append(cleaned)

    return words, duplicates


async def generate_single_audio(word: str, semaphore: asyncio.Semaphore, stats: dict, lock: asyncio.Lock, total_missing: int):
    """Tải và lưu một file MP3 có bảo vệ Atomic Write và Retry"""
    filename = f"{sanitize_filename(word)}.mp3"
    dest_path = os.path.join(OUTPUT_DIR, filename)
    temp_path = os.path.join(OUTPUT_DIR, f"{filename}.tmp")

    # Kiểm tra nếu file đích đã tồn tại hợp lệ
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        async with lock:
            stats["skipped"] += 1
            stats["processed"] += 1
        return True

    async with semaphore:
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                communicate = edge_tts.Communicate(word, voice=VOICE, rate="+0%")
                await communicate.save(temp_path)

                # Kiểm tra dung lượng file tạm
                if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
                    # Đổi tên nguyên tử từ .tmp sang .mp3
                    if os.path.exists(dest_path):
                        os.remove(dest_path)
                    os.rename(temp_path, dest_path)
                    file_size = os.path.getsize(dest_path)

                    async with lock:
                        stats["created"] += 1
                        stats["processed"] += 1
                        idx = stats["processed"]
                        c = stats["created"]
                        s = stats["skipped"]
                        f = stats["failed"]
                        if idx % 20 == 0 or idx == total_missing:
                            print(f"  Processed {idx:4d}/{total_missing} | Created: {c:4d} | Skipped: {s:3d} | Failed: {f:2d} | Latest: '{word}' ({file_size:,} B)")
                        elif idx <= 10:
                            print(f"  Processed {idx:4d}/{total_missing} | Created: {c:4d} | Skipped: {s:3d} | Failed: {f:2d} | '{word}' -> {filename}")

                    await asyncio.sleep(SLEEP_BETWEEN_REQUESTS)
                    return True
                else:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    raise ValueError("File tải về rỗng (0 bytes)")

            except Exception as e:
                # Xóa file tạm dở dang nếu có
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except OSError:
                        pass

                if attempt < MAX_RETRIES:
                    backoff = attempt * 1.5
                    await asyncio.sleep(backoff)
                else:
                    async with lock:
                        stats["failed"] += 1
                        stats["processed"] += 1
                        stats["errors"].append((word, str(e)))
                        idx = stats["processed"]
                        print(f"  [{idx:4d}/{total_missing}] ✗ THẤT BẠI '{word}' sau {MAX_RETRIES} lần thử: {e}")
                    return False

    return False


async def run_batch(words_to_generate: list):
    """Điều phối tải bất đồng bộ theo Semaphore"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)
    lock = asyncio.Lock()

    stats = {
        "processed": 0,
        "created": 0,
        "skipped": 0,
        "failed": 0,
        "errors": []
    }

    total = len(words_to_generate)
    tasks = [
        generate_single_audio(w, semaphore, stats, lock, total)
        for w in words_to_generate
    ]

    await asyncio.gather(*tasks)
    return stats


def main():
    parser = argparse.ArgumentParser(description="Sinh MP3 Oxford 5000 Extra bằng Edge TTS Sonia")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ thống kê, không sinh file")
    parser.add_argument("--limit", type=int, default=0, help="Giới hạn số từ mới cần sinh (0 = tất cả)")
    args = parser.parse_args()

    print("=" * 75)
    print("OXFORD 5000 EXTRA - TẠO FILE MP3 GIỌNG SONIA (EN-GB-SONIANEURAL)")
    print("=" * 75)
    print(f"Thư mục dự án : {PROJECT_ROOT}")
    print(f"File nguồn TXT : {TXT_PATH}")
    print(f"Thư mục đích   : {OUTPUT_DIR}")
    print(f"Giọng phát âm  : {VOICE}")
    print(f"Số luồng tối đa: {CONCURRENCY_LIMIT}")

    # 1. Đọc và kiểm tra file TXT
    words, duplicates = read_words_from_txt(TXT_PATH)
    total_txt = len(words)
    print(f"\n1. Đọc file TXT:")
    print(f"   - Tổng số từ duy nhất: {total_txt}")
    print(f"   - Số từ trùng lặp nội bộ: {len(duplicates)}")

    # 2. Quét các file MP3 hiện có
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    existing_files = set(os.listdir(OUTPUT_DIR))

    already_exists = []
    missing_words = []

    for w in words:
        fn = f"{sanitize_filename(w)}.mp3"
        fp = os.path.join(OUTPUT_DIR, fn)
        if fn in existing_files and os.path.getsize(fp) > 0:
            already_exists.append((w, fn, os.path.getsize(fp)))
        else:
            missing_words.append(w)

    print(f"\n2. Phân loại theo thư mục âm thanh hiện có:")
    print(f"   - Số từ ĐÃ CÓ MP3 hợp lệ (>0 bytes): {len(already_exists)} từ (SẼ BỎ QUA, KHÔNG GHI ĐÈ)")
    print(f"   - Số từ CHƯA CÓ MP3 cần tạo mới     : {len(missing_words)} từ")

    # 3. Xử lý theo cờ lệnh
    if args.dry_run:
        print("\n[DRY-RUN] Chế độ kiểm tra khô hoàn tất. Không có file nào được tạo.")
        return 0

    if args.limit > 0:
        target_words = missing_words[:args.limit]
        print(f"\n[TEST MODE] Chỉ sinh thử nghiệm {len(target_words)} từ đầu tiên trong danh sách thiếu...")
    else:
        target_words = missing_words
        print(f"\n[FULL RUN] Bắt đầu sinh {len(target_words)} file MP3 còn thiếu...")

    if not target_words:
        print("\n✓ Tất cả các từ đều đã có file MP3. Không có từ nào cần tạo thêm!")
        return 0

    # 4. Chạy bất đồng bộ
    import time
    start_time = time.time()
    stats = asyncio.run(run_batch(target_words))
    elapsed = time.time() - start_time

    print("\n" + "=" * 75)
    print("KẾT QUẢ THỰC HIỆN:")
    print(f"- Tổng số từ đã xử lý: {stats['processed']}/{len(target_words)}")
    print(f"- Tạo mới thành công : {stats['created']} files")
    print(f"- Đã bỏ qua          : {stats['skipped']} files")
    print(f"- Thất bại (Lỗi)     : {stats['failed']} files")
    print(f"- Thời gian thực hiện: {elapsed:.2f} giây")

    if stats["errors"]:
        print("\nDanh sách từ gặp lỗi:")
        for w, err in stats["errors"]:
            print(f"  - {w}: {err}")

    print("=" * 75)
    return 0 if stats["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

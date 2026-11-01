import asyncio
import edge_tts
import subprocess
import os

async def extract_precise(sentence, target_word, out_filename):
    c = edge_tts.Communicate(sentence, "en-GB-SoniaNeural", boundary="WordBoundary")
    audio_chunks = []
    target_offset = None
    target_duration = None

    async for chunk in c.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            w_text = chunk["text"].strip().lower()
            if target_word.lower() in w_text:
                target_offset = chunk["offset"]
                target_duration = chunk["duration"]

    raw_mp3 = f"temp_{os.path.basename(out_filename)}"
    with open(raw_mp3, "wb") as f:
        for b in audio_chunks:
            f.write(b)

    if target_offset is not None and target_duration is not None:
        start_sec = max(0.0, (target_offset / 10_000_000.0) - 0.04)
        dur_sec = (target_duration / 10_000_000.0) + 0.08
        cmd = [
            "ffmpeg", "-y", "-ss", f"{start_sec:.3f}", "-t", f"{dur_sec:.3f}",
            "-i", raw_mp3, "-c:a", "libmp3lame", "-q:a", "2", out_filename
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode == 0:
            print(f"Created {out_filename} ({os.path.getsize(out_filename)} bytes)")
        else:
            print(f"FFmpeg error on {out_filename}:", res.stderr)
    else:
        print(f"Target word boundary not found for {target_word} in '{sentence}'")

    if os.path.exists(raw_mp3):
        os.remove(raw_mp3)

async def main():
    out_dir = "public/audio/en-gb"

    # 1. content_adj.mp3 (Oxford 5000 Unit 34 id 3393)
    await extract_precise("They were content.", "content", os.path.join(out_dir, "content_adj.mp3"))
    # 2. minute_adj.mp3 (Oxford 5000 Unit 42 id 4165)
    await extract_precise("The details are minute.", "minute", os.path.join(out_dir, "minute_adj.mp3"))

    # 3. Advocate
    await extract_precise("She is a great advocate.", "advocate", os.path.join(out_dir, "advocate_n.mp3"))
    await extract_precise("We advocate peace.", "advocate", os.path.join(out_dir, "advocate_v.mp3"))

    # 4. Attribute
    await extract_precise("A key attribute of leadership.", "attribute", os.path.join(out_dir, "attribute_n.mp3"))
    await extract_precise("They attribute it to skill.", "attribute", os.path.join(out_dir, "attribute_v.mp3"))

    # 5. Coordinate
    await extract_precise("A spatial coordinate.", "coordinate", os.path.join(out_dir, "coordinate_n.mp3"))
    await extract_precise("Please coordinate the work.", "coordinate", os.path.join(out_dir, "coordinate_v.mp3"))

    # 6. Convict, extract, insult, bow
    await extract_precise("To convict the suspect.", "convict", os.path.join(out_dir, "convict_v.mp3"))
    await extract_precise("To extract the essence.", "extract", os.path.join(out_dir, "extract_v.mp3"))
    await extract_precise("Do not insult them.", "insult", os.path.join(out_dir, "insult_v.mp3"))
    await extract_precise("They bow to the queen.", "bow", os.path.join(out_dir, "bow_v.mp3"))

asyncio.run(main())

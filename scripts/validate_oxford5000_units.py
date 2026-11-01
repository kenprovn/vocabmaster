import json
import glob
import os
import re

EXTRA_TXT = "Oxford_2000_Extra.txt"

# 1. Read Oxford_2000_Extra.txt
with open(EXTRA_TXT, "r", encoding="utf-8") as f:
    txt_words = [line.strip() for line in f if line.strip()]

print(f"Total words in {EXTRA_TXT}: {len(txt_words)}")

# 2. Check all 20 JSON files
unit_files = []
for u in range(31, 51):
    fpath = os.path.join("unit", f"oxford_5000_unit_{u}.json")
    if os.path.exists(fpath):
        unit_files.append((u, fpath))
    else:
        print(f"MISSING FILE: {fpath}")

print(f"Total unit files found: {len(unit_files)} (expected 20)")

all_entries = []
expected_fields = ["id", "word", "phonetic", "type", "meaning", "example", "exampleMeaning", "unit", "level"]

unit_stats = []
id_errors = []
field_errors = []
empty_errors = []
word_order_mismatches = []
seen_ids = set()
duplicate_ids = []

current_index = 0

for u, fpath in unit_files:
    try:
        with open(fpath, "r", encoding="utf-8") as jf:
            data = json.load(jf)
    except Exception as e:
        print(f"Error reading JSON {fpath}: {e}")
        continue

    unit_stats.append((u, len(data)))

    for item in data:
        all_entries.append((u, item))

        # Check ID uniqueness
        item_id = item.get("id")
        if item_id in seen_ids:
            duplicate_ids.append((item_id, item.get("word"), u))
        seen_ids.add(item_id)

        # Check required fields
        for fld in expected_fields:
            if fld not in item:
                field_errors.append((u, item_id, item.get("word"), f"Missing field '{fld}'"))
            elif item[fld] is None or (isinstance(item[fld], str) and item[fld].strip() == ""):
                # check if phonetic or other is allowed empty, or if meaning/example is empty
                empty_errors.append((u, item_id, item.get("word"), f"Empty field '{fld}'"))

        # Check word matching text file
        if current_index < len(txt_words):
            expected_word = txt_words[current_index]
            actual_word = item.get("word", "").strip()
            if actual_word.lower() != expected_word.lower():
                word_order_mismatches.append((current_index + 1, item_id, actual_word, expected_word, u))
        else:
            word_order_mismatches.append((current_index + 1, item_id, item.get("word"), "NO_TXT_WORD", u))
        current_index += 1

print(f"\nTotal entries in 20 units: {len(all_entries)}")
print(f"Unit sizes: {unit_stats}")

# Check ID range 3001 to 4996
ids = [it[1].get("id") for it in all_entries]
int_ids = []
for item_id in ids:
    try:
        int_ids.append(int(item_id))
    except:
        id_errors.append(f"Non-integer ID: {item_id}")

if int_ids:
    print(f"ID range: min={min(int_ids)}, max={max(int_ids)}")
    expected_ids = list(range(3001, 3001 + len(all_entries)))
    if int_ids == expected_ids:
        print("✓ All IDs are strictly sequential from 3001 to 4996!")
    else:
        # find mismatches
        for i, (actual, exp) in enumerate(zip(int_ids, expected_ids)):
            if actual != exp:
                id_errors.append(f"Index {i}: actual {actual} != expected {exp}")
                if len(id_errors) > 10:
                    break

print(f"\nDuplicate IDs: {len(duplicate_ids)}")
if duplicate_ids:
    print("  Duplicates:", duplicate_ids[:5])

print(f"Missing field errors: {len(field_errors)}")
if field_errors:
    print("  Field errors:", field_errors[:5])

print(f"Empty field errors: {len(empty_errors)}")
if empty_errors:
    print("  Empty errors count by field:")
    empty_by_field = {}
    for err in empty_errors:
        fld = err[3]
        empty_by_field[fld] = empty_by_field.get(fld, 0) + 1
    print(empty_by_field)
    print("  Samples:", empty_errors[:5])

print(f"\nWord order mismatches with Oxford_2000_Extra.txt: {len(word_order_mismatches)}")
if word_order_mismatches:
    for m in word_order_mismatches[:10]:
        print(f"  Line {m[0]} (ID {m[1]} in Unit {m[4]}): JSON '{m[2]}' vs TXT '{m[3]}'")

# Unique words
unique_words = set(it[1].get("word", "").strip().lower() for it in all_entries)
print(f"Unique words in Oxford 5000 Extra: {len(unique_words)}")

# Overlap with Oxford 3000
oxford_files = glob.glob('unit/Oxford_3000_Vong_*.json')
ox3000_words = set()
for file in oxford_files:
    with open(file, 'r', encoding='utf-8') as f:
        data = json.load(f)
        for item in data:
            ox3000_words.add(item.get('word', '').strip().lower())

overlap = sorted(list(unique_words.intersection(ox3000_words)))
print(f"Overlap with Oxford 3000: {len(overlap)} words")
print("Overlapping words:", overlap)

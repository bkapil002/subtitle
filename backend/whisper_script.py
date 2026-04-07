import os
import sys
import whisper
import whisper.audio

# ✅ FFMPEG PATH
base_dir = os.path.dirname(os.path.abspath(__file__))

ffmpeg_path = os.path.join(base_dir, "..", "ffmpeg-8.1-full_build", "bin")

os.environ["PATH"] += os.pathsep + ffmpeg_path
whisper.audio.FFMPEG_BINARY = os.path.join(ffmpeg_path, "ffmpeg.exe")

# ✅ Input validation
if len(sys.argv) < 2:
    print("Usage: python whisper_script.py <video_path>", file=sys.stderr)
    sys.exit(1)

video_path = sys.argv[1]

if not os.path.exists(video_path):
    print(f"File not found: {video_path}", file=sys.stderr)
    sys.exit(1)

output_dir = "output"
os.makedirs(output_dir, exist_ok=True)

model = whisper.load_model("base")

result = model.transcribe(
    video_path,
    fp16=False,
    word_timestamps=True
)

segments = result["segments"]

if not segments:
    vtt_file = os.path.join(output_dir, os.path.basename(video_path) + ".vtt")
    with open(vtt_file, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
    print(vtt_file)
    sys.exit(0)

def format_time(seconds):
    hrs  = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hrs:02}:{mins:02}:{secs:06.3f}"

# ✅ Collect ALL words from ALL segments into one flat list
all_words = []
for seg in segments:
    for w in seg.get("words", []):
        word = w["word"].strip()
        if word:
            all_words.append({
                "word":  word,
                "start": w["start"],
                "end":   w["end"]
            })

if not all_words:
    vtt_file = os.path.join(output_dir, os.path.basename(video_path) + ".vtt")
    with open(vtt_file, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
    print(vtt_file)
    sys.exit(0)

# ✅ Phrase-based grouping settings
PAUSE_THRESHOLD    = 0.5   # gap >= this (seconds) = end of phrase → blank screen
MAX_WORDS_PER_CUE  = 8     # safety cap so one cue never runs too long
MIN_BLANK_DURATION = 0.1   # only write a blank cue if pause is at least this long

def build_phrases(words, pause_threshold, max_words):
    """
    Groups words into phrases by detecting pauses between them.
    A gap >= pause_threshold between two words starts a new phrase.
    Returns a list of word-groups: each group is a list of word dicts.
    """
    phrases  = []
    current  = [words[0]]

    for w in words[1:]:
        gap = w["start"] - current[-1]["end"]
        if gap >= pause_threshold or len(current) >= max_words:
            phrases.append(current)
            current = [w]
        else:
            current.append(w)

    if current:
        phrases.append(current)

    return phrases

phrases = build_phrases(all_words, PAUSE_THRESHOLD, MAX_WORDS_PER_CUE)

vtt_file = os.path.join(output_dir, os.path.basename(video_path) + ".vtt")

with open(vtt_file, "w", encoding="utf-8") as f:
    f.write("WEBVTT\n\n")

    for i, phrase in enumerate(phrases):
        start = phrase[0]["start"]
        end   = phrase[-1]["end"]
        text  = " ".join(w["word"] for w in phrase)

        if i + 1 < len(phrases):
            next_start = phrases[i + 1][0]["start"]
            gap        = next_start - end

            # ✅ Show phrase — displayed until the next phrase begins
            f.write(f"{format_time(start)} --> {format_time(next_start)}\n")
            f.write(f"{text}\n\n")

            # ✅ Blank cue — screen goes empty during the pause
            if gap >= MIN_BLANK_DURATION:
                f.write(f"{format_time(end)} --> {format_time(next_start)}\n")
                f.write(f"\n\n")
        else:
            # ✅ Last phrase — ends naturally at the last word
            f.write(f"{format_time(start)} --> {format_time(end)}\n")
            f.write(f"{text}\n\n")

print(vtt_file)
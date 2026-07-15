import os
import sys
import platform
import shutil
import whisper
import whisper.audio

# -----------------------------------------------------
# Configure FFmpeg for Windows and Linux
# -----------------------------------------------------

if platform.system() == "Windows":
    # Windows
    base_dir = os.path.dirname(os.path.abspath(__file__))

    ffmpeg_path = os.path.join(
        base_dir,
        "..",
        "ffmpeg-8.1-full_build",
        "bin"
    )

    os.environ["PATH"] += os.pathsep + ffmpeg_path

    whisper.audio.FFMPEG_BINARY = os.path.join(
        ffmpeg_path,
        "ffmpeg.exe"
    )

else:
    # Linux / Ubuntu

    ffmpeg = shutil.which("ffmpeg")

    if ffmpeg is None:
        print("ERROR: FFmpeg is not installed.", file=sys.stderr)
        sys.exit(1)

    whisper.audio.FFMPEG_BINARY = ffmpeg

# -----------------------------------------------------
# Validate command-line arguments
# -----------------------------------------------------

if len(sys.argv) < 2:
    print("Usage: python whisper_script.py <video_path>", file=sys.stderr)
    sys.exit(1)

video_path = sys.argv[1]

if not os.path.exists(video_path):
    print(f"File not found: {video_path}", file=sys.stderr)
    sys.exit(1)

# -----------------------------------------------------
# Output folder
# -----------------------------------------------------

output_dir = "output"
os.makedirs(output_dir, exist_ok=True)

# -----------------------------------------------------
# Load Whisper model
# -----------------------------------------------------

model = whisper.load_model("base")

# -----------------------------------------------------
# Transcribe video
# -----------------------------------------------------

try:
    result = model.transcribe(
        video_path,
        fp16=False,
        word_timestamps=True
    )

except Exception as e:
    print(f"Transcription failed: {e}", file=sys.stderr)
    sys.exit(1)

segments = result["segments"]
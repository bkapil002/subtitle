const express = require("express");
const multer  = require("multer");
const cors    = require("cors");
const fs      = require("fs");
const path    = require("path");
const { execFile } = require("child_process");

const app = express();
app.use(cors());

// ✅ Ensure output folder exists
const OUTPUT_DIR = path.join(__dirname, "output");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// ✅ Serve output files
app.use("/output", express.static(OUTPUT_DIR));

// ✅ Multer config
const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/mkv", "video/quicktime"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

// 🎥 Upload API
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }

  const videoPath = req.file.path;
  console.log("🎥 Uploaded:", videoPath);

  // ✅ Use python3 fallback
  const pythonCmd = process.platform === "win32" ? "python" : "python3";

  execFile(pythonCmd, ["whisper_script.py", videoPath], (error, stdout, stderr) => {

    // 🧹 Always delete uploaded file
    fs.unlink(videoPath, () => {});

    if (error) {
      console.error("❌ Python error:", stderr || error.message);
      return res.status(500).json({ error: "Subtitle generation failed" });
    }

    const vttPath = stdout.trim();

    if (!vttPath) {
      return res.status(500).json({ error: "No output file returned" });
    }

    const fullPath = path.join(__dirname, vttPath);

    // ✅ Check file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(500).json({ error: "Subtitle file not found" });
    }

    console.log("📄 VTT:", vttPath);

    res.json({
      message: "Subtitle generated",
      file: "/" + vttPath.replace(/\\/g, "/"),
    });
  });
});

// ✅ Multer error handling
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only video files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  console.error("❌ Server error:", err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
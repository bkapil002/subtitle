const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
app.use(cors());

const OUTPUT_DIR = path.join(__dirname, "output");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const deleteOldSubtitleFiles = (currentFilePath) => {
  const currentResolvedPath = path.resolve(currentFilePath);

  for (const fileName of fs.readdirSync(OUTPUT_DIR)) {
    if (path.extname(fileName).toLowerCase() !== ".vtt") {
      continue;
    }

    const filePath = path.resolve(OUTPUT_DIR, fileName);
    if (filePath !== currentResolvedPath) {
      fs.unlink(filePath, (err) => {
        if (err) {
          console.error("Failed to delete old subtitle:", err.message);
        }
      });
    }
  }
};

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    node: process.version,
    platform: process.platform,
  });
});

app.use("/output", express.static(OUTPUT_DIR));

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

app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No video file uploaded" });
  }

  const videoPath = req.file.path;
  console.log("Uploaded:", videoPath);

  const pythonCmd =
    process.platform === "win32"
      ? "python"
      : path.join(__dirname, "venv", "bin", "python");

  execFile(
    pythonCmd,
    [path.join(__dirname, "whisper_script.py"), videoPath],
    (error, stdout, stderr) => {
      fs.unlink(videoPath, () => { });

      if (error) {
        console.error("Python error:", stderr || error.message);
        return res.status(500).json({ error: "Subtitle generation failed" });
      }

      const vttPath = stdout.trim();

      if (!vttPath) {
        return res.status(500).json({ error: "No output file returned" });
      }

      const fullPath = path.join(__dirname, vttPath);

      if (!fs.existsSync(fullPath)) {
        return res.status(500).json({ error: "Subtitle file not found" });
      }

      deleteOldSubtitleFiles(fullPath);

      console.log("VTT:", vttPath);

      res.json({
        message: "Subtitle generated",
        file: "/" + vttPath.replace(/\\/g, "/"),
      });
    });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === "Only video files are allowed") {
    return res.status(400).json({ error: err.message });
  }
  console.error("Server error:", err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

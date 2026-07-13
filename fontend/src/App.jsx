import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileVideo,
  Check,
  X,
  Download,
  RefreshCcw,
  AlertTriangle,
  Captions,
  Loader2,
  PlayCircle,
} from "lucide-react";

const PROCESSING_MESSAGES = [
  "Analyzing speech...",
  "Detecting language...",
  "Separating speakers...",
  "Generating subtitles...",
  "Optimizing timestamps...",
  "Almost done...",
];

export default function App() {
  const [video, setVideo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(0);
  const [vttUrl, setVttUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef();

  // --- UI-only additions below. They do not touch upload/download logic,
  //     axios calls, or any existing state management. ---
  const [msgIndex, setMsgIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (status !== "processing") return;
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % PROCESSING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (status !== "done") setShowPreview(false);
  }, [status]);

  const pickFile = (file) => {
    if (!file || !file.type.startsWith("video/")) {
      return alert("Please select a video file.");
    }
    setVideo(file);
    setFileName(file.name);
    setVttUrl("");
    setVideoPreview("");
    setStatus("idle");
    setProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!video) return;
    setStatus("uploading");
    setProgress(0);
    setVttUrl("");
    setVideoPreview("");

    const formData = new FormData();
    formData.append("video", video);

    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 50);
          setProgress(pct);
          if (pct === 50) setStatus("processing");
        },
      });

      let fake = 50;
      const timer = setInterval(() => {
        fake += Math.random() * 4;
        if (fake >= 99) { fake = 99; clearInterval(timer); }
        setProgress(Math.round(fake));
      }, 600);

      const fullUrl = `http://localhost:5000${res.data.file}`;
      clearInterval(timer);
      setProgress(100);
      setVttUrl(fullUrl);
      setVideoPreview(URL.createObjectURL(video));
      setStatus("done");

    } catch (err) {
      console.error(err);
      setStatus("error");
      setProgress(0);
    }
  };

  const reset = () => {
    setVideo(null);
    setFileName("");
    setVttUrl("");
    setVideoPreview("");
    setStatus("idle");
    setProgress(0);
  };

  const statusLabel = {
    idle: "",
    uploading: "Uploading video...",
    processing: "Transcribing audio...",
    done: "Subtitles ready",
    error: "Something went wrong",
  }[status];

  const isWorking = status === "uploading" || status === "processing";

  // Derived, display-only step index — does not read/write any core state.
  const stepIndex =
    status === "uploading" ? 0 :
    status === "processing" ? (progress < 70 ? 1 : progress < 90 ? 2 : 3) :
    status === "done" ? 4 : -1;

  const steps = ["Uploading video", "Speech recognition", "Subtitle optimization", "Exporting VTT"];

  return (
    <div className="relative min-h-screen bg-[#05040a] text-white overflow-hidden flex items-center justify-center p-6 selection:bg-indigo-500/40">
      <style>{`
        @keyframes aurora-drift {
          0%   { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
          50%  { transform: translate(10%, 5%) rotate(15deg) scale(1.15); }
          100% { transform: translate(-10%, -10%) rotate(0deg) scale(1); }
        }
        @keyframes aurora-drift-rev {
          0%   { transform: translate(10%, 10%) rotate(0deg) scale(1.1); }
          50%  { transform: translate(-8%, -6%) rotate(-12deg) scale(1); }
          100% { transform: translate(10%, 10%) rotate(0deg) scale(1.1); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-18px); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0,0); }
          10% { transform: translate(-2%,-4%); }
          30% { transform: translate(3%,2%); }
          50% { transform: translate(-3%,4%); }
          70% { transform: translate(2%,-2%); }
          90% { transform: translate(-1%,3%); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>

      {/* Cinematic animated background */}
      <div
        className="pointer-events-none absolute -top-1/3 -left-1/4 w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(99,102,241,0.55), transparent 60%)",
          animation: "aurora-drift 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-1/3 -right-1/4 w-[65vw] h-[65vw] rounded-full blur-[120px] opacity-40"
        style={{
          background: "radial-gradient(circle, rgba(168,85,247,0.5), transparent 60%)",
          animation: "aurora-drift-rev 26s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-1/4 w-[35vw] h-[35vw] rounded-full blur-[100px] opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.45), transparent 65%)",
          animation: "float-slow 9s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          animation: "grain 1.2s steps(2) infinite",
        }}
      />

      {/* Main glass card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-indigo-500/40 via-purple-500/20 to-cyan-400/40 blur-sm" />
        <div className="relative rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl shadow-[0_8px_60px_-12px_rgba(99,102,241,0.35)] p-8 sm:p-10 space-y-8">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Captions className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">Subtitle Generator</h1>
                <p className="text-sm text-white/50">Generate professional subtitles in seconds.</p>
              </div>
            </div>

            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/60 shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Online
            </span>
          </div>

          {/* Dropzone / file card */}
          <div
            onClick={() => !isWorking && fileInputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`
              group relative flex flex-col items-center justify-center gap-3
              rounded-2xl p-10 cursor-pointer transition-all duration-300 border
              ${dragOver ? "border-indigo-400/70" : video ? "border-emerald-400/40" : "border-white/10 hover:border-white/25"}
              ${video ? "bg-emerald-400/[0.04]" : "bg-white/[0.02] hover:bg-white/[0.04]"}
              ${isWorking ? "pointer-events-none opacity-60" : ""}
            `}
            style={{
              backgroundImage: !video
                ? `repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,${dragOver ? 0.08 : 0.04}) 8px, rgba(255,255,255,${dragOver ? 0.08 : 0.04}) 9px)`
                : undefined,
            }}
          >
            <AnimatePresence mode="wait">
              {video ? (
                <motion.div
                  key="file"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3 w-full"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                    <FileVideo className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white truncate max-w-xs">{fileName}</p>
                    <p className="text-xs text-white/40 mt-0.5">{(video.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {!isWorking && status !== "done" && (
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/25 transition-colors"
                      >
                        Change file
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-rose-300 hover:border-rose-400/30 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-indigo-400/40 transition-colors">
                    <UploadCloud
                      className="w-7 h-7 text-white/40 group-hover:text-indigo-300 transition-colors"
                      style={{ animation: "float-slow 3.5s ease-in-out infinite" }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-white/80">Drop your video here</p>
                    <p className="text-xs text-white/40 mt-1">or click to browse</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                    {["MP4", "MOV", "WebM", "MKV"].map((f) => (
                      <span key={f} className="text-[10px] font-medium px-2 py-1 rounded-md bg-white/5 border border-white/10 text-white/40">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-white/25">Max file size 500MB</p>
                </motion.div>
              )}
            </AnimatePresence>

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files[0])}
            />
          </div>

          {/* Progress + step indicator */}
          <AnimatePresence>
            {isWorking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm text-white/60 flex items-center gap-2">
                    {status === "processing" && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-300" />}
                    {status === "processing" ? PROCESSING_MESSAGES[msgIndex] : statusLabel}
                  </span>
                  <span className="text-sm font-semibold text-white">{progress}%</span>
                </div>

                <div className="relative w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 relative overflow-hidden"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <div className="absolute inset-y-0 w-1/3 bg-white/40 blur-sm" style={{ animation: "shimmer 1.6s linear infinite" }} />
                  </motion.div>
                </div>

                <div className="flex justify-between">
                  {steps.map((s, i) => (
                    <div key={s} className="flex flex-col items-center gap-1.5 flex-1">
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-indigo-400" : "bg-white/15"}`} />
                      <span className={`text-[10px] text-center transition-colors ${i <= stepIndex ? "text-white/60" : "text-white/25"}`}>{s}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3.5"
              >
                <AlertTriangle className="w-4 h-4 text-rose-300 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-rose-200 font-medium">Something went wrong</p>
                  <p className="text-xs text-rose-200/60 mt-0.5">Check that the server is running, then try again.</p>
                </div>
                <button
                  onClick={handleUpload}
                  className="text-xs px-3 py-1.5 rounded-lg border border-rose-400/30 text-rose-200 hover:bg-rose-400/10 transition-colors flex items-center gap-1 shrink-0"
                >
                  <RefreshCcw className="w-3 h-3" /> Retry
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: video && !isWorking && status !== "done" ? 1.015 : 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpload}
              disabled={!video || isWorking || status === "done"}
              className="relative flex-1 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white transition-all
                bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25
                disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05040a]"
            >
              <span className="flex items-center justify-center gap-2">
                {isWorking && <Loader2 className="w-4 h-4 animate-spin" />}
                {isWorking ? `Processing… ${progress}%` : status === "done" ? "Subtitles ready" : "Generate subtitles"}
              </span>
            </motion.button>

            {(video || status !== "idle") && (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={reset}
                disabled={isWorking}
                className="px-4 py-3.5 text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/25
                  rounded-2xl transition-colors disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                Reset
              </motion.button>
            )}
          </div>

          {/* Success */}
          <AnimatePresence>
            {status === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
                      className="w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center shrink-0"
                    >
                      <Check className="w-4 h-4 text-emerald-300" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-emerald-100">Subtitle file ready</p>
                      <p className="text-xs text-emerald-200/50 truncate">{fileName.replace(/\.[^/.]+$/, "")}.vtt</p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={async () => {
                      const res = await fetch(vttUrl);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(new Blob([blob], { type: "text/vtt" }));
                      const a = document.createElement("a");
                      a.href = url;
                      const baseName = fileName.replace(/\.[^/.]+$/, "");
                      a.download = baseName + ".vtt";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950
                      text-sm font-semibold rounded-xl px-3.5 py-2.5 transition-colors shrink-0
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                  >
                    <Download className="w-4 h-4" />
                    Download .vtt
                  </motion.button>
                </div>

                {videoPreview && (
                  <button
                    onClick={() => setShowPreview((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    {showPreview ? "Hide preview" : "Preview subtitles"}
                  </button>
                )}

                <AnimatePresence>
                  {showPreview && videoPreview && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-2xl border border-white/10"
                    >
                      <video controls className="w-full block">
                        <source src={videoPreview} />
                        <track kind="subtitles" src={vttUrl} default />
                      </video>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
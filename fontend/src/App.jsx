import React, { useState, useRef } from "react";
import axios from "axios";

export default function App() {
  const [video, setVideo] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | uploading | processing | done | error
  const [progress, setProgress] = useState(0);
  const [vttUrl, setVttUrl] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef();

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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 p-8 space-y-6">

        <div>
          <h1 className="text-xl font-semibold text-gray-900">Video subtitle generator</h1>
          <p className="text-sm text-gray-500 mt-1">Upload a video and get a .vtt subtitle file</p>
        </div>

        <div
          onClick={() => !isWorking && fileInputRef.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center gap-2
            border-2 border-dashed rounded-xl p-10 cursor-pointer transition-colors
            ${dragOver
              ? "border-indigo-400 bg-indigo-50"
              : video
                ? "border-green-400 bg-green-50"
                : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
            }
            ${isWorking ? "pointer-events-none opacity-60" : ""}
          `}
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center
            ${video ? "bg-green-100" : "bg-gray-100"}`}>
            {video ? (
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            )}
          </div>

          {video ? (
            <>
              <p className="text-sm font-medium text-gray-800 text-center truncate max-w-xs">{fileName}</p>
              <p className="text-xs text-gray-400">{(video.size / 1024 / 1024).toFixed(1)} MB</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Drop your video here</p>
              <p className="text-xs text-gray-400">or click to browse — MP4, MOV, WebM, MKV</p>
            </>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files[0])}
          />
        </div>

        {isWorking && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">{statusLabel}</span>
              <span className="text-sm font-medium text-gray-800">{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Error generating subtitles. Check that the server is running.
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={!video || isWorking || status === "done"}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed
              text-white text-sm font-medium rounded-xl px-4 py-3 transition-colors"
          >
            {isWorking ? `Processing… ${progress}%` : "Generate subtitles"}
          </button>

          {(video || status !== "idle") && (
            <button
              onClick={reset}
              disabled={isWorking}
              className="px-4 py-3 text-sm text-gray-500 hover:text-gray-700 border border-gray-200
                hover:border-gray-300 rounded-xl transition-colors disabled:opacity-40"
            >
              Reset
            </button>
          )}
        </div>

        {status === "done" && (
          <div className="space-y-4">

            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800">Subtitle file ready</p>
                  <p className="text-xs text-green-600">{fileName}.vtt</p>
                </div>
              </div>

              {/* ✅ FIXED HERE */}
             <button
  onClick={async () => {
    const res = await fetch(vttUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(new Blob([blob], { type: "text/vtt" }));
    const a = document.createElement("a");
    a.href = url;
    // Strip original extension, add .vtt
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    a.download = baseName + ".vtt";
    a.click();
    URL.revokeObjectURL(url);
  }}
  className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white
    text-sm font-medium rounded-lg px-3 py-2 transition-colors"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/>
  </svg>
  Download .vtt
</button>
            </div>



          </div>
        )}

      </div>
    </div>
  );
}
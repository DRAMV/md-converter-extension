// utils/converter.js — shared helpers (no ES module exports, globally assigned)

const SUPPORTED_TYPES = {
  image: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  pdf:   ["application/pdf"],
  text:  ["text/plain", "text/html", "text/csv", "text/markdown"],
  audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
          "video/mp4", "video/webm"]
};

function detectFileType(file) {
  const mime = file.type.toLowerCase();
  for (const [category, mimes] of Object.entries(SUPPORTED_TYPES)) {
    if (mimes.includes(mime)) return category;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  const extMap = {
    pdf:  "pdf",
    png:  "image", jpg: "image", jpeg: "image", webp: "image", gif: "image",
    txt:  "text",  md:  "text",  csv:  "text",  html: "text",
    mp3:  "audio", wav: "audio", ogg:  "audio", m4a:  "audio",
    mp4:  "audio", webm: "audio"
  };
  return extMap[ext] || "unsupported";
}

function generateFilename(input) {
  if (!input) {
    const date = new Date().toISOString().slice(0, 10);
    return `converted-${date}.md`;
  }
  return input
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60) + ".md";
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function stripHTML(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script, style, noscript").forEach(el => el.remove());
  return tmp.innerText || tmp.textContent || "";
}

function truncateToTokenLimit(text, maxTokens = 80000) {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[Content truncated due to length]";
}

function formatFileSize(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function validateFileSize(file, maxMB = 20) {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large (${formatFileSize(file.size)}). Max size is ${maxMB}MB.`;
  }
  return null;
}

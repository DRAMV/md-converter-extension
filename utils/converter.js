// utils/converter.js — shared helpers

const SUPPORTED_TYPES = {
  image:  ["image/png", "image/jpeg", "image/webp", "image/gif", "image/tiff", "image/bmp"],
  pdf:    ["application/pdf"],
  text:   ["text/plain", "text/html", "text/csv", "text/markdown"],
  audio:  ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "video/mp4", "video/webm"],
  docx:   ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx:   [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
  ],
  pptx:   ["application/vnd.openxmlformats-officedocument.presentationml.presentation"]
};

function detectFileType(file) {
  const mime = file.type.toLowerCase();
  for (const [category, mimes] of Object.entries(SUPPORTED_TYPES)) {
    if (mimes.includes(mime)) return category;
  }
  const ext = file.name.split(".").pop().toLowerCase();
  const extMap = {
    pdf:  "pdf",
    png:  "image", jpg:  "image", jpeg: "image", webp: "image",
    gif:  "image", tiff: "image", bmp:  "image",
    txt:  "text",  md:   "text",  csv:  "text",  html: "text",
    mp3:  "audio", wav:  "audio", ogg:  "audio", m4a:  "audio",
    mp4:  "audio", webm: "audio",
    docx: "docx",
    xlsx: "xlsx",  xls:  "xlsx",
    pptx: "pptx"
  };
  return extMap[ext] || "unsupported";
}

// ── Image subtype detection ───────────────────────────────────────────────────
// Analyses image dimensions + basic heuristics to pick the best Gemini prompt

function detectImageSubtype(dataUrl, filename) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function () {
      const w          = img.naturalWidth;
      const h          = img.naturalHeight;
      const ratio      = w / h;
      const name       = (filename || "").toLowerCase();
      const isWide     = ratio > 2.5;
      const isTall     = ratio < 0.5;
      const isSquarish = ratio >= 0.8 && ratio <= 1.25;

      // Heuristics based on filename hints
      if (name.includes("scan") || name.includes("scanned") || name.includes("ocr")) {
        return resolve("scanned_document");
      }
      if (name.includes("handwrit") || name.includes("note") || name.includes("hand")) {
        return resolve("handwriting");
      }
      if (name.includes("chart") || name.includes("graph") || name.includes("plot")) {
        return resolve("chart");
      }
      if (name.includes("diagram") || name.includes("flow") || name.includes("arch")) {
        return resolve("diagram");
      }
      if (name.includes("table") || name.includes("sheet") || name.includes("data")) {
        return resolve("table");
      }
      if (name.includes("slide") || name.includes("ppt") || name.includes("present")) {
        return resolve("slide");
      }
      if (name.includes("receipt") || name.includes("invoice") || name.includes("bill")) {
        return resolve("receipt");
      }
      if (name.includes("code") || name.includes("screen") || name.includes("screenshot")) {
        return resolve("screenshot");
      }

      // Heuristics based on dimensions
      if (isWide && h < 300)  return resolve("banner");
      if (isTall)             return resolve("document_page");
      if (w > 1200 && isWide) return resolve("screenshot");
      if (isSquarish && w > 600) return resolve("photo");

      // Default
      resolve("screenshot");
    };
    img.onerror = () => resolve("screenshot");
    img.src = dataUrl;
  });
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

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader   = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
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
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function validateFileSize(file, maxMB = 20) {
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File too large (${formatFileSize(file.size)}). Max size is ${maxMB}MB.`;
  }
  return null;
}
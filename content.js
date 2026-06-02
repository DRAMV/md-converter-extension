const SIDEBAR_ID = "md-converter-sidebar";
const TOAST_ID   = "md-converter-toast";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_SIDEBAR") {
    toggleSidebar();
    sendResponse({ ok: true });
  }

  // ── NEW: PDF detected by background script ─────────────────────────────
  if (message.type === "PDF_DETECTED") {
    showPDFToast(message.url, message.filename);
    sendResponse({ ok: true });
  }

  return true;
});

function toggleSidebar() {
  const existing = document.getElementById(SIDEBAR_ID);
  if (existing) {
    existing.remove();
    return;
  }
  injectSidebar();
}

function injectSidebar() {
  const old = document.getElementById(SIDEBAR_ID);
  if (old) old.remove();

  const iframe       = document.createElement("iframe");
  iframe.id          = SIDEBAR_ID;
  iframe.src         = chrome.runtime.getURL("sidebar/sidebar.html");
  iframe.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    right: 0 !important;
    width: 420px !important;
    height: 100vh !important;
    border: none !important;
    z-index: 2147483647 !important;
    box-shadow: -4px 0 24px rgba(0,0,0,0.18) !important;
    background: white !important;
  `;

  document.documentElement.appendChild(iframe);

  iframe.addEventListener("load", () => {
    try {
      iframe.contentWindow.postMessage({
        type:  "PAGE_INFO",
        url:   location.href,
        title: document.title,
        isPDF: document.contentType === "application/pdf"
      }, "*");
    } catch (e) {
      console.error("MD Converter: PAGE_INFO failed", e);
    }
  });
}

// ── NEW: Show PDF toast notification ──────────────────────────────────────────

function showPDFToast(pdfUrl, filename) {
  // Don't show duplicate toasts
  if (document.getElementById(TOAST_ID)) return;

  const iframe   = document.createElement("iframe");
  iframe.id      = TOAST_ID;
  iframe.src     = chrome.runtime.getURL("toast/toast.html");
  iframe.style.cssText = `
    position: fixed !important;
    bottom: 24px !important;
    right: 24px !important;
    width: 360px !important;
    height: 160px !important;
    border: none !important;
    z-index: 2147483646 !important;
    background: transparent !important;
    border-radius: 12px !important;
  `;

  document.documentElement.appendChild(iframe);

  iframe.addEventListener("load", () => {
    iframe.contentWindow.postMessage({
      type:     "PDF_INFO",
      url:      pdfUrl,
      filename: filename
    }, "*");
  });
}

// ── NEW: Handle messages from toast iframe ────────────────────────────────────

window.addEventListener("message", async (e) => {
  if (!e.data || !e.data.type) return;

  const sidebar = document.getElementById(SIDEBAR_ID);
  const toast   = document.getElementById(TOAST_ID);

  // ── Toast messages ─────────────────────────────────────────────────────────

  if (e.data.type === "PDF_DISMISS") {
    if (toast) toast.remove();
    return;
  }

  if (e.data.type === "TOAST_HIDDEN") {
    if (toast) toast.remove();
    return;
  }

  if (e.data.type === "PDF_CONVERT") {
    // Remove toast
    if (toast) toast.remove();

    // Open sidebar first
    injectSidebar();

    // Wait for sidebar to load then trigger PDF conversion
    const newSidebar = document.getElementById(SIDEBAR_ID);
    if (newSidebar) {
      newSidebar.addEventListener("load", async () => {
        // Small delay so sidebar JS is ready
        setTimeout(async () => {
          try {
            // Fetch PDF as base64 via background
            const result = await chrome.runtime.sendMessage({
              type: "FETCH_PDF_BASE64",
              url:  location.href
            });

            if (result.error) {
              newSidebar.contentWindow.postMessage({
                type:  "CAPTURE_ERROR",
                error: result.error
              }, "*");
              return;
            }

            // Send to sidebar for conversion
            newSidebar.contentWindow.postMessage({
              type:     "CONVERT_PDF_BASE64",
              base64:   result.base64,
              filename: location.href.split("/").pop().split("?")[0]
            }, "*");

          } catch (err) {
            console.error("MD Converter: PDF conversion failed", err);
          }
        }, 500);
      });
    }
    return;
  }

  // ── Sidebar messages — only accept from sidebar iframe ─────────────────────

  if (!sidebar) return;

  const sidebarOrigin = chrome.runtime.getURL("").replace(/\/$/, "");
  if (!e.origin.startsWith(sidebarOrigin) && e.origin !== "null") return;

  if (e.data.type === "CLOSE_SIDEBAR") {
    sidebar.remove();
    return;
  }

  if (e.data.type === "CAPTURE_FULL_PAGE") {
    try {
      const dataUrl = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" });
      sidebar.contentWindow.postMessage({
        type:     "CAPTURED_IMAGE",
        dataUrl,
        mimeType: "image/png"
      }, "*");
    } catch (err) {
      sidebar.contentWindow.postMessage({
        type:  "CAPTURE_ERROR",
        error: err.message
      }, "*");
    }
    return;
  }

  if (e.data.type === "CAPTURE_AREA") {
    startAreaSelection(sidebar);
    return;
  }

  if (e.data.type === "CAPTURE_DOM") {
    captureDOMText(sidebar);
    return;
  }
});

// ─── DOM text capture ─────────────────────────────────────────────────────────

function captureDOMText(sidebar) {
  try {
    const article = document.querySelector("article, main, [role='main']");
    const target  = article || document.body;
    const clone   = target.cloneNode(true);

    clone.querySelectorAll(
      "script, style, nav, footer, header, aside, .ad, [aria-hidden='true']"
    ).forEach(el => el.remove());

    const text = clone.innerText || clone.textContent || "";

    sidebar.contentWindow.postMessage({
      type:  "DOM_TEXT",
      text,
      title: document.title
    }, "*");
  } catch (e) {
    sidebar.contentWindow.postMessage({
      type:  "DOM_TEXT",
      text:  document.body.innerText || "",
      title: document.title
    }, "*");
  }
}

// ─── Area selection ───────────────────────────────────────────────────────────

let selectionActive = false;

function startAreaSelection(sidebar) {
  if (selectionActive) return;
  selectionActive = true;

  sidebar.style.display = "none";

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    background: rgba(0,0,0,0.35);
    cursor: crosshair;
  `;
  document.documentElement.appendChild(overlay);

  const hint = document.createElement("div");
  hint.textContent = "Click and drag to select area — Esc to cancel";
  hint.style.cssText = `
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.75);
    color: white;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-family: system-ui;
    z-index: 2147483647;
    pointer-events: none;
    white-space: nowrap;
  `;
  document.documentElement.appendChild(hint);

  let startX = 0, startY = 0, selBox = null;

  function cleanup() {
    overlay.remove();
    hint.remove();
    selBox?.remove();
    selectionActive       = false;
    sidebar.style.display = "";
  }

  document.addEventListener("keydown", function onEsc(e) {
    if (e.key === "Escape") {
      cleanup();
      document.removeEventListener("keydown", onEsc);
    }
  });

  overlay.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    selBox = document.createElement("div");
    selBox.style.cssText = `
      position: fixed;
      border: 2px solid #1a73e8;
      background: rgba(26,115,232,0.08);
      pointer-events: none;
      z-index: 2147483647;
    `;
    document.documentElement.appendChild(selBox);
  });

  overlay.addEventListener("mousemove", (e) => {
    if (!selBox) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    selBox.style.left   = x + "px";
    selBox.style.top    = y + "px";
    selBox.style.width  = w + "px";
    selBox.style.height = h + "px";
  });

  overlay.addEventListener("mouseup", async (e) => {
    const rect = {
      x: Math.min(e.clientX, startX),
      y: Math.min(e.clientY, startY),
      w: Math.abs(e.clientX - startX),
      h: Math.abs(e.clientY - startY)
    };

    cleanup();

    if (rect.w < 10 || rect.h < 10) {
      sidebar.contentWindow.postMessage({
        type:  "CAPTURE_ERROR",
        error: "Selection too small. Please try again."
      }, "*");
      return;
    }

    try {
      const dataUrl = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE_TAB" });
      const cropped = await cropImage(dataUrl, rect);
      sidebar.contentWindow.postMessage({
        type:     "CAPTURED_IMAGE",
        dataUrl:  cropped,
        mimeType: "image/png"
      }, "*");
    } catch (err) {
      sidebar.contentWindow.postMessage({
        type:  "CAPTURE_ERROR",
        error: err.message
      }, "*");
    }
  });
}

// ─── Image crop ───────────────────────────────────────────────────────────────

async function cropImage(dataUrl, { x, y, w, h }) {
  return new Promise((resolve, reject) => {
    const img     = new Image();
    img.onload    = () => {
      const dpr     = window.devicePixelRatio || 1;
      const canvas  = document.createElement("canvas");
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      const ctx     = canvas.getContext("2d");
      ctx.drawImage(img, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror   = () => reject(new Error("Failed to load screenshot for cropping"));
    img.src       = dataUrl;
  });
}

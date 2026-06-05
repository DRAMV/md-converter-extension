// Firefox compat
if (typeof browser !== "undefined" && typeof chrome === "undefined") {
  globalThis.chrome = browser;
}

(function () {
  "use strict";

  // ── Duplicate injection guard (extension-specific) ──────────────────────────
  const LOADED_KEY = "__mdConverterLoaded_" + (chrome.runtime?.id || "fallback");
  if (window[LOADED_KEY]) return;
  window[LOADED_KEY] = true;

  const SIDEBAR_ID = "md-converter-sidebar";
  const TOAST_ID   = "md-converter-toast";

  // ── Safe message sender (handles context invalidation) ──────────────────────
  function safeSendMessage(message, callback) {
    try {
      if (!chrome.runtime?.id) {
        if (callback) callback({ error: "Extension context invalidated" });
        return;
      }
      chrome.runtime.sendMessage(message, function (response) {
        if (chrome.runtime.lastError) {
          if (callback) callback({ error: chrome.runtime.lastError.message });
          return;
        }
        if (callback) callback(response);
      });
    } catch (err) {
      console.warn("MD Converter: message send failed", err);
      if (callback) callback({ error: err.message });
    }
  }

  // ── Safe postMessage helper ─────────────────────────────────────────────────
  function safePostMessage(target, message) {
    try {
      if (target && target.contentWindow) {
        target.contentWindow.postMessage(message, "*");
      }
    } catch (err) {
      console.warn("MD Converter: postMessage failed", err);
    }
  }

  // ── Message listener ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "TOGGLE_SIDEBAR") {
      toggleSidebar();
      sendResponse({ ok: true });
    }
    if (message.type === "PDF_DETECTED") {
      showPDFToast(message.url, message.filename);
      sendResponse({ ok: true });
    }
    return true;
  });

  // ── Window message listener ─────────────────────────────────────────────────
  window.addEventListener("message", function (e) {
    if (!e.data || !e.data.type) return;

    const sidebar = document.getElementById(SIDEBAR_ID);
    const toast   = document.getElementById(TOAST_ID);

    // ── COPY request from sidebar ──────────────────────────────────────────
    if (e.data.type === "COPY_TEXT_REQUEST") {
      const ta = document.createElement("textarea");
      ta.value = e.data.text;
      ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.01;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (sidebar) {
        safePostMessage(sidebar, { type: "COPY_TEXT_RESULT", ok: ok });
      }
      return;
    }

    // Toast messages
    if (e.data.type === "PDF_DISMISS") {
      if (toast) toast.remove();
      return;
    }

    if (e.data.type === "TOAST_HIDDEN") {
      if (toast) toast.remove();
      return;
    }

    if (e.data.type === "PDF_CONVERT") {
      if (toast) toast.remove();
      injectSidebar();

      const newSidebar = document.getElementById(SIDEBAR_ID);
      if (newSidebar) {
        newSidebar.addEventListener("load", function () {
          setTimeout(function () {
            safeSendMessage(
              { type: "FETCH_PDF_BASE64", url: location.href },
              function (result) {
                if (!result || result.error) {
                  safePostMessage(newSidebar, {
                    type:  "CAPTURE_ERROR",
                    error: (result && result.error) || "Failed to fetch PDF"
                  });
                  return;
                }
                safePostMessage(newSidebar, {
                  type:     "CONVERT_PDF_BASE64",
                  base64:   result.base64,
                  filename: location.href.split("/").pop().split("?")[0]
                });
              }
            );
          }, 500);
        });
      }
      return;
    }

    // Sidebar messages — only from our sidebar iframe
    if (!sidebar) return;
    if (e.source !== sidebar.contentWindow) return;

    if (e.data.type === "CLOSE_SIDEBAR") {
      sidebar.remove();
      return;
    }

    if (e.data.type === "CAPTURE_FULL_PAGE") {
      safeSendMessage({ type: "CAPTURE_VISIBLE_TAB" }, function (dataUrl) {
        if (!dataUrl || dataUrl.error) {
          safePostMessage(sidebar, {
            type:  "CAPTURE_ERROR",
            error: (dataUrl && dataUrl.error) || "Capture failed"
          });
          return;
        }
        safePostMessage(sidebar, {
          type:     "CAPTURED_IMAGE",
          dataUrl:  dataUrl,
          mimeType: "image/png"
        });
      });
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

  // ── Toggle sidebar ──────────────────────────────────────────────────────────
  function toggleSidebar() {
    const existing = document.getElementById(SIDEBAR_ID);
    if (existing) {
      existing.remove();
      return;
    }
    injectSidebar();
  }

  // ── Inject sidebar ──────────────────────────────────────────────────────────
  function injectSidebar() {
    const old = document.getElementById(SIDEBAR_ID);
    if (old) old.remove();

    const iframe = document.createElement("iframe");
    iframe.id  = SIDEBAR_ID;
    iframe.src = chrome.runtime.getURL("sidebar/sidebar.html");
    iframe.setAttribute("style", [
      "position:fixed",
      "top:0",
      "right:0",
      "width:420px",
      "height:100%",
      "min-height:100vh",
      "border:none",
      "z-index:2147483647",
      "box-shadow:-4px 0 24px rgba(0,0,0,0.18)",
      "background:#fff",
      "display:block"
    ].join(" !important;") + " !important;");

    document.documentElement.appendChild(iframe);

    iframe.onload = function () {
      try {
        iframe.contentWindow.postMessage({
          type:  "PAGE_INFO",
          url:   location.href,
          title: document.title,
          isPDF: document.contentType === "application/pdf"
        }, "*");
      } catch (err) {
        console.warn("MD Converter: PAGE_INFO failed", err);
      }
    };
  }

  // ── Show PDF toast ──────────────────────────────────────────────────────────
  function showPDFToast(pdfUrl, filename) {
    if (document.getElementById(TOAST_ID)) return;

    const iframe = document.createElement("iframe");
    iframe.id  = TOAST_ID;
    iframe.src = chrome.runtime.getURL("toast/toast.html");
    iframe.setAttribute("style", [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "width:360px",
      "height:160px",
      "border:none",
      "z-index:2147483646",
      "background:transparent",
      "border-radius:12px"
    ].join(" !important;") + " !important;");

    document.documentElement.appendChild(iframe);

    iframe.onload = function () {
      try {
        iframe.contentWindow.postMessage({
          type:     "PDF_INFO",
          url:      pdfUrl,
          filename: filename
        }, "*");
      } catch (err) {
        console.warn("MD Converter: PDF_INFO failed", err);
      }
    };
  }

  // ── DOM text capture ────────────────────────────────────────────────────────
  function captureDOMText(sidebar) {
    try {
      const el    = document.querySelector("article, main, [role='main']") || document.body;
      const clone = el.cloneNode(true);
      clone.querySelectorAll(
        "script,style,nav,footer,header,aside,.ad,[aria-hidden='true'],iframe"
      ).forEach(function (n) { n.remove(); });

      safePostMessage(sidebar, {
        type:  "DOM_TEXT",
        text:  clone.innerText || clone.textContent || "",
        title: document.title
      });
    } catch (err) {
      safePostMessage(sidebar, {
        type:  "DOM_TEXT",
        text:  document.body.innerText || "",
        title: document.title
      });
    }
  }

  // ── Area selection ──────────────────────────────────────────────────────────
  let selectionActive = false;

  function startAreaSelection(sidebar) {
    if (selectionActive) return;
    selectionActive = true;

    sidebar.style.display = "none";

    const overlay = document.createElement("div");
    overlay.setAttribute("style",
      "position:fixed !important;top:0 !important;left:0 !important;" +
      "width:100% !important;height:100% !important;" +
      "z-index:2147483646 !important;background:rgba(0,0,0,0.4) !important;" +
      "cursor:crosshair !important;"
    );
    document.documentElement.appendChild(overlay);

    const hint = document.createElement("div");
    hint.textContent = "Drag to select area · Esc to cancel";
    hint.setAttribute("style",
      "position:fixed !important;top:16px !important;left:50% !important;" +
      "transform:translateX(-50%) !important;background:rgba(0,0,0,0.8) !important;" +
      "color:#fff !important;padding:8px 18px !important;" +
      "border-radius:8px !important;font:13px system-ui !important;" +
      "z-index:2147483647 !important;pointer-events:none !important;" +
      "white-space:nowrap !important;"
    );
    document.documentElement.appendChild(hint);

    let startX = 0, startY = 0, selBox = null;

    function cleanup() {
      overlay.remove();
      hint.remove();
      if (selBox) selBox.remove();
      selectionActive       = false;
      sidebar.style.display = "";
    }

    function onEsc(e) {
      if (e.key === "Escape") {
        cleanup();
        document.removeEventListener("keydown", onEsc);
      }
    }
    document.addEventListener("keydown", onEsc);

    overlay.addEventListener("mousedown", function (e) {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      selBox = document.createElement("div");
      selBox.setAttribute("style",
        "position:fixed !important;border:2px solid #1a73e8 !important;" +
        "background:rgba(26,115,232,0.1) !important;" +
        "pointer-events:none !important;z-index:2147483647 !important;"
      );
      document.documentElement.appendChild(selBox);
    });

    overlay.addEventListener("mousemove", function (e) {
      if (!selBox) return;
      const x = Math.min(e.clientX, startX);
      const y = Math.min(e.clientY, startY);
      selBox.style.left   = x + "px";
      selBox.style.top    = y + "px";
      selBox.style.width  = Math.abs(e.clientX - startX) + "px";
      selBox.style.height = Math.abs(e.clientY - startY) + "px";
    });

    overlay.addEventListener("mouseup", function (e) {
      const rect = {
        x: Math.min(e.clientX, startX),
        y: Math.min(e.clientY, startY),
        w: Math.abs(e.clientX - startX),
        h: Math.abs(e.clientY - startY)
      };

      cleanup();
      document.removeEventListener("keydown", onEsc);

      if (rect.w < 10 || rect.h < 10) {
        safePostMessage(sidebar, {
          type:  "CAPTURE_ERROR",
          error: "Selection too small. Try again."
        });
        return;
      }

      safeSendMessage({ type: "CAPTURE_VISIBLE_TAB" }, function (dataUrl) {
        if (!dataUrl || dataUrl.error) {
          safePostMessage(sidebar, {
            type:  "CAPTURE_ERROR",
            error: (dataUrl && dataUrl.error) || "Screenshot failed."
          });
          return;
        }
        cropImage(dataUrl, rect, function (cropped) {
          safePostMessage(sidebar, {
            type:     "CAPTURED_IMAGE",
            dataUrl:  cropped,
            mimeType: "image/png"
          });
        });
      });
    });
  }

  // ── Crop image ──────────────────────────────────────────────────────────────
  function cropImage(dataUrl, rect, callback) {
    const img = new Image();
    img.onload = function () {
      const dpr    = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width  = rect.w * dpr;
      canvas.height = rect.h * dpr;
      canvas.getContext("2d").drawImage(
        img,
        rect.x * dpr, rect.y * dpr,
        rect.w * dpr, rect.h * dpr,
        0, 0,
        rect.w * dpr, rect.h * dpr
      );
      callback(canvas.toDataURL("image/png"));
    };
    img.onerror = function () {
      console.error("MD Converter: crop failed");
    };
    img.src = dataUrl;
  }

})();
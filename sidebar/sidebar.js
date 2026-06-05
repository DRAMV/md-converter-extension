(async function () {

  // ─── Helper: load script — MUST be defined first ──────────────────────────

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      const s   = document.createElement("script");
      s.src     = src;
      s.onload  = () => {
        console.log("MD Converter: loaded", src.split("/").pop());
        resolve();
      };
      s.onerror = () => {
        console.error("MD Converter: FAILED to load", src);
        reject(new Error("Failed to load: " + src));
      };
      document.head.appendChild(s);
    });
  }

  // ─── Load all utility scripts ──────────────────────────────────────────────

  try {
    await loadScript(chrome.runtime.getURL("utils/converter.js"));
    await loadScript(chrome.runtime.getURL("utils/image-analyzer.js"));
    await loadScript(chrome.runtime.getURL("utils/office-converter.js"));
    await loadScript(chrome.runtime.getURL("libs/mammoth.min.js"));
    await loadScript(chrome.runtime.getURL("libs/xlsx.min.js"));
  } catch (err) {
    console.error("MD Converter: script load failed —", err.message);
  }

  // Verify all loaded
  console.log("MD Converter scripts:", {
    detectFileType:     typeof detectFileType,
    detectImageSubtype: typeof detectImageSubtype,
    getImagePrompt:     typeof getImagePrompt,
    convertDOCX:        typeof convertDOCX
  });

  // ── Load settings ──────────────────────────────────────────────────────────

  const settings = await chrome.storage.sync.get(["theme", "captureMode"]);
  applyTheme(settings.theme || "light");
  highlightCaptureMode(settings.captureMode || "fullpage");

  function applyTheme(theme) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
  }

  function highlightCaptureMode(mode) {
    const map = {
      area:     "btnArea",
      fullpage: "btnFullPage",
      dom:      "btnDOM",
      upload:   "btnUpload"
    };
    const btnId = map[mode];
    if (btnId) {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.style.borderColor = "#1a73e8";
        btn.style.background  = "#e8f0fe";
        btn.style.fontWeight  = "600";
      }
    }
  }

  let currentFilename = "output.md";
  let pageInfo        = {};
  let statusTimer     = null;

  // ─── Messages from content script ─────────────────────────────────────────

  window.addEventListener("message", (e) => {
    if (!e.data || !e.data.type) return;

    if (e.data.type === "PAGE_INFO") {
      pageInfo = e.data;
    }

    // ── Copy result from content script ──────────────────────────────────
    if (e.data.type === "COPY_TEXT_RESULT") {
      if (e.data.ok) {
        const btn       = document.getElementById("btnCopy");
        btn.textContent = "Copied!";
        setTimeout(() => { btn.textContent = "Copy"; }, 1500);
      } else {
        setStatus("Copy failed — select text manually and press Cmd+C", "error");
      }
      return;
    }

    if (e.data.type === "CAPTURED_IMAGE") {
      convertContent({
        type:     "image",
        data:     e.data.dataUrl,
        mimeType: e.data.mimeType
      });
    }

    if (e.data.type === "DOM_TEXT") {
      convertContent({
        type:     "text",
        data:     e.data.text,
        filename: e.data.title
      });
    }

    if (e.data.type === "CAPTURE_ERROR") {
      setStatus("Capture failed: " + e.data.error, "error");
    }

    if (e.data.type === "CONVERT_PDF_BASE64") {
      convertContent({
        type:     "pdf",
        data:     "data:application/pdf;base64," + e.data.base64,
        mimeType: "application/pdf",
        filename: e.data.filename || "document.pdf"
      });
    }
  });

  // ─── Close button ──────────────────────────────────────────────────────────

  document.getElementById("closeBtn").addEventListener("click", () => {
    window.parent.postMessage({ type: "CLOSE_SIDEBAR" }, "*");
  });

  // ─── Action buttons ────────────────────────────────────────────────────────

  document.getElementById("btnArea").addEventListener("click", () => {
    setStatus("Draw a selection on the page...", "loading");
    window.parent.postMessage({ type: "CAPTURE_AREA" }, "*");
  });

  document.getElementById("btnFullPage").addEventListener("click", () => {
    setStatus("Capturing screenshot...", "loading");
    window.parent.postMessage({ type: "CAPTURE_FULL_PAGE" }, "*");
  });

  document.getElementById("btnDOM").addEventListener("click", () => {
    setStatus("Extracting page text...", "loading");
    window.parent.postMessage({ type: "CAPTURE_DOM" }, "*");
  });

  document.getElementById("btnUpload").addEventListener("click", () => {
    document.getElementById("fileInput").click();
  });

  // ─── File upload ───────────────────────────────────────────────────────────

  document.getElementById("fileInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sizeError = validateFileSize(file);
    if (sizeError) {
      setStatus(sizeError, "error");
      e.target.value = "";
      return;
    }

    const fileType = detectFileType(file);
    if (fileType === "unsupported") {
      setStatus("Unsupported file type: " + (file.type || file.name), "error");
      e.target.value = "";
      return;
    }

    currentFilename = generateFilename(file.name);
    setStatus("Reading " + file.name + "...", "loading");

    try {

      if (fileType === "docx") {
        setStatus("Parsing Word document...", "loading");
        const buffer     = await readFileAsArrayBuffer(file);
        const structured = await convertDOCX(buffer);
        convertContent({ type: "text", data: structured, filename: file.name, subtype: "docx" });

      } else if (fileType === "xlsx") {
        setStatus("Parsing spreadsheet...", "loading");
        const buffer     = await readFileAsArrayBuffer(file);
        const structured = await convertXLSX(buffer);
        convertContent({ type: "text", data: structured, filename: file.name, subtype: "xlsx" });

      } else if (fileType === "pptx") {
        setStatus("Parsing presentation...", "loading");
        const buffer     = await readFileAsArrayBuffer(file);
        const structured = await convertPPTX(buffer);
        convertContent({ type: "text", data: structured, filename: file.name, subtype: "pptx" });

      } else if (fileType === "image") {
        setStatus("Analysing image...", "loading");
        const base64  = await readFileAsBase64(file);
        const subtype = await detectImageSubtype(base64, file.name);

        const subtypeLabels = {
          screenshot:       "Screenshot",
          scanned_document: "Scanned document",
          handwriting:      "Handwriting",
          table:            "Table / data",
          chart:            "Chart / graph",
          diagram:          "Diagram",
          slide:            "Presentation slide",
          receipt:          "Receipt / invoice",
          document_page:    "Document page",
          photo:            "Photo",
          banner:           "Banner / wide image"
        };

        setStatus(
          "Detected: " + (subtypeLabels[subtype] || subtype) + " — converting...",
          "loading"
        );

        await new Promise(r => setTimeout(r, 300));

        convertContent({
          type:     "image",
          data:     base64,
          mimeType: file.type,
          filename: file.name,
          subtype:  subtype
        });

      } else if (fileType === "text") {
        const text = await readFileAsText(file);
        convertContent({ type: "text", data: text, filename: file.name });

      } else {
        const base64 = await readFileAsBase64(file);
        convertContent({ type: fileType, data: base64, mimeType: file.type, filename: file.name });
      }

    } catch (err) {
      setStatus("Failed to process file: " + err.message, "error");
    }

    e.target.value = "";
  });

  // ─── Core conversion ───────────────────────────────────────────────────────

  async function convertContent(payload) {
    const bar = document.getElementById("statusBar");
    const currentText = bar ? bar.textContent.toLowerCase() : "";
    const alreadyConverting = currentText.includes("converting") ||
                              currentText.includes("parsing") ||
                              currentText.includes("extracting") ||
                              currentText.includes("analysing") ||
                              currentText.includes("analyzing");

    if (!alreadyConverting) {
      setStatus("Converting with Gemini...", "loading");
    }

    hidePreview();

    try {
      const result = await chrome.runtime.sendMessage({
        type:    "CONVERT_TO_MARKDOWN",
        payload
      });

      if (!result) {
        setStatus("No response from background. Reload the extension.", "error");
        return;
      }

      if (result.error) {
        setStatus("Error: " + result.error, "error");
        return;
      }

      currentFilename = result.filename
        || generateFilename(pageInfo.title)
        || "output.md";

      showPreview(result.markdown);

      const wordCount = result.markdown.trim().split(/\s+/).length;
      setStatus("✓ Done — " + wordCount + " words", "success");

    } catch (err) {
      setStatus("Unexpected error: " + err.message, "error");
    }
  }

  // ─── Preview panel ─────────────────────────────────────────────────────────

  function showPreview(markdown) {
    const area   = document.getElementById("previewArea");
    const output = document.getElementById("mdOutput");
    const title  = document.getElementById("previewTitle");

    output.value       = markdown;
    title.textContent  = currentFilename;
    area.style.display = "flex";

    updateCount();
  }

  function hidePreview() {
    document.getElementById("previewArea").style.display = "none";
    document.getElementById("mdOutput").value            = "";
  }

  // ─── Status bar ────────────────────────────────────────────────────────────

  function setStatus(msg, type) {
    const bar = document.getElementById("statusBar");
    if (!bar) return;

    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }

    bar.className     = "status-bar";
    bar.innerHTML     = "";
    bar.style.display = "none";

    if (!msg) return;

    bar.style.display = "block";
    bar.textContent   = msg;
    bar.className     = "status-bar " + (type || "");

    if (type === "success") {
      statusTimer = setTimeout(() => {
        bar.className     = "status-bar";
        bar.innerHTML     = "";
        bar.style.display = "none";
        statusTimer       = null;
      }, 3000);
    }
  }

  // ─── Copy (via content script in main page) ────────────────────────────────

  document.getElementById("btnCopy").addEventListener("click", () => {
    const text = document.getElementById("mdOutput").value;
    if (!text) return;

    window.parent.postMessage({ type: "COPY_TEXT_REQUEST", text: text }, "*");
  });

  // ─── Download (via background — data URL) ──────────────────────────────────

  document.getElementById("btnDownload").addEventListener("click", () => {
    const text = document.getElementById("mdOutput").value;
    if (!text) return;

    chrome.runtime.sendMessage({
      type:     "DOWNLOAD_MARKDOWN",
      content:  text,
      filename: currentFilename
    }, (result) => {
      if (chrome.runtime.lastError) {
        setStatus("Download failed: " + chrome.runtime.lastError.message, "error");
      } else if (result && result.ok) {
        setStatus("✓ Downloaded " + currentFilename, "success");
      } else {
        setStatus("Download failed", "error");
      }
    });
  });

  // ─── Editable filename ─────────────────────────────────────────────────────

  document.getElementById("previewTitle").addEventListener("click", function () {
    const current = this.textContent;
    const input   = document.createElement("input");

    input.type          = "text";
    input.value         = current;
    input.style.cssText = `
      font-size: 12px;
      font-family: monospace;
      border: 1px solid #1a73e8;
      border-radius: 4px;
      padding: 2px 6px;
      width: 200px;
      outline: none;
    `;

    this.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      const newName   = input.value.trim();
      currentFilename = newName.endsWith(".md") ? newName : newName + ".md";

      const span       = document.createElement("span");
      span.id          = "previewTitle";
      span.className   = "preview-title";
      span.textContent = currentFilename;
      span.style.cursor = "pointer";
      span.addEventListener("click", function () {
        this.dispatchEvent(new Event("click"));
      });
      input.replaceWith(span);
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter")  { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = current; input.blur(); }
    });
  });

  // ─── Word / char count ─────────────────────────────────────────────────────

  document.getElementById("mdOutput").addEventListener("input", updateCount);

  function updateCount() {
    const text  = document.getElementById("mdOutput").value;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const chars = text.length;

    let counter = document.getElementById("mdCounter");
    if (!counter) {
      counter               = document.createElement("div");
      counter.id            = "mdCounter";
      counter.style.cssText = `
        font-size: 11px;
        color: #999;
        padding: 4px 12px;
        border-top: 1px solid #eee;
        text-align: right;
        background: #fafafa;
        flex-shrink: 0;
      `;
      document.getElementById("previewArea").appendChild(counter);
    }

    counter.textContent = `${words} words · ${chars} chars`;
  }

})();
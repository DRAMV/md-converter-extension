// Load converter utils first, then run sidebar logic
(async function () {

  // Dynamically load converter.js into this iframe context
  await loadScript(chrome.runtime.getURL("utils/converter.js"));

  let currentFilename = "output.md";
  let pageInfo        = {};

  // ─── Messages from content script ─────────────────────────────────────────

  window.addEventListener("message", (e) => {
    if (!e.data || !e.data.type) return;

    if (e.data.type === "PAGE_INFO") {
      pageInfo = e.data;
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
  });

  // ─── Close button ──────────────────────────────────────────────────────────

  document.getElementById("closeBtn").addEventListener("click", () => {
    // Post to parent window (the actual page)
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

    setStatus("Reading " + file.name + "...", "loading");
    currentFilename = generateFilename(file.name);

    try {
      if (fileType === "text") {
        const text = await readFileAsText(file);
        convertContent({ type: "text", data: text, filename: file.name });
      } else {
        const base64 = await readFileAsBase64(file);
        convertContent({
          type:     fileType,
          data:     base64,
          mimeType: file.type,
          filename: file.name
        });
      }
    } catch (err) {
      setStatus("Failed to read file: " + err.message, "error");
    }

    e.target.value = "";
  });

  // ─── Core conversion ───────────────────────────────────────────────────────

  async function convertContent(payload) {
    setStatus("Converting with Gemini...", "loading");
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
      setStatus("", "");

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
    if (!msg) {
      bar.style.display = "none";
      bar.textContent   = "";
      return;
    }
    bar.style.display = "block";
    bar.textContent   = msg;
    bar.className     = "status-bar " + (type || "");
  }

  // ─── Copy ──────────────────────────────────────────────────────────────────

  document.getElementById("btnCopy").addEventListener("click", async () => {
    const text = document.getElementById("mdOutput").value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const btn       = document.getElementById("btnCopy");
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy"; }, 1500);
    } catch (err) {
      setStatus("Clipboard failed: " + err.message, "error");
    }
  });

  // ─── Download ──────────────────────────────────────────────────────────────

  document.getElementById("btnDownload").addEventListener("click", () => {
    const text = document.getElementById("mdOutput").value;
    if (!text) return;

    chrome.runtime.sendMessage({
      type:     "DOWNLOAD_MARKDOWN",
      content:  text,
      filename: currentFilename
    });
  });

  // ─── Editable filename ─────────────────────────────────────────────────────

  document.getElementById("previewTitle").addEventListener("click", function () {
    const current = this.textContent;
    const input   = document.createElement("input");

    input.type        = "text";
    input.value       = current;
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

      const span         = document.createElement("span");
      span.id            = "previewTitle";
      span.className     = "preview-title";
      span.textContent   = currentFilename;
      span.style.cursor  = "pointer";
      span.addEventListener("click", function () { this.dispatchEvent(new Event("click")); });
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

  // ─── Helper: load a script into this page ─────────────────────────────────

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s    = document.createElement("script");
      s.src      = src;
      s.onload   = resolve;
      s.onerror  = () => reject(new Error("Failed to load: " + src));
      document.head.appendChild(s);
    });
  }

})();

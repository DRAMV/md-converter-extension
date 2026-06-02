const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse(dataUrl);
    });
    return true;
  }

  if (message.type === "DOWNLOAD_MARKDOWN") {
    const blob = new Blob([message.content], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    chrome.downloads.download({
      url,
      filename: message.filename || "output.md",
      saveAs:   false
    });
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CONVERT_TO_MARKDOWN") {
    handleConversion(message.payload).then(sendResponse);
    return true;
  }

  if (message.type === "GET_API_KEY") {
    chrome.storage.sync.get("apiKey", (data) => sendResponse(data.apiKey || ""));
    return true;
  }

  if (message.type === "SET_API_KEY") {
    chrome.storage.sync.set({ apiKey: message.key }, () => sendResponse({ ok: true }));
    return true;
  }

  // ── NEW: fetch PDF as base64 for conversion ──────────────────────────────
  if (message.type === "FETCH_PDF_BASE64") {
    fetchPDFAsBase64(message.url).then(sendResponse);
    return true;
  }

});

// ── NEW: Auto-detect PDF tabs on navigation ──────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only trigger when page fully loads
  if (changeInfo.status !== "complete") return;

  // Check if it's a PDF
  const url = tab.url || "";
  const isPDF =
    url.endsWith(".pdf") ||
    url.includes(".pdf?") ||
    (tab.title && tab.title.toLowerCase().endsWith(".pdf"));

  if (!isPDF) return;

  // Inject content script if not already there
  chrome.scripting.executeScript(
    { target: { tabId }, files: ["content.js"] },
    () => {
      if (chrome.runtime.lastError) {
        // Already injected or restricted page — ignore
        return;
      }
      // Tell content script a PDF was detected
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type:     "PDF_DETECTED",
          url:      tab.url,
          filename: tab.url.split("/").pop().split("?")[0]
        });
      }, 800);
    }
  );
});

// ── NEW: Fetch PDF from URL and return as base64 ─────────────────────────────

async function fetchPDFAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: "Failed to fetch PDF: " + response.status };
    }
    const buffer     = await response.arrayBuffer();
    const byteArray  = new Uint8Array(buffer);
    let   binary     = "";
    for (let i = 0; i < byteArray.byteLength; i++) {
      binary += String.fromCharCode(byteArray[i]);
    }
    const base64 = btoa(binary);
    return { base64 };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleConversion({ type, data, mimeType, filename }) {
  const { apiKey } = await chrome.storage.sync.get("apiKey");

  if (!apiKey) {
    return { error: "No API key set. Open the extension popup to add one." };
  }

  try {
    let parts;

    if (type === "image") {
      parts = [
        {
          inline_data: {
            mime_type: mimeType || "image/png",
            data: data.replace(/^data:[^;]+;base64,/, "")
          }
        },
        {
          text: "Convert everything visible in this image to clean, well-structured Markdown. Preserve headings, lists, tables, code blocks, and emphasis. Output only the Markdown, no preamble."
        }
      ];

    } else if (type === "pdf") {
      parts = [
        {
          inline_data: {
            mime_type: "application/pdf",
            data: data.replace(/^data:[^;]+;base64,/, "")
          }
        },
        {
          text: "Convert this PDF to clean, well-structured Markdown. Preserve all headings, lists, tables, code blocks, and emphasis. Output only the Markdown, no preamble."
        }
      ];

    } else if (type === "text") {
      parts = [
        {
          text: `Convert the following web page content to clean, well-structured Markdown. Preserve the document structure, headings, lists, links, tables, and code blocks. Remove navigation menus, ads, and boilerplate. Output only the Markdown.\n\n---\n\n${data}`
        }
      ];

    } else if (type === "audio") {
      parts = [
        {
          text: `Structure the following transcript into clean Markdown. Include speaker labels if multiple speakers are present, timestamps for key sections, and a short summary at the top. File: ${filename || "audio file"}\n\n---\n\n${data}`
        }
      ];
    }

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature:     0.2,
          maxOutputTokens: 8192
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return { error: err.error?.message || `API error ${response.status}` };
    }

    const result   = await response.json();
    const markdown = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!markdown) {
      return { error: "No content returned. Try a different capture method." };
    }

    return { markdown, filename: suggestFilename(filename) };

  } catch (e) {
    return { error: e.message };
  }
}

function suggestFilename(original) {
  if (original) return original.replace(/\.[^.]+$/, "") + ".md";
  const date = new Date().toISOString().slice(0, 10);
  return `converted-${date}.md`;
}

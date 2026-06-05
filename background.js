const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

// ── Image subtype prompts ─────────────────────────────────────────────────────

const IMAGE_PROMPTS = {

  screenshot: `You are an expert document converter.
Analyse this screenshot carefully and convert ALL visible content to clean, well-structured Markdown.

RULES:
- Preserve every heading level (h1→#, h2→##, etc.)
- Convert all lists (bullet and numbered) accurately
- Convert any visible tables to Markdown table format — preserve ALL columns exactly as they appear
- Wrap any code, commands, or technical strings in backtick code blocks with the correct language tag
- Preserve links if visible as [text](url)
- Preserve bold and italic emphasis
- Remove browser UI, toolbars, scrollbars — content only
- Do NOT alter any numbers, dates, or values in tables — copy exactly as shown
Output only the Markdown. No preamble, no explanation.`,

  scanned_document: `You are an expert OCR and document converter.
This is a scanned physical document. Extract ALL text with high accuracy.
Rules:
- Reconstruct the original document structure with correct heading hierarchy
- Preserve paragraph breaks as they appear in the document
- Convert any visible tables to Markdown table format — preserve ALL columns exactly
- If you see form fields, render them as: **Field name:** value
- Correct obvious scan artefacts (broken words, stray characters) where safe
- Preserve any numbered or bulleted lists
- If text is unclear, use [illegible] as a placeholder
- Do NOT alter any numbers, dates, or values — copy exactly as shown
Output only the Markdown. No preamble, no explanation.`,

  handwriting: `You are an expert handwriting transcription specialist.
Transcribe ALL handwritten text in this image as accurately as possible.
Rules:
- Preserve the original structure — headings, lists, paragraphs
- If text is ambiguous, make your best inference and note it with (?)
- Convert drawn tables or grids to Markdown table format — preserve ALL columns
- Preserve any arrows or connectors as prose descriptions (e.g. "→ leads to")
- Use [illegible] for sections that cannot be read
- Do NOT alter any numbers or values — transcribe exactly as written
Output only the Markdown transcription. No preamble, no explanation.`,

  table: `You are an expert data extraction specialist.
This image contains a table or structured data. Extract it with perfect accuracy.
Rules:
- Convert the table to proper Markdown table format
- Preserve ALL columns exactly as they appear in the image — do not add or remove columns
- Preserve all headers exactly as written
- Preserve all cell values — numbers, text, units — exactly as shown
- If there are multiple tables, separate them with a heading and a blank line
- If there are notes or footnotes below the table, include them after
- Do NOT add, remove, or recalculate any data not visible in the image
Output only the Markdown table(s). No preamble, no explanation.`,

  chart: `You are an expert data analyst and document converter.
This image contains a chart or graph. Describe and extract its content into Markdown.
Rules:
- Start with a ## heading using the chart title if visible
- Write a 1-2 sentence description of what the chart shows
- Extract the underlying data into a Markdown table if values are readable — copy values exactly
- Note the chart type (bar, line, pie, etc.)
- Note the axis labels and units
- Highlight any key trends or notable data points in a brief bullet list
- If exact values are not readable, use approximations marked with (~)
Output only the Markdown. No preamble, no explanation.`,

  diagram: `You are an expert technical writer and diagram analyst.
This image contains a diagram, flowchart, or architecture drawing.
Rules:
- Start with a ## heading using the diagram title if visible
- Write a clear prose description of what the diagram shows
- List all nodes/components as a bullet list with their labels — copy exactly as written
- Describe the connections/flow between components
- If there are labels on arrows, include them exactly
- Preserve any legend or key information
Output only the Markdown. No preamble, no explanation.`,

  slide: `You are an expert presentation converter.
This is a presentation slide. Extract all content to Markdown.
Rules:
- Use ## for the slide title
- Use bullet points for slide body content exactly as shown
- Preserve any sub-bullets with proper indentation (  -)
- Include any speaker notes if visible, under a **Notes:** heading
- Include any visible chart or table data — preserve values exactly
- Preserve emphasis (bold, italic) as shown
Output only the Markdown. No preamble, no explanation.`,

  receipt: `You are an expert document data extractor.
This is a receipt, invoice, or financial document. Extract ALL data with 100% accuracy.

CRITICAL RULES — DO NOT HALLUCINATE OR ALTER ANY VALUES:
- Every number, date, name, and text string must match the image EXACTLY
- If a value is unclear, mark it as [?] — never guess or calculate
- Do NOT recalculate totals, taxes, or amounts — copy them as-is even if they appear wrong
- Do NOT rename items — copy descriptions exactly as written
- Do NOT reorder rows — keep the original line item order
- Preserve the original quantity column if present

FORMAT:
- Start with ## Invoice (or Receipt / Bill as shown)
- Extract merchant/vendor name and address
- Extract "Bill To" and "Ship To" sections if present
- List all header fields (Invoice #, Date, P.O.#, Due Date) as bold key-value pairs
- Convert line items to a Markdown table preserving ALL original columns (Qty, Description, Unit Price, Amount, etc.)
- Include subtotal, tax, discount, and total as separate bold lines — copy values exactly
- Include terms, notes, or payment info at the bottom

Output only the Markdown. No preamble, no explanation.`,

  document_page: `You are an expert document converter.
This is a page from a document or book. Convert it to clean Markdown.
Rules:
- Preserve the heading hierarchy exactly
- Preserve all paragraph text with correct line breaks
- Convert any tables to Markdown table format — preserve ALL columns exactly
- Preserve footnotes at the bottom with superscript markers as [^1]
- Preserve page numbers as <!-- page N --> comments
- Wrap any inline code or technical terms in backticks
- Do NOT alter any numbers, dates, or values — copy exactly as shown
Output only the Markdown. No preamble, no explanation.`,

  photo: `You are an expert image analyst and document converter.
Analyse this image and extract any visible text or structured information.
Rules:
- Extract all visible text accurately — do not alter any values
- If the image contains a document, form, or label — structure it as Markdown
- If the image is a scene or object with minimal text — describe it briefly in Markdown
- Use headings and lists where appropriate
Output only the Markdown. No preamble, no explanation.`,

  banner: `You are an expert content extractor.
Extract all text and content from this banner or wide image.
Rules:
- Extract all visible text in reading order
- Preserve any headings or taglines as ## headings
- List any bullet points or features as a Markdown list
- Include any visible URLs, contact info, or CTAs
Output only the Markdown. No preamble, no explanation.`

};

function getImagePrompt(subtype) {
  return IMAGE_PROMPTS[subtype] || IMAGE_PROMPTS["screenshot"];
}

// ── Message listeners ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "CAPTURE_VISIBLE_TAB") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse(dataUrl);
    });
    return true;
  }

  if (message.type === "DOWNLOAD_MARKDOWN") {
    const dataUrl = "data:text/markdown;charset=utf-8," + encodeURIComponent(message.content);
    chrome.downloads.download({
      url:      dataUrl,
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

  if (message.type === "FETCH_PDF_BASE64") {
    fetchPDFAsBase64(message.url).then(sendResponse);
    return true;
  }

});

// ── Auto-detect PDF tabs ──────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;

  const url   = tab.url || "";
  const isPDF =
    url.endsWith(".pdf") ||
    url.includes(".pdf?") ||
    (tab.title && tab.title.toLowerCase().endsWith(".pdf"));

  if (!isPDF) return;

  chrome.storage.sync.get("pdfDetect", (data) => {
    if (data.pdfDetect === false) return;

    chrome.scripting.executeScript(
      { target: { tabId }, files: ["content.js"] },
      () => {
        if (chrome.runtime.lastError) return;
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
});

// ── Fetch PDF as base64 ───────────────────────────────────────────────────────

async function fetchPDFAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return { error: "Failed to fetch PDF: " + response.status };
    const buffer   = await response.arrayBuffer();
    const bytes    = new Uint8Array(buffer);
    let   binary   = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return { base64: btoa(binary) };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Conversion ────────────────────────────────────────────────────────────────

async function handleConversion({ type, data, mimeType, filename, subtype }) {
  const storage = await chrome.storage.sync.get([
    "apiKey", "aiModel", "maxTokens", "temperature", "filenameTemplate"
  ]);

  const apiKey      = storage.apiKey;
  const aiModel     = storage.aiModel     || "gemini-2.5-flash-lite";
  const maxTokens   = storage.maxTokens   || 8192;
  const temperature = storage.temperature ?? 0.2;
  const template    = storage.filenameTemplate || "{date}-{title}";

  if (!apiKey) {
    return { error: "No API key set. Open the extension popup to add one." };
  }

  try {
    let parts;

    if (type === "image") {
      const imagePrompt = subtype
        ? getImagePrompt(subtype)
        : "Convert everything visible in this image to clean, well-structured Markdown. Preserve headings, lists, tables, code blocks, and emphasis. Output only the Markdown, no preamble.";

      parts = [
        {
          inline_data: {
            mime_type: mimeType || "image/png",
            data: data.replace(/^data:[^;]+;base64,/, "")
          }
        },
        { text: imagePrompt }
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
      let textPrompt;

      if (subtype === "docx") {
        textPrompt = `The following is structured text extracted from a Word document (.docx).
Convert it to clean, well-structured Markdown.
Preserve all heading levels, lists, tables, bold/italic emphasis, and code blocks.
Output only the Markdown, no preamble.\n\n---\n\n${data}`;
      } else if (subtype === "xlsx") {
        textPrompt = `The following is data extracted from an Excel spreadsheet (.xlsx).
It is already in Markdown table format per sheet.
Clean it up, fix any alignment issues, add a brief one-line description above each table if the sheet name gives context.
Output only the final Markdown, no preamble.\n\n---\n\n${data}`;
      } else if (subtype === "pptx") {
        textPrompt = `The following is text extracted from a PowerPoint presentation (.pptx), organised by slide.
Convert it to clean Markdown.
Use ## for each slide heading, bullet points for slide content, and preserve any data tables.
Output only the Markdown, no preamble.\n\n---\n\n${data}`;
      } else {
        textPrompt = `Convert the following web page content to clean, well-structured Markdown. Preserve the document structure, headings, lists, links, tables, and code blocks. Remove navigation menus, ads, and boilerplate. Output only the Markdown.\n\n---\n\n${data}`;
      }
      parts = [{ text: textPrompt }];

    } else if (type === "audio") {
      parts = [
        {
          text: `Structure the following transcript into clean Markdown. Include speaker labels if multiple speakers are present, timestamps for key sections, and a short summary at the top. File: ${filename || "audio file"}\n\n---\n\n${data}`
        }
      ];
    }

    const GEMINI_API_URL = `${GEMINI_BASE_URL}/${aiModel}:generateContent`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens
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

    return {
      markdown,
      filename: buildFilename(template, filename)
    };

  } catch (e) {
    return { error: e.message };
  }
}

// ── Filename builder using template ──────────────────────────────────────────

function buildFilename(template, original) {
  const now   = new Date();
  const date  = now.toISOString().slice(0, 10);
  const time  = now.getHours().toString().padStart(2, "0") + "-" +
                now.getMinutes().toString().padStart(2, "0");
  const title = original
    ? original.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase().slice(0, 50)
    : "converted";

  return (template || "{date}-{title}")
    .replace(/\{date\}/g,  date)
    .replace(/\{time\}/g,  time)
    .replace(/\{title\}/g, title)
    .replace(/[^a-zA-Z0-9\-_.]/g, "-")
    .toLowerCase() + ".md";
}
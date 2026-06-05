// utils/office-converter.js
// Handles DOCX, XLSX, PPTX conversion using mammoth.js and SheetJS
// Both libraries must be loaded before this runs

async function convertDOCX(arrayBuffer) {
  if (typeof mammoth === "undefined") {
    throw new Error("mammoth.js not loaded");
  }

  // Convert DOCX to HTML first, then clean it for Gemini
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Code']      => pre:fresh",
        "r[style-name='Code']      => code"
      ]
    }
  );

  const html = result.value;

  // Strip HTML tags to get clean structured text for Gemini
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Convert HTML structure to Markdown-friendly text
  let text = "";

  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    if (tag === "h1") { text += "\n# ";  processChildren(node); text += "\n"; return; }
    if (tag === "h2") { text += "\n## "; processChildren(node); text += "\n"; return; }
    if (tag === "h3") { text += "\n### ";processChildren(node); text += "\n"; return; }
    if (tag === "h4") { text += "\n#### ";processChildren(node); text += "\n"; return; }
    if (tag === "p")  { text += "\n"; processChildren(node); text += "\n"; return; }
    if (tag === "br") { text += "\n"; return; }
    if (tag === "strong" || tag === "b") { text += "**"; processChildren(node); text += "**"; return; }
    if (tag === "em"  || tag === "i")    { text += "_";  processChildren(node); text += "_";  return; }
    if (tag === "code")  { text += "`";  processChildren(node); text += "`";  return; }
    if (tag === "pre")   { text += "\n```\n"; processChildren(node); text += "\n```\n"; return; }
    if (tag === "li")    { text += "\n- "; processChildren(node); return; }
    if (tag === "ul" || tag === "ol") { processChildren(node); text += "\n"; return; }

    if (tag === "table") {
      processTable(node);
      return;
    }

    processChildren(node);
  }

  function processChildren(node) {
    node.childNodes.forEach(processNode);
  }

  function processTable(table) {
    const rows = table.querySelectorAll("tr");
    if (!rows.length) return;

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll("td, th");
      const cellTexts = Array.from(cells).map(c => c.innerText.trim().replace(/\n/g, " "));
      text += "\n| " + cellTexts.join(" | ") + " |";
      // Add separator after header row
      if (rowIndex === 0) {
        text += "\n|" + cells.length > 0
          ? Array.from(cells).map(() => "---").join("|") + "|"
          : "";
      }
    });
    text += "\n";
  }

  processNode(tmp);

  return truncateToTokenLimit(text.trim());
}

async function convertXLSX(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("SheetJS (XLSX) not loaded");
  }

  const workbook    = XLSX.read(arrayBuffer, { type: "array" });
  let   fullText    = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to array of arrays
    const rows  = XLSX.utils.sheet_to_json(sheet, {
      header:    1,
      defval:    "",
      raw:       false
    });

    if (!rows.length) return;

    fullText += `\n## ${sheetName}\n\n`;

    // Find max columns
    const maxCols = Math.max(...rows.map(r => r.length));
    if (maxCols === 0) return;

    // Header row
    const header = rows[0].map(c => String(c).trim() || " ");
    fullText += "| " + header.join(" | ") + " |\n";
    fullText += "| " + header.map(() => "---").join(" | ") + " |\n";

    // Data rows
    rows.slice(1).forEach(row => {
      const cells = Array.from({ length: maxCols }, (_, i) =>
        String(row[i] !== undefined ? row[i] : "").trim()
      );
      fullText += "| " + cells.join(" | ") + " |\n";
    });

    fullText += "\n";
  });

  return truncateToTokenLimit(fullText.trim());
}

async function convertPPTX(arrayBuffer) {
  if (typeof XLSX === "undefined") {
    throw new Error("SheetJS not loaded — needed for PPTX zip parsing");
  }

  // PPTX is a ZIP — use JSZip-like reading via XLSX's zip utilities
  // Extract text from slide XML files
  const zip    = XLSX.CFB.read(arrayBuffer, { type: "array" });
  let   slides = [];

  try {
    // Find all slide XML entries
    zip.FullPaths.forEach((path, idx) => {
      if (path.match(/ppt\/slides\/slide\d+\.xml$/)) {
        const content = XLSX.CFB.utils.cfb_to_utf8(zip.FileIndex[idx]);
        // Extract text from XML tags
        const text = content
          .replace(/<a:t>/g, " ")
          .replace(/<\/a:t>/g, "")
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        if (text) slides.push(text);
      }
    });
  } catch (err) {
    // Fallback: just return what we extracted
  }

  if (!slides.length) {
    return "Could not extract text from PPTX. Try converting to PDF first.";
  }

  let fullText = "";
  slides.forEach((slide, i) => {
    fullText += `\n## Slide ${i + 1}\n\n${slide}\n`;
  });

  return truncateToTokenLimit(fullText.trim());
}
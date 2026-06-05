# MD Converter

<div align="center">

![MD Converter](https://img.shields.io/badge/MD%20Converter-Browser%20Extension-1a73e8?style=for-the-badge&logo=googlechrome&logoColor=white)

**Convert any webpage, PDF, screenshot, image, or Office document into clean Markdown — instantly, right from your browser.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4CAF50?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash%20Lite-1a73e8?style=flat-square&logo=google)](https://aistudio.google.com)
[![Free Tier](https://img.shields.io/badge/API-Free%20Tier-34A853?style=flat-square)](https://aistudio.google.com/apikey)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/Version-1.2.0-blue?style=flat-square)]()

</div>

---

## Overview

**MD Converter** is a Chrome browser extension powered by Google Gemini AI that converts virtually anything on the web into clean, well-structured Markdown. From screenshots and scanned documents to PDFs, Office files, and handwritten notes — MD Converter intelligently analyses the content type and applies the most effective conversion strategy automatically.

No subscriptions. No credit card. Built entirely on Google's free API tier.

---

## Features

### Core Capture Modes

| Feature | Description |
|---|---|
| 📷 **Snap Area** | Draw a selection box on any part of the page and convert just that region |
| 🖼 **Full Screenshot** | Capture the entire visible page and convert it to Markdown |
| 📄 **Page Text** | Extract the readable content from any webpage, stripping ads, nav, and boilerplate |
| 📎 **Upload File** | Upload PDFs, images, Office documents, or text files directly for conversion |

### Deep Image Conversion

The standout feature of MD Converter is its **intelligent image analysis engine**. Rather than using a single generic prompt for every image, the extension automatically detects the image subtype and applies a specialised conversion strategy optimised for that content.

**11 supported image subtypes:**

| Subtype | Detection Trigger | Optimised For |
|---|---|---|
| 🖥 Screenshot | Filename contains `screen`, wide dimensions | Web content, UI, code snippets |
| 📄 Scanned Document | Filename contains `scan`, `ocr` | Physical documents, forms, OCR accuracy |
| ✍️ Handwriting | Filename contains `handwrit`, `note` | Handwritten notes, ambiguity markers |
| 📊 Table / Data | Filename contains `table`, `data` | Structured data → Markdown tables |
| 📈 Chart / Graph | Filename contains `chart`, `graph` | Data extraction, trend description |
| 🔷 Diagram | Filename contains `diagram`, `flow` | Flowcharts, architecture, components |
| 🖼 Slide | Filename contains `slide`, `ppt` | Presentation slides, speaker notes |
| 🧾 Receipt / Invoice | Filename contains `receipt`, `invoice` | Financial documents, line item tables |
| 📖 Document Page | Tall portrait orientation | Books, reports, footnotes |
| 📷 Photo | Square-ish, general imagery | Text extraction, scene description |
| 🏷 Banner | Wide landscape orientation | Headers, taglines, CTAs |

**How detection works:**
1. Filename keyword matching (highest priority)
2. Image dimension and aspect ratio analysis as fallback
3. Resolution heuristics for final determination

Each subtype maps to a dedicated Gemini prompt engineered to extract maximum structure and accuracy from that content category.

### Office File Support

MD Converter processes Office documents **client-side before sending to Gemini**, meaning the raw file bytes never leave your browser unprocessed:

| Format | Parser | What's Preserved |
|---|---|---|
| `.docx` | mammoth.js | Headings, lists, tables, bold/italic, code blocks |
| `.xlsx` / `.xls` | SheetJS | All sheets as Markdown tables with headers |
| `.pptx` | SheetJS zip parser | Slide-by-slide text with `##` headings |

### Output & UX Features

| Feature | Description |
|---|---|
| ✏️ **Preview & Edit** | Edit the Markdown output directly in the sidebar before saving |
| 📝 **Rename Output** | Click the filename in the preview toolbar to rename it inline |
| 📥 **Download `.md`** | Save as a properly named Markdown file |
| 📋 **Copy to Clipboard** | One-click copy for pasting directly into any editor |
| 🔢 **Word & Char Count** | Live counter updates as you edit the output |
| 🔔 **PDF Auto-detect** | Toast notification when a PDF tab opens — one click to convert |
| ⚙️ **Settings Page** | Full options page with API key, model, filename template, theme, and token controls |
| 🌙 **Dark Mode** | Auto-detects system theme or manually selectable |

---

## Installation

### Prerequisites
- Google Chrome (or any Chromium-based browser)
- A free Google Gemini API key — [get one here](https://aistudio.google.com/apikey) (no credit card required)

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/DRAMV/md-converter-extension.git
cd md-converter-extension
```

**2. Install library dependencies**
```bash
mkdir -p libs
curl -L -o libs/mammoth.min.js https://cdn.jsdelivr.net/npm/mammoth/mammoth.browser.min.js
curl -L -o libs/xlsx.min.js https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js
curl -L -o libs/marked.min.js https://cdn.jsdelivr.net/npm/marked/marked.min.js
```

**3. Load in Chrome**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `md-converter-extension` folder
5. The extension icon appears in your toolbar

**4. Add your API key**
1. Click the **MD Converter** icon
2. Paste your Gemini API key
3. Click **Save key** — stored once, persists forever

---

## Usage

### Image Conversion (Deep Mode)

Upload any image via **📎 Upload file** and the extension will:

1. Analyse the filename for subtype hints
2. Fall back to dimension and ratio analysis if no hints found
3. Display the detected subtype: `Detected: Receipt / invoice — converting...`
4. Send the image to Gemini with the optimised prompt for that subtype

**To force a specific subtype**, rename the file before uploading:

```
invoice-001.png     → Receipt / invoice prompt
chart-revenue.png   → Chart / graph prompt
scan-report.jpg     → Scanned document prompt
table-data.png      → Table extraction prompt
diagram-flow.png    → Diagram / flowchart prompt
slide-01.png        → Presentation slide prompt
handwritten-notes.jpg → Handwriting transcription prompt
```

### PDF Auto-detect

When you open any `.pdf` URL in Chrome, a toast notification appears bottom-right asking **"Convert this PDF to Markdown?"** — click **Convert to Markdown** and the sidebar opens with the conversion running automatically.

This can be enabled or disabled under **⚙️ Settings → Capture → PDF Auto-detect**.

### Settings Page

Access via the extension popup → **⚙️ Settings**, or via `chrome://extensions` → MD Converter → **Details** → **Extension options**.

| Setting | Options |
|---|---|
| API Key | Paste, test, and manage your Gemini key |
| AI Model | gemini-2.5-flash-lite / gemini-2.5-flash / gemini-2.0-flash |
| Filename Template | `{date}-{title}`, `{time}-{title}`, custom patterns |
| Theme | Light / Dark / System |
| Default Capture Mode | Area / Full screenshot / Page text / Upload |
| PDF Auto-detect | Enable / Disable toast notification |
| Max Output Tokens | 1K – 65K slider (default 8192) |
| Temperature | 0 (accurate) – 1 (creative) slider |

---

## Project Structure

```
md-converter-extension/
│
├── manifest.json                  # Extension config (Manifest V3)
├── background.js                  # Service worker — API calls, tab capture, downloads
├── content.js                     # Injected into pages — sidebar, toast, area selection
│
├── popup/
│   ├── popup.html                 # Toolbar popup UI
│   ├── popup.js                   # API key management, sidebar toggle, settings link
│   └── popup.css                  # Popup styles
│
├── sidebar/
│   ├── sidebar.html               # Sidebar panel UI
│   ├── sidebar.js                 # All sidebar logic — capture, conversion, preview
│   └── sidebar.css                # Sidebar styles + dark theme variables
│
├── options/
│   ├── options.html               # Full settings page UI
│   ├── options.js                 # Settings logic — save, test key, reset, storage stats
│   └── options.css                # Settings page styles
│
├── toast/
│   ├── toast.html                 # PDF detection toast notification
│   ├── toast.js                   # Auto-dismiss countdown, convert/dismiss handlers
│   └── toast.css                  # Toast animation and styles
│
├── utils/
│   ├── converter.js               # File type detection, image subtype detection, file readers
│   ├── image-analyzer.js          # 11 specialised Gemini prompts per image subtype
│   └── office-converter.js        # Client-side DOCX/XLSX/PPTX parsing (mammoth + SheetJS)
│
├── libs/
│   ├── mammoth.min.js             # DOCX → HTML parser
│   ├── xlsx.min.js                # XLSX/XLS/PPTX parser (SheetJS)
│   └── marked.min.js              # Markdown renderer
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── .github/
    └── workflows/
        └── build.yml              # GitHub Actions — auto-packages extension on push
```

---

## API & Rate Limits

Built on the **Google Gemini API** free tier — no billing required.

| Model | Requests/min | Requests/day | Context Window |
|---|---|---|---|
| `gemini-2.5-flash-lite` ✅ Default | 15 | 1,000 | 1M tokens |
| `gemini-2.5-flash` | 10 | 500 | 1M tokens |
| `gemini-2.0-flash` | 15 | 1,500 | 1M tokens |

Get your free key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key in new project**

---

## Supported File Types

| Category | Formats | Processing |
|---|---|---|
| **Images** | PNG, JPG, JPEG, WEBP, GIF, TIFF, BMP | Deep subtype detection + 11 specialised Gemini prompts |
| **PDF** | PDF | Direct Gemini document API + auto-detect toast |
| **Word** | DOCX | mammoth.js client-side parsing → Gemini cleanup |
| **Spreadsheet** | XLSX, XLS | SheetJS client-side parsing → Markdown tables |
| **Presentation** | PPTX | SheetJS zip extraction → slide-by-slide Markdown |
| **Text** | TXT, MD, CSV, HTML | Direct text extraction |
| **Audio/Video** | MP3, MP4, WAV, OGG, WEBM, M4A | Transcript structuring via Gemini |
| **Max file size** | 20 MB per file | — |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Manifest V3 |
| AI engine | Google Gemini 2.5 Flash Lite |
| Image analysis | Custom heuristic engine (11 subtypes) |
| Office parsing | mammoth.js (DOCX) + SheetJS (XLSX/PPTX) |
| Markdown rendering | marked.js |
| Language | Vanilla JavaScript — no build step required |
| CI/CD | GitHub Actions |

---

## Troubleshooting

**Sidebar won't open**
Navigate to a regular webpage first — the sidebar cannot open on `chrome://` or `chrome-extension://` pages.

**Scripts not loading / functions undefined**
Go to `chrome://extensions` → reload MD Converter → reopen the sidebar. If the issue persists, right-click the sidebar → Inspect → Console and check for red errors.

**API key not saving**
Paste the full key and click **Save key**. Keys from Google AI Studio start with `AQ.` or `AIza` and are stored in `chrome.storage.sync` automatically.

**Quota exceeded error**
Your key was likely created in a restricted project. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key in new project** and use the new key.

**Image subtype not detecting correctly**
Rename the file with a keyword hint before uploading. For example, rename `IMG_001.jpg` to `invoice-001.jpg` to force the receipt/invoice prompt.

**DOCX/XLSX/PPTX conversion fails**
Ensure `libs/mammoth.min.js` and `libs/xlsx.min.js` exist in the `libs/` folder and are listed in `web_accessible_resources` inside `manifest.json`.

---

## Contributing

```bash
# Fork the repo, then clone your fork
git clone https://github.com/YOUR_USERNAME/md-converter-extension.git

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then commit
git add .
git commit -m "feat: describe your change"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

### Roadmap

- [ ] Markdown preview renderer (Raw ↔ Rendered toggle)
- [ ] Conversion history panel (IndexedDB)
- [ ] Keyboard shortcuts (`Alt+Shift+S`, `Alt+Shift+F`, etc.)
- [ ] Right-click context menu integration
- [ ] Batch conversion with ZIP download
- [ ] Multiple AI providers (Groq, Ollama, OpenAI)
- [ ] Google Drive / Notion / Obsidian integration
- [ ] Chrome Web Store publishing
- [ ] Firefox support (Manifest V2)

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using [Google Gemini AI](https://aistudio.google.com) &nbsp;·&nbsp; Free to use &nbsp;·&nbsp; No tracking &nbsp;·&nbsp; No ads

⭐ Star this repo if you find it useful

</div>
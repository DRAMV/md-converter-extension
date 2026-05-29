# MD Converter

<div align="center">

![MD Converter Banner](https://img.shields.io/badge/MD%20Converter-Browser%20Extension-1a73e8?style=for-the-badge&logo=googlechrome&logoColor=white)

**Convert any webpage, PDF, screenshot, or file into clean Markdown — instantly, right from your browser.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4CAF50?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Gemini AI](https://img.shields.io/badge/Powered%20by-Gemini%202.5%20Flash%20Lite-1a73e8?style=flat-square&logo=google)](https://aistudio.google.com)
[![Free Tier](https://img.shields.io/badge/API-Free%20Tier-34A853?style=flat-square)](https://aistudio.google.com/apikey)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## Overview

**MD Converter** is a Chrome browser extension that uses Google's Gemini AI to convert virtually anything on the web into well-structured Markdown files. Whether you're capturing a snippet of a webpage, converting a full PDF, or snapping a specific area of your screen — MD Converter handles it in one click and delivers a clean, downloadable `.md` file.

No subscriptions. No credit card. Built on Google's generous free API tier.

---

## Features

| Feature | Description |
|---|---|
| 📷 **Snap Area** | Draw a selection box on any part of the page and convert just that region |
| 🖼 **Full Screenshot** | Capture the entire visible page as an image and convert it |
| 📄 **Page Text** | Extract the readable content from any webpage (removes ads, nav, boilerplate) |
| 📎 **Upload File** | Upload PDFs, images, or text files directly for conversion |
| ✏️ **Edit Before Saving** | Preview and edit the Markdown output before downloading |
| 📝 **Rename Output** | Click the filename to rename it before saving |
| 📥 **Download `.md`** | Save the result as a properly named Markdown file |
| 📋 **Copy to Clipboard** | One-click copy for pasting directly into your editor |
| 🔢 **Word & Char Count** | Live word and character counter on the output |

---

## Demo

```
Open any webpage or PDF
        ↓
Click the MD Converter icon
        ↓
Choose: Snap Area / Full Screenshot / Page Text / Upload File
        ↓
Gemini AI converts content to clean Markdown
        ↓
Preview → Edit → Download .md or Copy
```

---

## Installation

### Prerequisites
- Google Chrome (or any Chromium-based browser)
- A free Google Gemini API key — [get one here](https://aistudio.google.com/apikey) (no credit card required)

### Steps

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/md-converter-extension.git
cd md-converter-extension
```

**2. Load the extension in Chrome**
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the cloned `md-converter-extension` folder
5. The extension icon will appear in your toolbar

**3. Add your API key**
1. Click the **MD Converter** icon in the toolbar
2. Paste your Gemini API key into the field
3. Click **Save key** — you'll see a green confirmation
4. Done — you only need to do this once

---

## Usage

### Snap Area
1. Navigate to any webpage
2. Open the sidebar via the extension icon
3. Click **📷 Snap area**
4. Click and drag to draw a selection box over any content
5. Release — Gemini converts the captured region to Markdown

### Full Screenshot
1. Click **🖼 Full screenshot**
2. The visible page is captured and sent to Gemini
3. Markdown appears in the preview panel

### Page Text
1. Click **📄 Page text**
2. The extension extracts the main readable content (strips navigation, ads, footers)
3. Gemini restructures it into clean Markdown

### Upload File
1. Click **📎 Upload file**
2. Select a PDF, image (PNG/JPG/WEBP), or text file (TXT/MD/CSV/HTML)
3. Gemini processes and converts it to Markdown

### Save Output
- Click the **filename** in the preview toolbar to rename it
- Click **Download** to save as a `.md` file
- Click **Copy** to copy to clipboard

---

## Project Structure

```
md-converter-extension/
│
├── manifest.json              # Extension config (Manifest V3)
├── background.js              # Service worker — API calls, downloads, tab capture
├── content.js                 # Injected into pages — sidebar, area selection, DOM capture
│
├── popup/
│   ├── popup.html             # Extension toolbar popup UI
│   ├── popup.js               # API key save/load, sidebar toggle
│   └── popup.css              # Popup styles
│
├── sidebar/
│   ├── sidebar.html           # Sidebar panel UI (injected as iframe)
│   ├── sidebar.js             # All sidebar logic — buttons, conversion, preview
│   └── sidebar.css            # Sidebar styles
│
├── utils/
│   └── converter.js           # Shared helpers — file type detection, validation, reading
│
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
└── .github/
    └── workflows/
        └── build.yml          # GitHub Actions — auto-packages extension on push
```

---

## API & Rate Limits

This extension uses the **Google Gemini API** on the free tier — no billing required.

| Model | RPM | RPD | Context Window |
|---|---|---|---|
| `gemini-2.5-flash-lite` | 15 req/min | 1,000 req/day | 1M tokens |

> **Get your free key:** [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → Create API key → Create in new project

---

## Supported File Types

| Type | Formats |
|---|---|
| **Images** | PNG, JPG, JPEG, WEBP, GIF |
| **Documents** | PDF |
| **Text** | TXT, MD, CSV, HTML |
| **Max file size** | 20 MB |

---

## Tech Stack

- **Chrome Extension** — Manifest V3
- **Google Gemini 2.5 Flash Lite** — AI conversion engine
- **Vanilla JavaScript** — no frameworks, no build step
- **GitHub Actions** — automated `.zip` packaging on push

---

## Contributing

Contributions are welcome! Here's how to get started:

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

### Ideas for contributions
- [ ] Firefox support (Manifest V2 variant)
- [ ] Markdown preview renderer (toggle raw ↔ rendered)
- [ ] Conversion history panel (IndexedDB)
- [ ] Batch conversion mode
- [ ] Custom prompt templates per file type
- [ ] Dark mode sidebar

---

## Troubleshooting

**Sidebar won't open**
- Make sure you're on a regular webpage — sidebars can't open on `chrome://` or `edge://` pages
- Go to `chrome://extensions` → reload the extension → try again

**API key not saving**
- Ensure you're pasting the full key and clicking **Save key**
- Key is stored in `chrome.storage.sync` — it persists across sessions automatically

**Quota exceeded error**
- Your key may have been created under a restricted project
- Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → **Create API key in new project**

**Conversion returns empty**
- Try a different capture method (e.g. Page text instead of screenshot)
- Check the browser console for detailed error messages

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with using [Google Gemini AI](https://aistudio.google.com) · Free to use · No tracking · No ads

</div>

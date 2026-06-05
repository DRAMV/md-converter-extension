// ─── Default settings ─────────────────────────────────────────────────────────

const DEFAULTS = {
  apiKey:           "",
  aiModel:          "gemini-2.5-flash-lite",
  filenameTemplate: "{date}-{title}",
  theme:            "light",
  captureMode:      "fullpage",
  pdfDetect:        true,
  maxTokens:        8192,
  temperature:      0.2
};

// ─── Load all settings on page open ──────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const s    = { ...DEFAULTS, ...data };

  // API key
  document.getElementById("apiKey").value = s.apiKey || "";

  // AI model
  document.getElementById("aiModel").value = s.aiModel;

  // Filename template
  document.getElementById("filenameTemplate").value = s.filenameTemplate;
  updateFilenamePreview(s.filenameTemplate);

  // Theme
  const themeRadio = document.querySelector(`input[name="theme"][value="${s.theme}"]`);
  if (themeRadio) themeRadio.checked = true;

  // Capture mode
  const captureRadio = document.querySelector(`input[name="captureMode"][value="${s.captureMode}"]`);
  if (captureRadio) captureRadio.checked = true;

  // PDF detect toggle
  document.getElementById("pdfDetect").checked = s.pdfDetect;

  // Max tokens slider
  document.getElementById("maxTokens").value   = s.maxTokens;
  document.getElementById("tokenValue").textContent = s.maxTokens.toLocaleString();

  // Temperature slider
  document.getElementById("temperature").value  = s.temperature;
  document.getElementById("tempValue").textContent = s.temperature;

  // Storage usage
  loadStorageUsage();
});

// ─── Nav section switching ────────────────────────────────────────────────────

const sectionTitles = {
  api:      "API Key",
  output:   "Output",
  capture:  "Capture",
  advanced: "Advanced",
  data:     "Data"
};

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = link.dataset.section;

    // Update active nav link
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    // Show correct section
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.getElementById("section-" + target).classList.add("active");

    // Update page title
    document.getElementById("pageTitle").textContent = sectionTitles[target] || target;
  });
});

// ─── Save all settings ────────────────────────────────────────────────────────

document.getElementById("btnSaveAll").addEventListener("click", saveAll);

async function saveAll() {
  const settings = {
    aiModel:          document.getElementById("aiModel").value,
    filenameTemplate: document.getElementById("filenameTemplate").value.trim() || DEFAULTS.filenameTemplate,
    theme:            document.querySelector('input[name="theme"]:checked')?.value       || "light",
    captureMode:      document.querySelector('input[name="captureMode"]:checked')?.value || "fullpage",
    pdfDetect:        document.getElementById("pdfDetect").checked,
    maxTokens:        parseInt(document.getElementById("maxTokens").value),
    temperature:      parseFloat(document.getElementById("temperature").value)
  };

  // Save API key separately (only if not empty)
  const keyInput = document.getElementById("apiKey").value.trim();
  if (keyInput) {
    settings.apiKey = keyInput;
  }

  await chrome.storage.sync.set(settings);
  showSaveStatus("✓ Saved");
}

function showSaveStatus(msg) {
  const el = document.getElementById("saveStatus");
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 2500);
}

// ─── Toggle API key visibility ────────────────────────────────────────────────

document.getElementById("btnToggleKey").addEventListener("click", () => {
  const input = document.getElementById("apiKey");
  const btn   = document.getElementById("btnToggleKey");
  if (input.type === "password") {
    input.type   = "text";
    btn.textContent = "Hide";
  } else {
    input.type   = "password";
    btn.textContent = "Show";
  }
});

// ─── Test API key ─────────────────────────────────────────────────────────────

document.getElementById("btnTestKey").addEventListener("click", async () => {
  const key    = document.getElementById("apiKey").value.trim();
  const status = document.getElementById("apiStatus");

  if (!key) {
    showApiStatus("Please enter an API key first.", "error");
    return;
  }

  showApiStatus("Testing key...", "loading");

  try {
    const model = document.getElementById("aiModel").value;
    const res   = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say OK" }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      }
    );

    if (res.ok) {
      showApiStatus("✓ Key is valid and working.", "success");
      // Auto-save valid key
      await chrome.storage.sync.set({ apiKey: key });
    } else {
      const err = await res.json();
      showApiStatus("✗ " + (err.error?.message || "Invalid key"), "error");
    }
  } catch (e) {
    showApiStatus("✗ Network error: " + e.message, "error");
  }
});

function showApiStatus(msg, type) {
  const el = document.getElementById("apiStatus");
  el.textContent   = msg;
  el.className     = "api-status " + type;
  el.style.display = "block";
  if (type !== "loading") {
    setTimeout(() => { el.style.display = "none"; }, 4000);
  }
}

// ─── Clear API key ────────────────────────────────────────────────────────────

document.getElementById("btnClearKey").addEventListener("click", async () => {
  if (!confirm("Remove your API key?")) return;
  await chrome.storage.sync.remove("apiKey");
  document.getElementById("apiKey").value = "";
  showApiStatus("API key removed.", "success");
});

// ─── Filename template preview ────────────────────────────────────────────────

document.getElementById("filenameTemplate").addEventListener("input", (e) => {
  updateFilenamePreview(e.target.value);
});

function updateFilenamePreview(template) {
  const now    = new Date();
  const date   = now.toISOString().slice(0, 10);
  const time   = now.getHours().toString().padStart(2, "0") + "-" +
                 now.getMinutes().toString().padStart(2, "0");
  const title  = "my-page-title";

  const result = (template || "{date}-{title}")
    .replace(/\{date\}/g,  date)
    .replace(/\{time\}/g,  time)
    .replace(/\{title\}/g, title)
    .replace(/[^a-zA-Z0-9\-_.]/g, "-")
    .toLowerCase();

  document.getElementById("filenamePreview").textContent = result + ".md";
}

// ─── Token slider ─────────────────────────────────────────────────────────────

document.getElementById("maxTokens").addEventListener("input", (e) => {
  document.getElementById("tokenValue").textContent =
    parseInt(e.target.value).toLocaleString();
});

// ─── Temperature slider ───────────────────────────────────────────────────────

document.getElementById("temperature").addEventListener("input", (e) => {
  document.getElementById("tempValue").textContent =
    parseFloat(e.target.value).toFixed(1);
});

// ─── Reset settings ───────────────────────────────────────────────────────────

document.getElementById("btnResetSettings").addEventListener("click", async () => {
  if (!confirm("Reset all settings to defaults? Your API key will not be affected.")) return;

  const { apiKey } = await chrome.storage.sync.get("apiKey");

  await chrome.storage.sync.clear();

  // Restore API key and save defaults (without apiKey in defaults)
  const resetData = { ...DEFAULTS };
  delete resetData.apiKey;
  if (apiKey) resetData.apiKey = apiKey;

  await chrome.storage.sync.set(resetData);

  // Reload page to reflect reset
  location.reload();
});

// ─── Clear all data ───────────────────────────────────────────────────────────

document.getElementById("btnClearAll").addEventListener("click", async () => {
  if (!confirm("This will permanently delete ALL data including your API key. Are you sure?")) return;
  if (!confirm("Last warning — this cannot be undone. Continue?")) return;

  await chrome.storage.sync.clear();
  location.reload();
});

// ─── Storage usage ────────────────────────────────────────────────────────────

async function loadStorageUsage() {
  try {
    // Chrome sync storage quota is 102400 bytes
    const QUOTA   = chrome.storage.sync.QUOTA_BYTES || 102400;
    const data    = await chrome.storage.sync.get(null);
    const used    = JSON.stringify(data).length;
    const pct     = Math.min(100, Math.round((used / QUOTA) * 100));
    const usedKB  = (used / 1024).toFixed(1);
    const totalKB = (QUOTA / 1024).toFixed(0);

    document.getElementById("storageFill").style.width  = pct + "%";
    document.getElementById("storageLabel").textContent =
      `${usedKB} KB / ${totalKB} KB (${pct}%)`;
  } catch (e) {
    document.getElementById("storageLabel").textContent = "Unable to calculate";
  }
}
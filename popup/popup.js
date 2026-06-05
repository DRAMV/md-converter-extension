document.addEventListener("DOMContentLoaded", async () => {
  const keyInput = document.getElementById("apiKey");
  const status   = document.getElementById("status");

  // Load saved key on open
  try {
    const saved = await chrome.runtime.sendMessage({ type: "GET_API_KEY" });
    if (saved) keyInput.value = saved;
  } catch (e) {
    console.error("Could not load saved key:", e);
  }

  // Save key
  document.getElementById("save").addEventListener("click", async () => {
    const key = keyInput.value.trim();
    if (!key) {
      showStatus("Please enter an API key.", "error");
      return;
    }
    try {
      await chrome.storage.sync.set({ apiKey: key });
      showStatus("Key saved successfully!", "success");
    } catch (e) {
      showStatus("Failed to save: " + e.message, "error");
    }
  });

  // Open sidebar
  document.getElementById("openSidebar").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab || !tab.id) {
        showStatus("No active tab found.", "error");
        return;
      }

      if (
        !tab.url ||
        tab.url.startsWith("chrome://") ||
        tab.url.startsWith("edge://") ||
        tab.url.startsWith("chrome-extension://")
      ) {
        showStatus("Can't open on this page. Navigate to a website first.", "error");
        return;
      }

      // Inject content script fresh
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ["content.js"]
      });

      // Wait for script to initialise
      await new Promise(res => setTimeout(res, 300));

      // Send toggle
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_SIDEBAR" });
      window.close();

    } catch (e) {
      console.error("Sidebar open error:", e);
      showStatus("Error: " + e.message, "error");
    }
  });

  // Open settings page
  document.getElementById("openSettings").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
    window.close();
  });

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className   = "status " + type;
    setTimeout(() => {
      status.textContent = "";
      status.className   = "status";
    }, 4000);
  }
});
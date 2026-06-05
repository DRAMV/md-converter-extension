chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLIPBOARD_WRITE") {
    navigator.clipboard.writeText(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
});
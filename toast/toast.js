var AUTO_DISMISS_MS = 8000;
var progressBar     = document.getElementById("progressBar");
var pdfName         = document.getElementById("pdfName");
var toast           = document.getElementById("toast");
var timer           = null;

// ─── Receive page info from content script ────────────────────────────────────

window.addEventListener("message", function (e) {
  if (!e.data || !e.data.type) return;

  if (e.data.type === "PDF_INFO") {
    // Show the PDF filename
    var name = e.data.filename || e.data.url || "document.pdf";
    // Extract just the filename from URL if needed
    if (name.includes("/")) {
      name = name.split("/").pop().split("?")[0];
    }
    pdfName.textContent = decodeURIComponent(name);

    // Start auto-dismiss countdown
    startCountdown();
  }
});

// ─── Button handlers ──────────────────────────────────────────────────────────

document.getElementById("btnConvert").addEventListener("click", function () {
  clearTimeout(timer);
  // Tell content script to start conversion
  window.parent.postMessage({ type: "PDF_CONVERT" }, "*");
  hideToast();
});

document.getElementById("btnDismiss").addEventListener("click", function () {
  dismiss();
});

document.getElementById("btnDismissAlt").addEventListener("click", function () {
  dismiss();
});

function dismiss() {
  clearTimeout(timer);
  window.parent.postMessage({ type: "PDF_DISMISS" }, "*");
  hideToast();
}

// ─── Auto dismiss with progress bar ──────────────────────────────────────────

function startCountdown() {
  // Animate progress bar shrinking to 0
  // Use requestAnimationFrame for smooth animation
  var start = null;

  function step(timestamp) {
    if (!start) start = timestamp;
    var elapsed  = timestamp - start;
    var fraction = Math.max(0, 1 - elapsed / AUTO_DISMISS_MS);

    progressBar.style.width = (fraction * 100) + "%";

    if (elapsed < AUTO_DISMISS_MS) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);

  timer = setTimeout(function () {
    dismiss();
  }, AUTO_DISMISS_MS);
}

function hideToast() {
  toast.classList.add("hiding");
  setTimeout(function () {
    window.parent.postMessage({ type: "TOAST_HIDDEN" }, "*");
  }, 250);
}

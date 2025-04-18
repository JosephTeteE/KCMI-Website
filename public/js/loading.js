// Wait for everything to load
window.addEventListener("load", function () {
  setTimeout(function () {
    document.body.classList.add("loaded");
  }, 8000); // 8 seconds total (matches CSS animation timing)
});

// Fallback in case load event doesn't fire (which sometimes happens)
setTimeout(function () {
  document.body.classList.add("loaded");
}, 10000); // 10 seconds absolute maximum

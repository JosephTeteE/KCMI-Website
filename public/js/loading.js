// Wait for everything to load
window.addEventListener("load", function () {
  // Show loading screen for minimum 4 seconds (matches longest animation)
  setTimeout(function () {
    document.body.classList.add("loaded");
  }, 4000); // 4 seconds total (matches CSS animation timing)
});

// Fallback in case load event doesn't fire
setTimeout(function () {
  // Only add if not already loaded
  if (!document.body.classList.contains("loaded")) {
    document.body.classList.add("loaded");
  }
}, 6000); // 6 seconds absolute maximum

document.addEventListener("DOMContentLoaded", function () {
  // Show loading screen immediately
  const loadingOverlay = document.getElementById("loading-overlay");
  const mainContent = document.getElementById("main-content");

  // Make sure main content is hidden initially
  if (mainContent) mainContent.style.display = "none";

  // Set timeout to hide loading screen after 6 seconds
  setTimeout(function () {
    document.body.classList.add("loaded");
    if (mainContent) mainContent.style.display = "block";

    // Remove loading overlay from DOM completely
    setTimeout(function () {
      if (loadingOverlay && loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }, 500); // slight delay for safety
  }, 6000); // 6 second delay
});

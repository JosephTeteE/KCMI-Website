// public/js/gapi-loader.js

// Simple Google API loader
function loadGoogleAPI() {
  return new Promise((resolve) => {
    if (window.gapi) return resolve();

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = resolve;
    script.onerror = resolve; // Continue even if Google API fails
    document.head.appendChild(script);
  });
}

// Start loading when this script loads
loadGoogleAPI();

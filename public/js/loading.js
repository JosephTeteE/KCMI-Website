// ==========================================================================
// === Loading Animation Logic ===
// ==========================================================================

const loadingOverlay = document.getElementById("loading-overlay");
const mainContent = document.getElementById("main-content");
const churchNameElement = document.getElementById("church-name");
const akaTextElement = document.getElementById("aka-text");
const visionTextElement = document.getElementById("vision-text");

const MIN_LOADING_DISPLAY_TIME = 3500; // 3.5 seconds total animation time

function typeWriter(element, text, speed) {
  return new Promise((resolve) => {
    let i = 0;
    element.textContent = "";

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        resolve();
      }
    }

    type();
  });
}

async function animateLoading() {
  // Sequence of typing animations
  await typeWriter(
    churchNameElement,
    "Kingdom Covenant Ministries International",
    120
  );
  akaTextElement.textContent = "AKA Rehoboth Christian Center";
  await new Promise((resolve) => setTimeout(resolve, 800)); // Brief timer for emphasis
  await typeWriter(
    visionTextElement,
    "Raising Kings, to build the Kingdom.",
    100
  );
}

function showLoadingScreen() {
  // Always show main content immediately (but hidden by overlay initially)
  mainContent.style.display = "block";
  mainContent.style.opacity = "0";

  // Check if this is an initial load
  const isInitialLoad =
    performance.navigation.type === performance.navigation.TYPE_RELOAD ||
    performance.navigation.type === performance.navigation.TYPE_NAVIGATE;

  if (isInitialLoad) {
    loadingOverlay.style.display = "flex";

    const startTime = Date.now();

    animateLoading().then(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_LOADING_DISPLAY_TIME - elapsed);
      setTimeout(hideLoadingScreen, remaining);
    });
  } else {
    hideLoadingScreen();
  }
}

function hideLoadingScreen() {
  document.body.classList.add("loaded");
  mainContent.style.opacity = "1";
}

// Initialize
if (document.readyState === "complete") {
  showLoadingScreen();
} else {
  window.addEventListener("load", showLoadingScreen);
}

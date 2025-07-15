// public/js/promos.js
// This script handles the loading and rendering of promotional events from a Google Sheet.
// It includes caching, error handling, responsive design features, and video modal functionality.

// Constants
const PROMO_SHEET_ID = "1RCk_BhG_uv791dIVUmLHxhW4Ok0hPfvXLNp3QFUiaQo"; // Google Sheet ID for fetching events
const CACHE_KEY = "kcmi_events_cache"; // Local storage key for caching events
const CACHE_TTL = 30 * 60 * 1000; // Cache time-to-live (30 minutes)

// Main loading function
async function loadPromos() {
  try {
    const cachedData = getCachedPromos(); // Check if cached data exists
    if (cachedData) {
      renderEvents(cachedData); // Render cached events
      setTimeout(fetchAndCachePromos, 1000); // Refresh data in the background
      return;
    }
    await fetchAndCachePromos(); // Fetch and cache promos if no cached data
  } catch (error) {
    console.error("Promos loading error:", error);
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData); // Fallback to cached data on error
    } else {
      showErrorUI(); // Show error UI if no cached data is available
    }
  }
}

// Fetch events from the backend and cache them
async function fetchAndCachePromos() {
  const response = await fetch(
    `https://kcmi-backend.onrender.com/api/sheets-events?id=${PROMO_SHEET_ID}`
  );
  if (!response.ok) throw new Error("Network error");
  const events = await response.json();
  cachePromos(events); // Cache the fetched events
  renderEvents(events); // Render the fetched events
}

// Retrieve cached events from local storage
function getCachedPromos() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) return data; // Check if cache is still valid
  } catch (e) {
    console.warn("Cache parse error:", e);
  }
  return null;
}

// Cache events in local storage
function cachePromos(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  );
}

// Render events in the UI
function renderEvents(events) {
  const container = document.getElementById("promos-container");
  const gridContainer = container.querySelector(".promos-grid");

  // Filter out old events based on current date
  const today = new Date();
  const upcomingEvents = events.filter((event) => {
    const endDate = event.endDate
      ? new Date(event.endDate)
      : new Date(event.date);
    // Only include events that are today or in the future
    return endDate.setHours(0, 0, 0, 0) >= today.setHours(0, 0, 0, 0);
  });

  // Handle empty list (all filtered out or none in sheet)
  if (!upcomingEvents || upcomingEvents.length === 0) {
    gridContainer.innerHTML = noEventsHTML();
    document.querySelector(".carousel-nav").style.display = "none";
    return;
  }

  // Adjust layout for single/multiple
  container.classList.toggle("single-event", upcomingEvents.length === 1);
  document.querySelector(".carousel-nav").style.display =
    upcomingEvents.length > 1 ? "flex" : "none";

  // Render all valid cards
  gridContainer.innerHTML = upcomingEvents
    .map((event) => createEventCard(event))
    .join("");

  if (upcomingEvents.length > 1) initCarousel();
}

// HTML for "no events" message
function noEventsHTML() {
  return `
    <div class="col-12 text-center">
      <p class="text-muted">No upcoming events scheduled.</p>
      <p>Check back soon for updates!</p>
    </div>`;
}

// Updated createEventCard function
function createEventCard(event) {
  const mediaHTML = createMediaHTML(event);
  const dateHTML = createDateHTML(event);
  const timeHTML = createTimeHTML(event);
  const contactHTML = createContactHTML(event);

  // Determine action buttons based on event type
  const actionButtonsHTML = getActionButtons(event);

  return `
    <div class="promo-card">
      ${mediaHTML}
      <div class="promo-content">
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        ${
          event.description
            ? `<p class="event-description">${escapeHtml(
                event.description
              )}</p>`
            : ""
        }
        <div class="event-details">
          ${dateHTML}
          ${timeHTML}
          ${
            event.location
              ? `<div class="event-location">
                  <i class="fas fa-map-marker-alt"></i>
                  <span>${escapeHtml(event.location)}</span>
                </div>`
              : ""
          }
          ${contactHTML}
        </div>
        <div class="text-center mt-2">
          ${actionButtonsHTML}
        </div>
      </div>
    </div>
  `;
}

// New getActionButtons function
function getActionButtons(event) {
  if (event.type === "youth-camp") {
    return `
      <a href="https://camp.kcmi-rcc.org" class="btn btn-primary" target="_blank">
        Register Now!
      </a>
    `;
  }

  if (event.type === "youtube-video" || event.type === "drive-video") {
    return `
      <div class="d-flex gap-2 justify-content-center flex-wrap">
        <button class="btn btn-primary watch-video-btn" 
                data-video-id="${event.fileId}" 
                data-video-type="${event.type}">
          Watch Video
        </button>
        ${
          event.type === "youtube-video"
            ? `
          <a href="https://www.youtube.com/watch?v=${event.fileId}" 
             class="btn btn-outline-primary" 
             target="_blank">
            Open in YouTube
          </a>
        `
            : ""
        }
      </div>
    `;
  }

  // Default button for other types
  return `
    <a href="${getFileUrl(event)}" class="btn btn-primary" target="_blank">
      ${getActionText(event.type)}
    </a>
  `;
}

// Updated createMediaHTML function
function createMediaHTML(event) {
  // Handle YouTube videos
  if (event.type === "youtube-video") {
    const thumbnail = `https://img.youtube.com/vi/${event.fileId}/hqdefault.jpg`;
    return `
      <div class="video-thumbnail-container">
        <img src="${thumbnail}" 
             alt="${escapeHtml(event.title)}" 
             loading="lazy"
             class="video-thumbnail">
        <div class="play-button-overlay" 
             data-video-id="${event.fileId}"
             data-video-type="youtube-video">
          <i class="fas fa-play"></i>
        </div>
      </div>
    `;
  }

  // Handle Google Drive videos
  if (event.type === "drive-video") {
    const thumbnail = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w500`;
    return `
      <div class="video-thumbnail-container">
        <img src="${thumbnail}" 
             alt="${escapeHtml(event.title)}" 
             loading="lazy"
             class="video-thumbnail">
        <div class="play-button-overlay" 
             data-video-id="${event.fileId}"
             data-video-type="drive-video">
          <i class="fas fa-play"></i>
        </div>
      </div>
    `;
  }

  // Handle images and other types
  const url = getFileUrl(event);
  const thumbnail = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w500`;

  if (event.type === "video") {
    return `
      <div class="video-container">
        <iframe src="${url}" frameborder="0" allowfullscreen></iframe>
      </div>
    `;
  }

  return `
    <a href="${url}" target="_blank" rel="noopener noreferrer">
      <img src="${thumbnail}" alt="${escapeHtml(event.title)}" loading="lazy">
    </a>
  `;
}

// Create date section
function createDateHTML(event) {
  if (!event.date) return "";
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : start;
  const isSameDay = start.toDateString() === end.toDateString();

  if (!event.endDate || isSameDay) {
    return `
      <div class="promo-date">
        <i class="fas fa-calendar-alt"></i>
        ${start.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    `;
  }

  return `
    <div class="promo-date">
      <i class="fas fa-calendar-alt"></i>
      ${start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })} - 
      ${end.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}
    </div>
  `;
}

// Create time section
function createTimeHTML(event) {
  if (!event.times) return "";

  if (event.times.allday) {
    return `
      <div class="event-time">
        <i class="fas fa-clock"></i>
        <span>All Day Event</span>
      </div>
    `;
  }

  const timeSlots = [];
  if (event.times.morning) timeSlots.push(`Morning: ${event.times.morning}`);
  if (event.times.afternoon)
    timeSlots.push(`Afternoon: ${event.times.afternoon}`);
  if (event.times.evening) timeSlots.push(`Evening: ${event.times.evening}`);

  if (timeSlots.length === 0) return "";

  if (timeSlots.length === 1) {
    return `
      <div class="event-time">
        <i class="fas fa-clock"></i>
        <span>${timeSlots[0].split(": ")[1]}</span>
      </div>
    `;
  }

  return `
    <div class="event-times">
      <i class="fas fa-clock"></i>
      <div class="time-slots">
        ${timeSlots
          .map(
            (slot) => `
          <div class="time-slot">
            <span class="session-name">${slot.split(":")[0]}:</span>
            <span class="session-time">${slot.split(": ")[1]}</span>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// Create contact section
function createContactHTML(event) {
  if (!event.contact?.number) return "";

  return `
    <div class="event-contact">
      <i class="fas fa-phone"></i>
      <a href="tel:${event.contact.number.replace(/\D/g, "")}">
        ${formatPhoneNumber(event.contact.number)}
      </a>
      ${
        event.contact.instructions
          ? `<span class="contact-instructions">
              (${escapeHtml(event.contact.instructions)})
            </span>`
          : ""
      }
    </div>
  `;
}

// Utility functions for URLs, formatting, and escaping HTML
function getFileUrl(event) {
  if (event.type === "youth-camp") {
    return "https://camp.kcmi-rcc.org";
  }
  if (event.type === "youtube-video") {
    return `https://www.youtube.com/watch?v=${event.fileId}`;
  }
  if (event.type === "drive-video") {
    return `https://drive.google.com/file/d/${event.fileId}/view`;
  }
  if (event.type === "video") {
    return `https://drive.google.com/file/d/${event.fileId}/preview`;
  }
  return `https://drive.google.com/file/d/${event.fileId}/view`;
}

function getActionText(type) {
  switch (type) {
    case "video":
    case "youtube-video":
    case "drive-video":
      return "Watch Video";
    case "image":
      return "View Image";
    case "youth-camp":
      return "Register Now!";
    default:
      return "View Details";
  }
}

function formatPhoneNumber(number) {
  if (!number) return "";
  const cleaned = number.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  return number;
}

function escapeHtml(text) {
  if (typeof text !== "string") return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Show error UI when events fail to load
function showErrorUI() {
  const container = document.getElementById("promos-container");
  container.innerHTML = `
    <div class="col-12 text-center">
      <p class="text-danger">We're having trouble loading events.</p>
      <p>Please try again later.</p>
    </div>`;
}

// Initialize carousel navigation for multiple events
function initCarousel() {
  const promosGrid = document.querySelector(".promos-grid");
  const prevBtn = document.getElementById("prevPromo");
  const nextBtn = document.getElementById("nextPromo");

  if (!promosGrid || !prevBtn || !nextBtn) return;

  let currentIndex = 0;
  const promoCards = document.querySelectorAll(".promo-card");
  if (promoCards.length <= 1) return;

  // Calculate how many cards are visible based on screen size
  function getVisibleCards() {
    if (window.innerWidth < 576) return 1;
    if (window.innerWidth < 768) return 2;
    return 3;
  }

  // Update the carousel position and button states
  function updateCarousel() {
    const visibleCards = getVisibleCards();
    const cardWidth = promoCards[0].offsetWidth + 16; // card width + gap
    promosGrid.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= promoCards.length - visibleCards;
  }

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  nextBtn.addEventListener("click", () => {
    const visibleCards = getVisibleCards();
    if (currentIndex < promoCards.length - visibleCards) {
      currentIndex++;
      updateCarousel();
    }
  });

  // Recalculate on resize
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateCarousel, 200);
  });

  updateCarousel(); // Initial setup
}

// Setup video modal functionality
function setupVideoModal() {
  const videoModalEl = document.getElementById("videoModal");
  if (!videoModalEl) return;

  const videoModal = new bootstrap.Modal(videoModalEl);
  const videoModalFrame = document.getElementById("videoModalFrame");
  const videoModalTitle = document.getElementById("videoModalTitle");

  document.addEventListener("click", function (e) {
    const target = e.target;
    // Handle watch video button clicks
    const watchBtn = target.closest(".watch-video-btn");
    if (watchBtn) {
      e.preventDefault();
      const videoId = watchBtn.dataset.videoId;
      const videoType = watchBtn.dataset.videoType;
      const title = watchBtn
        .closest(".promo-card")
        .querySelector(".event-title").textContent;
      playVideo(videoId, videoType, title);
    }

    // Handle play button overlay clicks
    const playOverlay = target.closest(".play-button-overlay");
    if (playOverlay) {
      e.preventDefault();
      const videoId = playOverlay.dataset.videoId;
      const videoType = playOverlay.dataset.videoType;
      const title = playOverlay
        .closest(".promo-card")
        .querySelector(".event-title").textContent;
      playVideo(videoId, videoType, title);
    }
  });

  function playVideo(videoId, videoType, title) {
    if (!videoModalFrame || !videoModalTitle) return;

    videoModalTitle.textContent = title || "Video";

    if (videoType === "youtube-video") {
      videoModalFrame.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    } else if (videoType === "drive-video") {
      videoModalFrame.src = `https://drive.google.com/file/d/${videoId}/preview`;
    }

    videoModal.show();
  }

  // Reset iframe when modal is closed to stop video playback
  videoModalEl.addEventListener("hidden.bs.modal", function () {
    if (videoModalFrame) {
      videoModalFrame.src = "";
    }
  });
}

// Initialize the scripts when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos();
    setupVideoModal();
  }
});

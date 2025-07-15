// public/js/promos.js
// Handles loading, caching, and displaying promotional events from a Google Sheet
// This script fetches event data from a Google Sheet, caches it, and displays it in a responsive grid.
// It also handles video playback in a modal and provides a carousel for multiple events.

// ======================
// CONSTANTS & CONFIG
// ======================
const PROMO_SHEET_ID = "1RCk_BhG_uv791dIVUmLHxhW4Ok0hPfvXLNp3QFUiaQo"; // Google Sheet ID
const CACHE_KEY = "kcmi_events_cache"; // LocalStorage key for cached data
const CACHE_TTL = 30 * 60 * 1000; // Cache time-to-live (30 minutes)

// ======================
// CORE DATA FUNCTIONS
// ======================

/**
 * Main function to load promotional events
 * Checks cache first, then fetches fresh data if needed
 */
async function loadPromos() {
  try {
    // Try to get cached data first for instant load
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(transformData(cachedData));
      // Fetch fresh data in background for next time
      setTimeout(fetchAndCachePromos, 1000);
      return;
    }
    // No cache available, fetch fresh data
    await fetchAndCachePromos();
  } catch (error) {
    console.error("Promos loading error:", error);
    // Fallback to cache if available, even if stale
    const cachedData = getCachedPromos();
    if (cachedData) renderEvents(transformData(cachedData));
    else showErrorUI(); // Show error if no data available
  }
}

/**
 * Fetches event data from backend API and caches it
 */
async function fetchAndCachePromos() {
  const response = await fetch(
    `https://kcmi-backend.onrender.com/api/sheets-events?id=${PROMO_SHEET_ID}`
  );
  if (!response.ok) throw new Error("Network error while fetching promos.");
  const rawData = await response.json();
  // Store in cache with timestamp
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data: rawData, timestamp: Date.now() })
  );
  renderEvents(transformData(rawData));
}

/**
 * Retrieves cached event data if valid
 * @returns {Array|null} Cached data or null if invalid/expired
 */
function getCachedPromos() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    // Return data only if within TTL
    if (Date.now() - timestamp < CACHE_TTL) return data;
  } catch (e) {
    console.warn("Cache parse error:", e);
  }
  return null;
}

// ======================
// DATA TRANSFORMATION
// ======================

/**
 * Transforms raw sheet data into structured event objects
 * @param {Array} rawData - Raw data from Google Sheet
 * @returns {Array} Structured event objects
 */
function transformData(rawData) {
  return rawData.map((row) => {
    // Extract video ID and source type from media link
    const { id, source } = extractMediaInfo(row["Media Link"] || "");

    // Process time information
    const times = {};
    if (row["All Day"] === "TRUE" || row["All Day"] === true)
      times.allday = true;
    if (row["Morning Time"]) times.morning = row["Morning Time"];
    if (row["Afternoon Time"]) times.afternoon = row["Afternoon Time"];
    if (row["Evening Time"]) times.evening = row["Evening Time"];

    // Process contact information
    const contact = {};
    if (row["Contact Details"]) contact.details = row["Contact Details"];
    if (row["Contact Instructions"])
      contact.instructions = row["Contact Instructions"];

    return {
      title: row["Event Title"],
      type: row["Event Type"], // Video, Image, PDF
      fileId: id,
      videoSource: source, // 'youtube' or 'drive'
      description: row["Description"],
      date: row["Start Date"],
      endDate: row["End Date"],
      location: row["Location"],
      notes: row["Notes"],
      buttonText: row["Button Text"],
      buttonLink: row["Button Link"],
      times: Object.keys(times).length > 0 ? times : null,
      contact: Object.keys(contact).length > 0 ? contact : null,
    };
  });
}

/**
 * Extracts media ID and source from URL
 * @param {string} url - Media URL
 * @returns {Object} Contains id and source (youtube/drive)
 */
function extractMediaInfo(url) {
  if (!url) return { id: null, source: null };

  // YouTube URL patterns
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  // Google Drive URL patterns
  const driveRegex = /drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/;

  const youtubeMatch = url.match(youtubeRegex);
  if (youtubeMatch) return { id: youtubeMatch[1], source: "youtube" };

  const driveMatch = url.match(driveRegex);
  if (driveMatch) return { id: driveMatch[1], source: "drive" };

  // Fallback for just pasting an ID
  return { id: url, source: "drive" };
}

// ======================
// UI RENDERING
// ======================

/**
 * Renders events in the UI
 * @param {Array} events - Array of event objects
 */
function renderEvents(events) {
  const container = document.getElementById("promos-container");
  const gridContainer = container.querySelector(".promos-grid");
  const today = new Date();

  // Filter out past events
  const upcomingEvents = events.filter((event) => {
    if (!event.date) return false;
    const endDate = event.endDate
      ? new Date(event.endDate)
      : new Date(event.date);
    return endDate.setHours(0, 0, 0, 0) >= today.setHours(0, 0, 0, 0);
  });

  // Handle no events case
  if (upcomingEvents.length === 0) {
    gridContainer.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No upcoming events scheduled. Check back soon!</p></div>`;
    document.querySelector(".carousel-nav").style.display = "none";
    return;
  }

  // Adjust UI based on number of events
  container.classList.toggle("single-event", upcomingEvents.length === 1);
  document.querySelector(".carousel-nav").style.display =
    upcomingEvents.length > 1 ? "flex" : "none";

  // Create and insert event cards
  gridContainer.innerHTML = upcomingEvents.map(createEventCard).join("");

  // Initialize carousel if multiple events
  if (upcomingEvents.length > 1) initCarousel();
}

/**
 * Creates HTML for an event card
 * @param {Object} event - Event data
 * @returns {string} HTML string for the card
 */
function createEventCard(event) {
  return `
    <div class="promo-card">
      ${createMediaHTML(event)}
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
          ${createDateHTML(event)}
          ${createTimeHTML(event)}
          ${
            event.location
              ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(
                  event.location
                )}</span></div>`
              : ""
          }
          ${createContactHTML(event)}
        </div>
        <div class="text-center mt-2">${getActionButtons(event)}</div>
        ${
          event.notes
            ? `<p class="event-notes small text-muted mt-3">${escapeHtml(
                event.notes
              )}</p>`
            : ""
        }
      </div>
    </div>`;
}

/**
 * Generates action buttons based on event type
 * @param {Object} event - Event data
 * @returns {string} HTML for buttons
 */
function getActionButtons(event) {
  let buttonsHTML = "";

  // Video events get a play button
  if (event.type === "Video") {
    buttonsHTML += `
      <button class="btn btn-primary watch-video-btn" data-video-id="${event.fileId}" data-video-source="${event.videoSource}">
        <i class="fas fa-play me-2"></i>Watch Promo
      </button>`;
  }

  // Custom button if provided
  if (event.buttonLink && event.buttonText) {
    buttonsHTML += `
      <a href="${
        event.buttonLink
      }" class="btn btn-outline-primary" target="_blank" rel="noopener">
        ${escapeHtml(event.buttonText)}
      </a>`;
  }

  // Default view button for non-video media
  if (buttonsHTML === "" && event.fileId) {
    buttonsHTML = `<a href="https://drive.google.com/file/d/${
      event.fileId
    }/view" class="btn btn-primary" target="_blank" rel="noopener">View ${escapeHtml(
      event.type
    )}</a>`;
  }

  return `<div class="d-flex gap-2 justify-content-center flex-wrap">${buttonsHTML}</div>`;
}

/**
 * Creates HTML for event media (video/image)
 * @param {Object} event - Event data
 * @returns {string} HTML for media element
 */
function createMediaHTML(event) {
  // Handle video thumbnails
  if (event.type === "Video" && event.fileId) {
    const thumbnail =
      event.videoSource === "youtube"
        ? `https://img.youtube.com/vi/${event.fileId}/hqdefault.jpg`
        : `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w500`;
    return `<div class="video-thumbnail-container play-button-overlay" data-video-id="${
      event.fileId
    }" data-video-source="${
      event.videoSource
    }"><img src="${thumbnail}" alt="${escapeHtml(
      event.title
    )}" loading="lazy" class="video-thumbnail"><i class="fas fa-play"></i></div>`;
  }

  // Handle images and PDFs
  if (event.type === "Image" || event.type === "PDF") {
    const link = `https://drive.google.com/file/d/${event.fileId}/view`;
    const thumbnail = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000`;
    return `<a href="${link}" target="_blank" rel="noopener"><img src="${thumbnail}" alt="${escapeHtml(
      event.title
    )}" loading="lazy"></a>`;
  }

  return "";
}

// ======================
// DETAILS COMPONENTS
// ======================

/**
 * Creates HTML for contact information
 * @param {Object} event - Event data
 * @returns {string} HTML for contact section
 */
function createContactHTML(event) {
  if (!event.contact?.details) return "";

  let contactContent;
  const details = event.contact.details;

  // Detect email
  if (details.includes("@")) {
    contactContent = `<a href="mailto:${details}">${escapeHtml(details)}</a>`;
  }
  // Detect phone number
  else if (/\d/.test(details)) {
    contactContent = `<a href="tel:${details.replace(/\s/g, "")}">${escapeHtml(
      details
    )}</a>`;
  }
  // Plain text fallback
  else {
    contactContent = `<span>${escapeHtml(details)}</span>`;
  }

  return `<div class="event-contact"><i class="fas fa-info-circle"></i>${contactContent}${
    event.contact.instructions
      ? `<span class="contact-instructions">(${escapeHtml(
          event.contact.instructions
        )})</span>`
      : ""
  }</div>`;
}

/**
 * Creates HTML for date display
 * @param {Object} event - Event data
 * @returns {string} HTML for date section
 */
function createDateHTML(event) {
  if (!event.date) return "";
  const start = new Date(event.date);
  const end = event.endDate ? new Date(event.endDate) : start;
  if (isNaN(start)) return "";

  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  };

  // Single day event
  if (start.toDateString() === end.toDateString()) {
    return `<div class="promo-date"><i class="fas fa-calendar-alt"></i> ${start.toLocaleDateString(
      undefined,
      options
    )}</div>`;
  }

  // Multi-day event
  return `<div class="promo-date"><i class="fas fa-calendar-alt"></i> ${start.toLocaleDateString(
    undefined,
    { ...options, month: "short" }
  )} - ${end.toLocaleDateString(undefined, options)}</div>`;
}

/**
 * Creates HTML for time display
 * @param {Object} event - Event data
 * @returns {string} HTML for time section
 */
function createTimeHTML(event) {
  if (!event.times) return "";

  // All day event
  if (event.times.allday)
    return `<div class="event-time"><i class="fas fa-clock"></i><span>All Day Event</span></div>`;

  // Multiple time slots
  const timeSlots = [];
  if (event.times.morning) timeSlots.push(`Morning: ${event.times.morning}`);
  if (event.times.afternoon)
    timeSlots.push(`Afternoon: ${event.times.afternoon}`);
  if (event.times.evening) timeSlots.push(`Evening: ${event.times.evening}`);

  if (timeSlots.length === 0) return "";

  // Single time slot
  if (timeSlots.length === 1)
    return `<div class="event-time"><i class="fas fa-clock"></i><span>${
      timeSlots[0].split(": ")[1]
    }</span></div>`;

  // Multiple time slots
  return `<div class="event-times"><i class="fas fa-clock"></i><div class="time-slots">${timeSlots
    .map(
      (slot) =>
        `<div class="time-slot"><span class="session-name">${
          slot.split(":")[0]
        }:</span><span class="session-time">${slot.split(": ")[1]}</span></div>`
    )
    .join("")}</div></div>`;
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return text ? text.replace(/[&<>"']/g, (m) => map[m]) : "";
}

/**
 * Shows error message when data fails to load
 */
function showErrorUI() {
  const container = document.getElementById("promos-container");
  if (container)
    container.innerHTML = `<div class="col-12 text-center text-danger"><p>We're having trouble loading events. Please try again later.</p></div>`;
}

// ======================
// MODAL & CAROUSEL
// ======================

/**
 * Sets up video modal for playing videos
 */
function setupVideoModal() {
  const videoModalEl = document.getElementById("videoModal");
  if (!videoModalEl) return;

  const videoModal = new bootstrap.Modal(videoModalEl);
  const frame = document.getElementById("videoModalFrame");
  const title = document.getElementById("videoModalTitle");

  // Handle play button clicks
  document.addEventListener("click", (e) => {
    const playBtn = e.target.closest(".play-button-overlay, .watch-video-btn");
    if (playBtn) {
      e.preventDefault();
      const { videoId, videoSource } = playBtn.dataset;
      if (frame && title) {
        // Set modal title from event card
        title.textContent =
          playBtn.closest(".promo-card")?.querySelector(".event-title")
            ?.textContent || "Video Promo";

        // Set appropriate video source
        frame.src =
          videoSource === "youtube"
            ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
            : `https://drive.google.com/file/d/${videoId}/preview?autoplay=1`;
        videoModal.show();
      }
    }
  });

  // Clear video when modal closes
  videoModalEl.addEventListener("hidden.bs.modal", () => {
    if (frame) frame.src = "";
  });
}

/**
 * Initializes event carousel navigation
 */
function initCarousel() {
  const grid = document.querySelector(".promos-grid"),
    prev = document.getElementById("prevPromo"),
    next = document.getElementById("nextPromo");
  if (!grid || !prev || !next) return;

  let index = 0;
  const cards = grid.querySelectorAll(".promo-card");

  // Hide nav if only one card
  if (cards.length <= 1) {
    prev.style.display = "none";
    next.style.display = "none";
    return;
  }

  // Update carousel position
  const update = () => {
    const visible =
      window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3;
    const cardWidth = cards[0].offsetWidth + 16;
    grid.style.transform = `translateX(-${index * cardWidth}px)`;
    prev.disabled = index === 0;
    next.disabled = index >= cards.length - visible;
  };

  // Navigation handlers
  prev.addEventListener("click", () => {
    if (index > 0) {
      index--;
      update();
    }
  });

  next.addEventListener("click", () => {
    const visible =
      window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3;
    if (index < cards.length - visible) {
      index++;
      update();
    }
  });

  // Handle window resize
  window.addEventListener("resize", update);
  update();
}

// ======================
// INITIALIZATION
// ======================

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos();
    setupVideoModal();
  }
});

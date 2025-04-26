// public/js/promos.js
// This script handles the loading and rendering of promotional events from a Google Sheet.
// It includes caching, error handling, and responsive design features.

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

  if (!events || events.length === 0) {
    gridContainer.innerHTML = noEventsHTML(); // Show "no events" message if no events exist
    return;
  }

  // Adjust layout for single or multiple events
  container.classList.toggle("single-event", events.length === 1);
  document.querySelector(".carousel-nav").style.display =
    events.length > 1 ? "flex" : "none";

  // Render event cards
  gridContainer.innerHTML = events
    .map((event) => createEventCard(event))
    .join("");

  if (events.length > 1) initCarousel(); // Initialize carousel for multiple events
}

// HTML for "no events" message
function noEventsHTML() {
  return `
    <div class="col-12 text-center">
      <p class="text-muted">No upcoming events scheduled.</p>
      <p>Check back soon for updates!</p>
    </div>`;
}

// Create an event card with event details
function createEventCard(event) {
  const mediaHTML = createMediaHTML(event); // Media (image/video) section
  const dateHTML = createDateHTML(event); // Date section
  const timeHTML = createTimeHTML(event); // Time section
  const contactHTML = createContactHTML(event); // Contact section

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
          <a href="${getFileUrl(
            event
          )}" class="btn btn-primary" target="_blank">
            ${getActionText(event.type)}
          </a>
        </div>
      </div>
    </div>
  `;
}

// Create media section (image or video)
function createMediaHTML(event) {
  const url = getFileUrl(event);
  const thumbnail = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000`;

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
      <div class="image-caption">Click to view details</div>
    </a>
  `;
}

// Create date section
function createDateHTML(event) {
  const start = new Date(event.date);
  const end = new Date(event.endDate);
  const isSameDay = start.toDateString() === end.toDateString();

  if (isSameDay) {
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
        year: "numeric",
        month: "short",
        day: "numeric",
      })} - 
      ${end.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
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
  if (event.type === "video") {
    return `https://drive.google.com/file/d/${event.fileId}/preview`;
  }
  return `https://drive.google.com/file/d/${event.fileId}/view`;
}

function getActionText(type) {
  switch (type) {
    case "video":
      return "Watch Video";
    case "image":
      return "View Image";
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
  if (!text) return "";
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
  if (!promoCards.length) return;

  // Calculate how many cards are visible based on screen size
  function getVisibleCards() {
    if (window.innerWidth < 576) return 1; // Mobile - 1 card
    if (window.innerWidth < 768) return 2; // Tablet - 2 cards
    if (window.innerWidth < 1200) return 3; // Desktop - 3 cards
    return 3; // Large desktop - max 3 cards (as requested)
  }

  // Update the carousel position and button states
  function updateCarousel() {
    const cardWidth = promoCards[0].offsetWidth + 24; // Include gap
    promosGrid.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= promoCards.length - getVisibleCards();
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

  window.addEventListener("resize", updateCarousel);
  updateCarousel(); // Initial setup
}

// Initialize the promo loading when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos(); // Load promos when the page is ready
  }
});

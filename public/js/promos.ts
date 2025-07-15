// public/js/promos.ts

// =========================================
// Type Definitions (Matching the Server)
// =========================================
interface PromoEvent {
  title: string;
  type: 'video' | 'image' | 'pdf';
  fileId: string | null;
  videoSource: 'youtube' | 'drive' | null;
  description: string;
  date: string;
  endDate: string;
  location: string;
  notes: string;
  buttonText?: string;
  buttonLink?: string;
  times: {
    allday?: boolean;
    morning?: string;
    afternoon?: string;
    evening?: string;
  } | null;
  contact: {
    details?: string;
    instructions?: string;
  } | null;
}

interface CachedData {
  data: PromoEvent[];
  timestamp: number;
}

// =========================================
// Constants & Configuration
// =========================================
const PROMO_SHEET_ID: string = "1RCk_BhG_uv791dIVUmLHxhW4Ok0hPfvXLNp3QFUiaQo";
const CACHE_KEY: string = "kcmi_events_cache";
const CACHE_TTL: number = 30 * 60 * 1000;


// =========================================
// Core Data Fetching Functions
// =========================================

/**
 * Main function to load promotional events.
 * It checks the cache first, then fetches fresh data if needed.
 */
async function loadPromos(): Promise<void> {
  try {
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData);
      // Fetch fresh data in the background for the next page load
      setTimeout(fetchAndCachePromos, 2000);
      return;
    }
    // No valid cache, fetch fresh data immediately
    await fetchAndCachePromos();
  } catch (error) {
    console.error("Promos loading error:", error);
    // On error, try to fall back to stale cache if it exists
    const cachedData = getCachedPromos(true); // true = allow stale
    if (cachedData) {
      console.warn("Displaying stale data due to fetch error.");
      renderEvents(cachedData);
    } else {
      showErrorUI(); // Show error if no data is available at all
    }
  }
}

/**
 * Fetches event data from the backend API and caches it in localStorage.
 */
async function fetchAndCachePromos(): Promise<void> {
  const response = await fetch(
    `https://kcmi-backend.onrender.com/api/sheets-events?id=${PROMO_SHEET_ID}`
  );
  if (!response.ok) {
    throw new Error(`Network error fetching promos: ${response.statusText}`);
  }

  const data: PromoEvent[] = await response.json();
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, timestamp: Date.now() })
  );
  renderEvents(data);
}

/**
 * Retrieves cached event data if it's valid and not expired.
 * @param {boolean} allowStale - If true, returns data even if it's expired.
 * @returns {PromoEvent[] | null} Cached data or null.
 */
function getCachedPromos(allowStale: boolean = false): PromoEvent[] | null {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp }: CachedData = JSON.parse(cached);
    if (allowStale || Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.warn("Cache parse error:", e);
    localStorage.removeItem(CACHE_KEY); // Clear corrupted cache
  }
  return null;
}


// =========================================
// UI Rendering & DOM Manipulation
// =========================================

/**
 * Renders the events into the HTML container.
 * @param {PromoEvent[]} events - An array of event objects from the API.
 */
function renderEvents(events: PromoEvent[]): void {
  const container = document.getElementById("promos-container");
  if (!container) return;

  const gridContainer = container.querySelector(".promos-grid") as HTMLDivElement;
  if (!gridContainer) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to the beginning of today

  const upcomingEvents = events.filter((event) => {
    if (!event.date) return false;
    // Use the event's end date, or its start date if no end date exists
    const eventEndDate = new Date(event.endDate || event.date);
    if (isNaN(eventEndDate.getTime())) return false;
    // Set time to the end of the day to ensure the entire day is included
    eventEndDate.setHours(23, 59, 59, 999);
    return eventEndDate.getTime() >= today.getTime();
  });

  const carouselNav = document.querySelector(".carousel-nav") as HTMLElement | null;

  if (upcomingEvents.length === 0) {
    gridContainer.innerHTML = `<div class="col-12 text-center"><p class="text-muted">No upcoming events scheduled. Check back soon!</p></div>`;
    if (carouselNav) carouselNav.style.display = "none";
    return;
  }

  container.classList.toggle("single-event", upcomingEvents.length === 1);
  if (carouselNav) {
    carouselNav.style.display = upcomingEvents.length > 1 ? "flex" : "none";
  }

  gridContainer.innerHTML = upcomingEvents.map(createEventCard).join("");

  if (upcomingEvents.length > 1) {
    initCarousel();
  }
}

/**
 * Creates the HTML string for a single event card.
 * @param {PromoEvent} event - The event object.
 * @returns {string} The HTML markup for the card.
 */
function createEventCard(event: PromoEvent): string {
  return `
    <div class="promo-card">
      ${createMediaHTML(event)}
      <div class="promo-content">
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        ${event.description ? `<p class="event-description">${escapeHtml(event.description)}</p>` : ""}
        <div class="event-details">
          ${createDateHTML(event)}
          ${createTimeHTML(event)}
          ${event.location ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i><span>${escapeHtml(event.location)}</span></div>` : ""}
          ${createContactHTML(event)}
        </div>
        <div class="text-center mt-2">${getActionButtons(event)}</div>
        ${event.notes ? `<p class="event-notes small text-muted mt-3">${escapeHtml(event.notes)}</p>` : ""}
      </div>
    </div>`;
}


// =========================================
// HTML Component Builder Functions
// =========================================

function getActionButtons(event: PromoEvent): string {
  let buttonsHTML = "";
  if (event.type === 'video' && event.fileId && event.videoSource) {
    buttonsHTML += `<button class="btn btn-primary watch-video-btn" data-video-id="${event.fileId}" data-video-source="${event.videoSource}"><i class="fas fa-play me-2"></i>Watch Video</button>`;
  }
  if (event.buttonLink && event.buttonText) {
    buttonsHTML += `<a href="${event.buttonLink}" class="btn btn-outline-primary" target="_blank" rel="noopener">${escapeHtml(event.buttonText)}</a>`;
  }
  if (buttonsHTML === "" && event.fileId && (event.type === 'image' || event.type === 'pdf')) {
    buttonsHTML = `<a href="https://drive.google.com/file/d/${event.fileId}/view" class="btn btn-primary" target="_blank" rel="noopener">View ${escapeHtml(event.type)}</a>`;
  }
  return `<div class="d-flex gap-2 justify-content-center flex-wrap">${buttonsHTML}</div>`;
}

function createMediaHTML(event: PromoEvent): string {
  if (event.type === 'video' && event.fileId) {
    const thumbnail = event.videoSource === 'youtube'
      ? `https://img.youtube.com/vi/${event.fileId}/hqdefault.jpg`
      : `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w500`;
    return `<div class="video-thumbnail-container play-button-overlay" data-video-id="${event.fileId}" data-video-source="${event.videoSource || 'drive'}"><img src="${thumbnail}" alt="${escapeHtml(event.title)}" loading="lazy" class="video-thumbnail"><i class="fas fa-play"></i></div>`;
  }
  if ((event.type === 'image' || event.type === 'pdf') && event.fileId) {
    const link = `https://drive.google.com/file/d/${event.fileId}/view`;
    const thumbnail = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000`;
    return `<a href="${link}" target="_blank" rel="noopener"><img src="${thumbnail}" alt="${escapeHtml(event.title)}" loading="lazy"></a>`;
  }
  return "";
}

function createContactHTML(event: PromoEvent): string {
  if (!event.contact?.details) return "";
  let contactContent: string;
  const details = event.contact.details;
  if (details.includes("@")) {
    contactContent = `<a href="mailto:${details}">${escapeHtml(details)}</a>`;
  } else if (/\d/.test(details)) {
    contactContent = `<a href="tel:${details.replace(/\s/g, "")}">${escapeHtml(details)}</a>`;
  } else {
    contactContent = `<span>${escapeHtml(details)}</span>`;
  }
  return `<div class="event-contact"><i class="fas fa-info-circle"></i>${contactContent}${event.contact.instructions ? `<span class="contact-instructions">(${escapeHtml(event.contact.instructions)})</span>` : ""}</div>`;
}

function createDateHTML(event: PromoEvent): string {
  if (!event.date) return "";
  const start = new Date(event.date);
  const end = new Date(event.endDate || event.date);
  if (isNaN(start.getTime())) return "";

  // Adjust for timezone offset when creating dates from YYYY-MM-DD strings
  start.setMinutes(start.getMinutes() + start.getTimezoneOffset());
  end.setMinutes(end.getMinutes() + end.getTimezoneOffset());

  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };
  if (start.toDateString() === end.toDateString()) {
    return `<div class="promo-date"><i class="fas fa-calendar-alt"></i> ${start.toLocaleDateString(undefined, options)}</div>`;
  }
  return `<div class="promo-date"><i class="fas fa-calendar-alt"></i> ${start.toLocaleDateString(undefined, { ...options, month: "short" })} - ${end.toLocaleDateString(undefined, options)}</div>`;
}

function createTimeHTML(event: PromoEvent): string {
  if (!event.times) return "";
  if (event.times.allday) return `<div class="event-time"><i class="fas fa-clock"></i><span>All Day Event</span></div>`;
  
  const timeSlots = [
    event.times.morning ? `Morning: ${event.times.morning}` : null,
    event.times.afternoon ? `Afternoon: ${event.times.afternoon}` : null,
    event.times.evening ? `Evening: ${event.times.evening}` : null,
  ].filter((slot): slot is string => slot !== null);

  if (timeSlots.length === 0) return "";
  if (timeSlots.length === 1) return `<div class="event-time"><i class="fas fa-clock"></i><span>${timeSlots[0].split(": ")[1]}</span></div>`;
  
  return `<div class="event-times"><i class="fas fa-clock"></i><div class="time-slots">${timeSlots.map(slot => `<div class="time-slot"><span class="session-name">${slot.split(":")[0]}:</span><span class="session-time">${slot.split(": ")[1]}</span></div>`).join("")}</div></div>`;
}

function escapeHtml(text: string | undefined | null): string {
  if (!text) return "";
  const map: { [key: string]: string } = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function showErrorUI(): void {
  const container = document.getElementById("promos-container");
  if (container) {
    container.innerHTML = `<div class="col-12 text-center text-danger"><p>We're having trouble loading events right now. Please try again later.</p></div>`;
  }
}


// =========================================
// Interactive Components: Modal & Carousel
// =========================================
function setupVideoModal(): void {
  const videoModalEl = document.getElementById("videoModal");
  if (!videoModalEl) return;

  const videoModal = new bootstrap.Modal(videoModalEl);
  const frame = document.getElementById("videoModalFrame") as HTMLIFrameElement;
  const title = document.getElementById("videoModalTitle") as HTMLHeadingElement;

  document.addEventListener("click", (e: MouseEvent) => {
    const playBtn = (e.target as HTMLElement).closest(".play-button-overlay, .watch-video-btn") as HTMLElement | null;
    if (playBtn) {
      e.preventDefault();
      const { videoId, videoSource } = playBtn.dataset;
      if (frame && title && videoId && videoSource) {
        title.textContent = playBtn.closest(".promo-card")?.querySelector(".event-title")?.textContent || "Video Promo";
        frame.src = videoSource === 'youtube'
          ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
          : `https://drive.google.com/file/d/${videoId}/preview?autoplay=1`;
        videoModal.show();
      }
    }
  });

  videoModalEl.addEventListener("hidden.bs.modal", () => {
    if (frame) frame.src = "";
  });
}

function initCarousel(): void {
  const grid = document.querySelector(".promos-grid") as HTMLDivElement;
  const prev = document.getElementById("prevPromo") as HTMLButtonElement;
  const next = document.getElementById("nextPromo") as HTMLButtonElement;
  if (!grid || !prev || !next) return;

  let index = 0;
  const cards = grid.querySelectorAll(".promo-card");
  if (cards.length <= 1) {
    prev.style.display = "none";
    next.style.display = "none";
    return;
  }

  const update = () => {
    const visibleCards = window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3;
    const cardWidth = (cards[0] as HTMLElement).offsetWidth + 16; // 1rem gap
    grid.style.transform = `translateX(-${index * cardWidth}px)`;
    prev.disabled = index === 0;
    next.disabled = index >= cards.length - visibleCards;
  };

  prev.addEventListener("click", () => {
    if (index > 0) {
      index--;
      update();
    }
  });
  next.addEventListener("click", () => {
    const visibleCards = window.innerWidth < 768 ? 1 : window.innerWidth < 992 ? 2 : 3;
    if (index < cards.length - visibleCards) {
      index++;
      update();
    }
  });

  window.addEventListener("resize", update);
  update(); // Initial call
}


// =========================================
// Initialization
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos();
    setupVideoModal();
  }
});
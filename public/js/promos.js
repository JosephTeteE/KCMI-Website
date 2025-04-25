// public/js/promos.js

// Constants for promo manifest ID, cache key, and cache time-to-live (TTL)
const PROMO_MANIFEST_ID = "1QnJQXur7zNvqoks7TR5SRRgVqWlZdACO";
const CACHE_KEY = "kcmi_events_cache";
const CACHE_TTL = 30 * 60 * 1000; // Cache duration: 30 minutes

// Main function to load promotional events
async function loadPromos() {
  try {
    // Check if cached data is available and valid
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData); // Render cached events if available
      return;
    }

    // Fetch promo data from the backend API
    const response = await fetch(
      `https://kcmi-backend.onrender.com/api/drive-manifest?id=${PROMO_MANIFEST_ID}`
    );

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Server error: ${response.status}`);
    }

    const events = await response.json();

    // Validate the response format
    if (!Array.isArray(events)) {
      throw new Error("Invalid data format from server");
    }

    // Cache the fetched data and render the events
    cachePromos(events);
    renderEvents(events);
  } catch (error) {
    console.error("Promos loading error:", error);
    showErrorUI(error.message || "Failed to load promotional content");

    // Fallback: Render cached data if available
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData);
    }
  }
}

// Retrieve cached promo data from localStorage
function getCachedPromos() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    // Check if the cache is still valid
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.warn("Cache parse error:", e);
  }
  return null;
}

// Cache promo data in localStorage with a timestamp
function cachePromos(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  );
}

// Render the list of events in the UI
async function renderEvents(events) {
  const container = document.getElementById("promos-container");

  // Handle empty events list
  if (!events || !events.length) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted">No upcoming events at this time.</p>
        <p>Check back later for updates!</p>
      </div>`;
    return;
  }

  try {
    // Generate HTML for each event and render them
    const eventHTML = await Promise.all(
      events.map((event) => createEventCard(event))
    );
    container.innerHTML = eventHTML.join("");
  } catch (error) {
    console.error("Render error:", error);
    showErrorUI("Error displaying events");
  }
}

// Create an HTML card for a single event
async function createEventCard(event) {
  try {
    const fileUrl = await getFileUrl(event.fileId, event.type);
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000`;

    // Return the HTML structure for the event card
    return `
      <div class="promo-card" aria-labelledby="event-title-${event.fileId}">
        <h3 class="event-title" id="event-title-${event.fileId}">${escapeHtml(
      event.title
    )}</h3>
        ${mediaHTML}
        <div class="promo-content">
          <p class="event-description">${escapeHtml(event.description)}</p>
          
          <div class="event-dates" aria-label="Event dates and times">
            <div class="promo-date">
              <i class="fas fa-calendar-alt" aria-hidden="true"></i>
              ${formatEventDates(event.date, event.endDate)}
            </div>
            ${formatEventTimes(event.times)}
          </div>
          
          ${
            event.location
              ? `
            <div class="event-location">
              <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
              <span>${escapeHtml(event.location)}</span>
            </div>
          `
              : ""
          }
          
          ${
            event.contact
              ? `
            <div class="event-contact">
              <i class="fas fa-phone" aria-hidden="true"></i>
              <span class="sr-only">Contact: </span>
              <a href="tel:${event.contact.number.replace(/\D/g, "")}" 
                 aria-label="Contact number: ${escapeHtml(
                   event.contact.number
                 )}">
                ${formatPhoneNumber(event.contact.number)}
              </a>
              ${
                event.contact.instructions
                  ? `
                <span class="contact-instructions">
                  (${escapeHtml(event.contact.instructions)})
                </span>
              `
                  : ""
              }
            </div>
          `
              : ""
          }
          
          <div class="text-center mt-3">
            <a href="${fileUrl}" class="btn btn-primary" target="_blank" 
               aria-label="View details for ${escapeHtml(event.title)}">
              ${event.type === "video" ? "Watch Video" : "View Details"}
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Card creation error:", error);
    // Return an error card if the event fails to load
    return `
      <div class="promo-card error-card">
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        <div class="promo-content">
          <p>Unable to load this event. Please try again later.</p>
        </div>
      </div>
    `;
  }
}

// Generate the appropriate file URL based on the event type
async function getFileUrl(fileId, type) {
  return type === "video"
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : `https://drive.google.com/file/d/${fileId}/view`;
}

// Format a date range into a human-readable format
function formatEventDates(startDate, endDate) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) return startDate;

    const options = { year: "numeric", month: "long", day: "numeric" };

    if (!endDate || isNaN(end.getTime()) || startDate === endDate) {
      return start.toLocaleDateString(undefined, options);
    }

    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
      })} - 
              ${end.toLocaleDateString(undefined, options)}`;
    }

    return `${start.toLocaleDateString(undefined, options)} - 
            ${end.toLocaleDateString(undefined, options)}`;
  } catch (error) {
    return startDate;
  }
}

function formatEventTimes(times) {
  if (!times) return "";

  if (typeof times === "string") {
    return `
      <div class="event-time">
        <i class="fas fa-clock" aria-hidden="true"></i>
        <span>Time: ${escapeHtml(times)}</span>
      </div>
    `;
  }

  if (typeof times === "object") {
    return `
      <div class="event-times">
        <i class="fas fa-clock" aria-hidden="true"></i>
        <div class="time-slots">
          ${Object.entries(times)
            .map(
              ([session, time]) => `
            <div class="time-slot">
              <span class="session-name">${capitalizeFirstLetter(
                session
              )}:</span>
              <span class="session-time">${escapeHtml(time)}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  return "";
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Escape HTML to prevent XSS attacks
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Display an error message in the UI
function showErrorUI(
  message = "We're currently unable to load our upcoming events."
) {
  const container = document.getElementById("promos-container");
  container.innerHTML = `
    <div class="col-12 text-center">
      <p class="text-danger">${message}</p>
      <p>Please try again later or contact us for information.</p>
      <a href="/contact-us.html" class="btn btn-outline-primary">Contact Us</a>
    </div>`;
}

// Initialize the promo loading and carousel navigation
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos(); // Load promos when the page is ready
  }

  // Carousel navigation logic
  const promosGrid = document.querySelector(".promos-grid");
  const prevBtn = document.getElementById("prevPromo");
  const nextBtn = document.getElementById("nextPromo");
  let currentIndex = 0;

  // Update the carousel position and button states
  function updateCarousel() {
    if (!promosGrid) return;

    const cardWidth =
      document.querySelector(".promo-card")?.offsetWidth + 24 || 0;
    promosGrid.style.transform = `translateX(-${currentIndex * cardWidth}px)`;

    prevBtn.disabled = currentIndex === 0;

    const visibleCards =
      window.innerWidth < 576 ? 1 : window.innerWidth < 992 ? 2 : 3;
    const totalCards = document.querySelectorAll(".promo-card").length;
    nextBtn.disabled = currentIndex >= totalCards - visibleCards;
  }

  // Add event listeners for carousel navigation buttons
  if (prevBtn && nextBtn && promosGrid) {
    prevBtn.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener("click", () => {
      const visibleCards =
        window.innerWidth < 576 ? 1 : window.innerWidth < 992 ? 2 : 3;
      const totalCards = document.querySelectorAll(".promo-card").length;

      if (currentIndex < totalCards - visibleCards) {
        currentIndex++;
        updateCarousel();
      }
    });

    window.addEventListener("resize", updateCarousel);
    updateCarousel(); // Initial setup
  }
});

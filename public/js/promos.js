// public/js/promos.js
const PROMO_MANIFEST_ID = "1QnJQXur7zNvqoks7TR5SRRgVqWlZdACO";
const CACHE_KEY = "kcmi_events_cache";
const CACHE_TTL = 30 * 60 * 1000;

async function loadPromos() {
  try {
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData);
      return;
    }

    const response = await fetch(
      `https://kcmi-backend.onrender.com/api/drive-manifest?id=${PROMO_MANIFEST_ID}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `Server error: ${response.status}`);
    }

    const events = await response.json();

    if (!Array.isArray(events)) {
      throw new Error("Invalid data format from server");
    }

    cachePromos(events);
    renderEvents(events);
  } catch (error) {
    console.error("Promos loading error:", error);
    showErrorUI(error.message || "Failed to load promotional content");

    // Attempt to show cached data even if error occurs
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData);
    }
  }
}

function getCachedPromos() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.warn("Cache parse error:", e);
  }
  return null;
}

function cachePromos(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      timestamp: Date.now(),
    })
  );
}

async function renderEvents(events) {
  const container = document.getElementById("promos-container");

  if (!events || !events.length) {
    container.innerHTML = `
      <div class="col-12 text-center">
        <p class="text-muted">No upcoming events at this time.</p>
        <p>Check back later for updates!</p>
      </div>`;
    return;
  }

  try {
    const eventHTML = await Promise.all(
      events.map((event) => createEventCard(event))
    );
    container.innerHTML = eventHTML.join("");
  } catch (error) {
    console.error("Render error:", error);
    showErrorUI("Error displaying events");
  }
}

async function createEventCard(event) {
  try {
    const fileUrl = await getFileUrl(event.fileId, event.type);
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000`;

    return `
      <div class="promo-card">
        <h3 class="event-title">${escapeHtml(event.title)}</h3>
        ${
          event.type === "video"
            ? `<div class="video-container">
                <iframe src="${fileUrl}" 
                        frameborder="0" 
                        allowfullscreen
                        loading="lazy"></iframe>
                <div class="video-caption">Watch this invitation</div>
              </div>`
            : `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer">
                <img src="${thumbnailUrl}" 
                     alt="${escapeHtml(event.title)}" 
                     loading="lazy">
                <div class="image-caption">Click to view details</div>
              </a>`
        }
        <div class="promo-content">
          <p class="event-description">${escapeHtml(event.description)}</p>
          <div class="promo-date">
            <i class="fas fa-calendar-alt"></i> ${formatDate(event.date)}
          </div>
          ${
            event.location
              ? `<div class="event-location">
                  <i class="fas fa-map-marker-alt"></i> ${escapeHtml(
                    event.location
                  )}
                </div>`
              : ""
          }
          ${
            event.contact
              ? `<p class="event-contact">
                  <i class="fas fa-phone"></i> ${escapeHtml(event.contact)}
                </p>`
              : ""
          }
          <div class="text-center mt-3">
            <a href="${fileUrl}" 
               class="btn btn-primary" 
               target="_blank"
               rel="noopener noreferrer">
              ${event.type === "video" ? "Watch Video" : "View Details"}
            </a>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Card creation error:", error);
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

async function getFileUrl(fileId, type) {
  return type === "video"
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : `https://drive.google.com/file/d/${fileId}/view`;
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? dateString
      : date.toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  } catch (error) {
    return dateString;
  }
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos();
  }
});

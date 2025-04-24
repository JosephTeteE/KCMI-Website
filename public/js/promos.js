// public/js/promos.js
// This script handles fetching and displaying promotional content

// Configuration
const PROMO_MANIFEST_ID = "1QnJQXur7zNvqoks7TR5SRRgVqWlZdACO"; // Google Drive file ID for the JSON manifest
const CACHE_KEY = "kcmi_events_cache"; // Key for localStorage caching
const CACHE_TTL = 30 * 60 * 1000; // Cache duration (30 minutes)

// Main function to load and display promos
async function loadPromos() {
  try {
    // Check for cached data first
    const cachedData = getCachedPromos();
    if (cachedData) {
      renderEvents(cachedData);
      return;
    }

    // Fetch manifest through your backend API
    const response = await fetch(`/api/drive-manifest?id=${PROMO_MANIFEST_ID}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status}`);
    }

    const events = await response.json();

    // Validate the response
    if (!Array.isArray(events)) {
      throw new Error("Invalid manifest format - expected an array");
    }

    // Cache the new data
    cachePromos(events);

    // Render the events
    renderEvents(events);
  } catch (error) {
    console.error("Error loading promos:", error);
    showErrorUI();
  }
}

// Get cached promos if they exist and aren't expired
function getCachedPromos() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;

  try {
    const { data, timestamp } = JSON.parse(cached);
    const now = new Date().getTime();

    if (now - timestamp < CACHE_TTL) {
      return data;
    }
  } catch (e) {
    console.warn("Failed to parse cached promos", e);
  }
  return null;
}

// Cache the promos data in localStorage
function cachePromos(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      data,
      timestamp: new Date().getTime(),
    })
  );
}

// Render the events to the page
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
    // Create HTML for each event
    const eventHTML = await Promise.all(
      events.map(async (event) => createEventCard(event))
    );

    container.innerHTML = eventHTML.join("");
  } catch (error) {
    console.error("Error rendering events:", error);
    showErrorUI();
  }
}

// Create HTML for a single event card
async function createEventCard(event) {
  try {
    // Get the appropriate URL based on file type
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
    console.error("Error creating event card:", error);
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

// Get the appropriate URL for a file based on its type
async function getFileUrl(fileId, type) {
  try {
    // For videos, use the preview URL
    if (type === "video") {
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // For PDFs, use the direct view URL
    return `https://drive.google.com/file/d/${fileId}/view`;
  } catch (error) {
    console.error("Error getting file URL:", error);
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

// Format a date string into a readable format
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

// Simple HTML escaping to prevent XSS
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Show error message when loading fails
function showErrorUI() {
  const container = document.getElementById("promos-container");
  container.innerHTML = `
    <div class="col-12 text-center">
      <p class="text-muted">We're currently unable to load our upcoming events.</p>
      <p>Please try again later or contact us for information.</p>
      <a href="/contact-us.html" class="btn btn-outline-primary">Contact Us</a>
    </div>`;
}

// Initialize when the page loads
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("promos-container")) {
    loadPromos();
  }
});

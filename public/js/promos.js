// public/js/promos.js
// This script fetches promotional content from Google Drive and displays it on the page, with localStorage caching.

const PROMO_MANIFEST_ID = "1QnJQXur7zNvqoks7TR5SRRgVqWlZdACO"; // Google Drive file ID for the promo manifest
const CACHE_KEY = "kcmi_events_cache"; // Key used to store cached data in localStorage
const CACHE_TTL = 30 * 60 * 1000; // Cache time-to-live (30 minutes)

// Function to load promotional events
async function loadPromos() {
  try {
    const cached = localStorage.getItem(CACHE_KEY); // Retrieve cached data from localStorage
    const now = new Date().getTime(); // Current timestamp

    if (cached) {
      const { data, timestamp } = JSON.parse(cached); // Parse cached data
      if (now - timestamp < CACHE_TTL) {
        renderEvents(data); // Use cached data if it's still valid
        return;
      }
    }

    // Fetch fresh data from Google Drive if cache is expired or missing
    const response = await fetch(
      `https://drive.google.com/uc?export=download&id=${PROMO_MANIFEST_ID}`
    );
    const events = await response.json(); // Parse the JSON response

    // Update the cache with the new data
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: events,
        timestamp: now,
      })
    );

    renderEvents(events); // Render the fetched events
  } catch (error) {
    console.error("Error loading events:", error); // Log any errors to the console

    // Display an error message on the page if data loading fails
    document.getElementById("promos-container").innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">We're currently unable to load our upcoming events due to technical issues.</p>
                <p>Please check back later, or reach out to us for enquiries.</p>
                <p>Visit our <a href="/contact-us.html">Contact page</a> for immediate support.</p>
            </div>`;
  }
}

// Function to render promotional events on the page
function renderEvents(events) {
  const container = document.getElementById("promos-container"); // Get the container element

  if (!events.length) {
    // Display a message if there are no events
    container.innerHTML = `
              <div class="col-12 text-center">
                  <p class="text-muted">Stay tuned for updates on our upcoming programs and events.
                              Exciting opportunities to connect and grow await you!</p>
                  <p>For immediate concerns, kindly visit our <a href="/contact-us.html">Contact page</a>.</p>
              </div>`;
    return;
  }

  // Generate HTML for each event and insert it into the container
  container.innerHTML = events
    .map(
      (event) => `
          <div class="promo-card">
              <h3 class="event-title">${event.title}</h3>
              ${
                event.type === "video"
                  ? `<div class="video-container">
                              <video controls poster="https://drive.google.com/thumbnail?id=${event.fileId}&sz=w500">
                                  <source src="https://drive.google.com/uc?export=download&id=${event.fileId}" type="video/mp4">
                                  Your browser does not support the video tag.
                              </video>
                              <div class="video-caption">Watch this invitation from our ministry team</div>
                          </div>`
                  : `<a href="https://drive.google.com/uc?export=download&id=${event.fileId}" target="_blank" style="display: block;">
                              <img src="https://drive.google.com/thumbnail?id=${event.fileId}&sz=w1000" alt="${event.title}" loading="lazy">
                              <div class="image-caption">Click to view details</div>
                          </a>`
              }
              <div class="promo-content">
                  <p class="event-description">${event.description}</p>
                  <div class="promo-date"><i class="fas fa-calendar-alt"></i> ${formatDate(
                    event.date
                  )}</div>
                  ${
                    event.location
                      ? `<div class="event-location"><i class="fas fa-map-marker-alt"></i> ${event.location}</div>`
                      : ""
                  }
                  ${
                    event.contact
                      ? `<p class="event-contact"><i class="fas fa-phone"></i> ${event.contact}</p>`
                      : ""
                  }
                  <p class="text-center mt-3">
                      ${
                        event.type === "video"
                          ? `<a href="https://drive.google.com/uc?export=download&id=${event.fileId}" class="btn btn-primary" target="_blank">Watch Video</a>`
                          : `<a href="https://drive.google.com/uc?export=download&id=${event.fileId}" class="btn btn-primary" target="_blank">View Details</a>`
                      }
                  </p>
              </div>
          </div>
      `
    )
    .join(""); // Join all event HTML strings into one
}

// Function to format a date string into a readable format
function formatDate(dateString) {
  const date = new Date(dateString); // Parse the date string
  const day = String(date.getDate()).padStart(2, "0"); // Day of the month
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Month (1-based)
  const year = date.getFullYear(); // Year

  let hours = date.getHours(); // Hours in 24-hour format
  const ampm = hours >= 12 ? "PM" : "AM"; // Determine AM/PM
  hours = hours % 12 || 12; // Convert to 12-hour format
  const minutes = String(date.getMinutes()).padStart(2, "0"); // Minutes

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const dayName = dayNames[date.getDay()]; // Day of the week

  // Return the formatted date string
  return `${dayName}, ${day}-${month}-${year} at ${hours}:${minutes} ${ampm}`;
}

// Load promos when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", loadPromos);

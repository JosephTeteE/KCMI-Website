// public/js/church-calendar.js
// This script handles the church calendar functionality, including fetching events, rendering views, and handling user interactions.

class ChurchCalendar {
  constructor() {
    // Initialize state variables
    this.cachedEvents = null; // Cache for fetched events
    this.isFetching = false; // Prevent multiple simultaneous fetches
    this.currentView = "list"; // Current view mode ('list' or 'month')
    this.currentMonth = new Date().getMonth(); // Current month for the calendar
    this.currentYear = new Date().getFullYear(); // Current year for the calendar
    this.modal = new bootstrap.Modal(document.getElementById("eventModal")); // Bootstrap modal for event details
  }

  async init() {
    // Initialize the calendar by setting up event listeners and loading events
    this.setupEventListeners();
    await this.loadEvents();
  }

  setupEventListeners() {
    // Attach event listeners for user interactions
    document
      .getElementById("calendar-container")
      .addEventListener("click", (e) => {
        if (e.target.id === "refresh-btn") this.loadEvents(); // Refresh events
        if (e.target.id === "list-view-btn") this.switchView("list"); // Switch to list view
        if (e.target.id === "month-view-btn") this.switchView("month"); // Switch to month view
        if (e.target.id === "prev-month") this.changeMonth(-1); // Navigate to previous month
        if (e.target.id === "next-month") this.changeMonth(1); // Navigate to next month
        if (e.target.id === "addToCalendarBtn") this.downloadCurrentEvent(); // Download event as ICS
        if (e.target.closest(".event-item"))
          this.showEventDetails(
            e.target.closest(".event-item").dataset.eventId
          ); // Show event details in modal
      });
  }

  async loadEvents() {
    // Fetch events from the backend and render the calendar
    if (this.isFetching) return; // Prevent duplicate fetches

    this.showLoading(); // Show loading indicator
    this.isFetching = true;

    try {
      const response = await fetch(
        "https://kcmi-backend.onrender.com/api/calendar-events"
      );
      if (!response.ok) throw new Error("Network error");

      this.cachedEvents = await response.json(); // Cache fetched events
      this.renderCalendar(); // Render the calendar with fetched events
    } catch (error) {
      console.error(
        `Error loading events from URL: https://kcmi-backend.onrender.com/api/calendar-events`,
        error
      );
      this.showError(
        `Failed to load events: ${error.message}. Please try again later.`
      );

      // If fetch fails, show cached events if available
      if (this.cachedEvents && Array.isArray(this.cachedEvents)) {
        this.renderCalendar();
        this.showError(
          "Failed to load events: Showing cached data. " + error.message
        );
      }
    } finally {
      if (this.cachedEvents) {
        this.isFetching = false; // Reset fetching state
      }
    }
  }

  renderCalendar() {
    // Render the calendar container with the current view (list or month)
    const container = document.getElementById("calendar-container");
    container.innerHTML = `
        <div class="view-options mb-3">
          <button id="list-view-btn" class="btn btn-sm ${
            this.currentView === "list"
              ? "btn-primary"
              : "btn-outline-secondary"
          }">List View</button>
          <button id="month-view-btn" class="btn btn-sm ${
            this.currentView === "month"
              ? "btn-primary"
              : "btn-outline-secondary"
          }">Month View</button>
          <button id="refresh-btn" class="btn btn-sm btn-outline-secondary ms-2">
            <span id="refresh-icon">⟳</span> Refresh
          </button>
        </div>
        ${
          this.currentView === "list"
            ? this.renderListView() // Render list view
            : this.renderMonthView() // Render month view
        }
      `;
  }

  renderListView() {
    // Render the list view of events
    if (!this.cachedEvents?.length) {
      return '<div class="alert alert-info">No upcoming events found.</div>';
    }

    let html = '<div id="events-list">';
    const eventsByDate = {};

    // Group events by date
    this.cachedEvents.forEach((event) => {
      const date = event.start.dateTime
        ? event.start.dateTime.split("T")[0]
        : event.start.date;
      if (!eventsByDate[date]) eventsByDate[date] = [];
      eventsByDate[date].push(event);
    });

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort();

    // Show only first 3 date groups
    const datesToShow = sortedDates.slice(0, 3);

    datesToShow.forEach((date) => {
      const dateObj = new Date(date);
      html += `
        <div class="date-header mb-2">
          ${dateObj.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>
      `;

      // Show all events for each displayed date
      eventsByDate[date].forEach((event) => {
        html += this.renderEventItem(event);
      });
    });

    // Show message if there are more date groups
    if (sortedDates.length > 3) {
      html += `
        <div class="more-dates-message alert alert-info mt-3">
          Showing 3 upcoming dates. ${
            sortedDates.length - 3
          } more dates available.
        </div>
      `;
    }

    return html + "</div>";
  }

  renderEventItem(event) {
    // Render a single event item in the list view
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    return `
        <div class="event-item mb-3 p-3 rounded border-start border-primary border-3" data-event-id="${
          event.id
        }">
          <div class="event-time text-primary fw-bold">${this.formatTime(
            start,
            end
          )}</div>
          <h5 class="event-title">${event.summary || "Church Event"}</h5>
          ${
            event.location
              ? `<div class="event-location text-muted small">${event.location}</div>`
              : ""
          }
        </div>
      `;
  }

  renderMonthView() {
    // Render the month view of the calendar
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay(); // Day of the week for the 1st of the month
    const daysInMonth = new Date(
      this.currentYear,
      this.currentMonth + 1,
      0
    ).getDate(); // Total days in the current month

    let html = `
        <div class="month-view">
          <div class="month-header d-flex justify-content-between align-items-center mb-3">
            <button id="prev-month" class="btn btn-sm btn-outline-secondary">&lt; Previous</button>
            <h4 class="mb-0">${new Date(
              this.currentYear,
              this.currentMonth
            ).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}</h4>
            <button id="next-month" class="btn btn-sm btn-outline-secondary">Next &gt;</button>
          </div>
          <div class="month-grid">
            ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
              .map(
                (day) => `
              <div class="day-header">${day}</div>
            `
              )
              .join("")}
            ${Array(firstDay)
              .fill()
              .map(
                () => `
              <div class="day-cell empty"></div>
            `
              )
              .join("")}
      `;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateKey = date.toISOString().split("T")[0];
      const isToday = new Date().toDateString() === date.toDateString();
      const dayEvents =
        this.cachedEvents?.filter((event) => {
          const eventDate = event.start.dateTime
            ? event.start.dateTime.split("T")[0]
            : event.start.date;
          return eventDate === dateKey;
        }) || [];

      html += `
          <div class="day-cell ${isToday ? "today" : ""}">
            <div class="day-number ${
              isToday ? "text-primary fw-bold" : ""
            }">${day}</div>
            ${dayEvents
              .slice(0, 2)
              .map(
                (event) => `
              <div class="month-event small" data-event-id="${event.id}">
                ${event.summary || "Event"}
              </div>
            `
              )
              .join("")}
            ${
              dayEvents.length > 2
                ? `
              <div class="month-event small text-primary">
                +${dayEvents.length - 2} more
              </div>
            `
                : ""
            }
          </div>
        `;
    }

    return html + "</div></div>";
  }

  showEventDetails(eventId) {
    // Show event details in a modal
    const event = this.cachedEvents?.find((e) => e.id === eventId);
    if (!event) return;

    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;

    document.getElementById("eventModalTitle").textContent =
      event.summary || "Church Event";
    document.getElementById("eventModalBody").innerHTML = `
        <p><strong>When:</strong> ${this.formatTime(start, end)}</p>
        ${
          event.location
            ? `<p><strong>Where:</strong> ${event.location}</p>`
            : ""
        }
        ${
          event.description
            ? `<p><strong>Details:</strong> ${event.description}</p>`
            : ""
        }
      `;
    document.getElementById("eventModal").dataset.currentEvent = eventId;
    this.modal.show();
  }

  downloadCurrentEvent() {
    // Download the currently selected event as an ICS file
    const eventId = document.getElementById("eventModal").dataset.currentEvent;
    const event = this.cachedEvents?.find((e) => e.id === eventId);
    if (event) this.downloadICS(event);
  }

  downloadICS(event) {
    // Generate and download an ICS file for the event
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    const icsStart = start.includes("T")
      ? start.replace(/-|:|\.\d{3}/g, "")
      : start.split("T")[0].replace(/-/g, "");
    const icsEnd = end.includes("T")
      ? end.replace(/-|:|\.\d{3}/g, "")
      : end.split("T")[0].replace(/-/g, "");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${icsStart}`,
      `DTEND:${icsEnd}`,
      `SUMMARY:${event.summary || "Church Event"}`,
      `DESCRIPTION:${event.description || ""}`,
      `LOCATION:${event.location || ""}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.summary || "event"}.ics`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  formatTime(start, end) {
    // Format the start and end times for display
    if (!start.includes("T")) return "All Day";

    const startDate = new Date(start);
    const endDate = new Date(end);
    const options = {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    if (startDate.toDateString() !== endDate.toDateString()) {
      return `${startDate.toLocaleDateString(
        undefined,
        options
      )} - ${endDate.toLocaleDateString(undefined, options)}`;
    }
    return `${startDate.toLocaleDateString(undefined, {
      ...options,
      year: undefined,
    })} - ${endDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  switchView(view) {
    // Switch between list and month views
    this.currentView = view;
    this.renderCalendar();
  }

  changeMonth(offset) {
    // Change the current month by the given offset
    this.currentMonth += offset;
    if (this.currentMonth > 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else if (this.currentMonth < 0) {
      this.currentMonth = 11;
      this.currentYear--;
    }
    this.renderCalendar();
  }

  showLoading() {
    // Show the loading message
    document.getElementById("loading-message").style.display = "block";
    document.getElementById("error-message").style.display = "none";
  }

  showError(message) {
    // Show an error message
    document.getElementById("loading-message").style.display = "none";
    const errorEl = document.getElementById("error-message");
    errorEl.style.display = "block";
    errorEl.textContent = message;
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("calendar-container")) {
    const calendar = new ChurchCalendar();
    calendar.init();
  }
});

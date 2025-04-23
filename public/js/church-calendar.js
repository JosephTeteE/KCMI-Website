// public/js/church-calendar.js
// This script handles the church calendar functionality, including fetching events, rendering views, and handling user interactions.

class ChurchCalendar {
  constructor() {
    this.cachedEvents = null;
    this.isFetching = false;
    this.currentView = "list"; // 'list' or 'month'
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();
    this.modal = new bootstrap.Modal(document.getElementById("eventModal"));
  }

  async init() {
    this.setupEventListeners();
    await this.loadEvents();
  }

  setupEventListeners() {
    // Event delegation for all calendar interactions
    document
      .getElementById("calendar-container")
      .addEventListener("click", (e) => {
        if (e.target.id === "refresh-btn") this.loadEvents();
        if (e.target.id === "list-view-btn") this.switchView("list");
        if (e.target.id === "month-view-btn") this.switchView("month");
        if (e.target.id === "prev-month") this.changeMonth(-1);
        if (e.target.id === "next-month") this.changeMonth(1);
        if (e.target.id === "addToCalendarBtn") this.downloadCurrentEvent();
        if (e.target.closest(".event-item"))
          this.showEventDetails(
            e.target.closest(".event-item").dataset.eventId
          );
      });
  }

  async loadEvents() {
    if (this.isFetching) return;

    this.showLoading();
    this.isFetching = true;

    try {
      const response = await fetch(
        "https://kcmi-backend.onrender.com/api/calendar-events"
      );
      if (!response.ok) throw new Error("Network error");

      this.cachedEvents = await response.json();
      this.renderCalendar();
    } catch (error) {
      console.error(
        `Error loading events from URL: https://kcmi-backend.onrender.com/api/calendar-events`,
        error
      );
      this.showError(
        `Failed to load events: ${error.message}. Please try again later.`
      );

      // Show cached events if available
      if (this.cachedEvents && Array.isArray(this.cachedEvents)) {
        this.renderCalendar();
        this.showError(
          "Failed to load events: Showing cached data. " + error.message
        );
      }
    } finally {
      if (this.cachedEvents) {
        this.isFetching = false;
      }
    }
  }

  renderCalendar() {
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
            ? this.renderListView()
            : this.renderMonthView()
        }
      `;
  }

  renderListView() {
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

    // Sort dates and render
    Object.keys(eventsByDate)
      .sort()
      .forEach((date) => {
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

        eventsByDate[date].forEach((event) => {
          html += this.renderEventItem(event);
        });
      });

    return html + "</div>";
  }

  renderEventItem(event) {
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
    const firstDay = new Date(this.currentYear, this.currentMonth, 1).getDay();
    const daysInMonth = new Date(
      this.currentYear,
      this.currentMonth + 1,
      0
    ).getDate();

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
    const eventId = document.getElementById("eventModal").dataset.currentEvent;
    const event = this.cachedEvents?.find((e) => e.id === eventId);
    if (event) this.downloadICS(event);
  }

  downloadICS(event) {
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
    this.currentView = view;
    this.renderCalendar();
  }

  changeMonth(offset) {
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
    document.getElementById("loading-message").style.display = "block";
    document.getElementById("error-message").style.display = "none";
  }

  showError(message) {
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

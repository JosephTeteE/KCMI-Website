// public/js/scripts.ts

// =========================================
// Type Declarations for Global Libraries
// =========================================
declare const grecaptcha: {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
};

declare const AOS: {
  init(options?: {
    duration?: number;
    easing?: string;
    once?: boolean;
    mirror?: boolean;
  }): void;
};

declare const bootstrap: {
  Modal: any;
  Collapse: any;
};


// =========================================
// Interfaces for API Data Structures
// =========================================
interface LivestreamData {
  embedCode?: string;
  isLive?: boolean;
}

interface MapData {
  apiKey: string;
  churchLocation: { lat: number; lng: number };
  zoom: number;
}


// =========================================
// reCAPTCHA and Form Submission Logic
// =========================================
function onLoadRecaptcha(): void {
  if (typeof grecaptcha === 'undefined') {
    console.error("reCAPTCHA script not loaded. Please check the script tag in your HTML.");
    return;
  }

  grecaptcha.ready(() => {
    // --- Contact Form Handler ---
    const contactForm = document.getElementById("contactForm") as HTMLFormElement | null;
    if (contactForm) {
      contactForm.addEventListener("submit", async (event: SubmitEvent) => {
        event.preventDefault();
        const submitBtn = document.getElementById("submitBtn") as HTMLButtonElement;
        const statusElement = document.getElementById("formStatus") as HTMLParagraphElement;

        submitBtn.disabled = true;
        submitBtn.textContent = "Sending...";
        statusElement.textContent = "Verifying...";
        statusElement.style.color = "blue";

        try {
          const recaptchaToken = await grecaptcha.execute("6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac", { action: "contact" });

          const email = (document.getElementById("email") as HTMLInputElement).value;
          const phone = (document.getElementById("phone") as HTMLInputElement).value;
          const message = (document.getElementById("message") as HTMLTextAreaElement).value;
          
          const response = await fetch("https://kcmi-backend.onrender.com/submit-contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, phone, message, recaptchaToken }),
          });

          const data = await response.json();
          if (data.success) {
            statusElement.textContent = "Message sent successfully!";
            statusElement.style.color = "green";
            contactForm.reset();
          } else {
            statusElement.textContent = `Error: ${data.message || 'Unknown error'}`;
            statusElement.style.color = "red";
          }
        } catch (error) {
          console.error("Contact form submission error:", error);
          statusElement.textContent = "Failed to send message.";
          statusElement.style.color = "red";
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit";
        }
      });
    }

    // --- WhatsApp Subscription Form Handler ---
    const whatsappForm = document.getElementById("whatsappSubscriptionForm") as HTMLFormElement | null;
    if (whatsappForm) {
      whatsappForm.addEventListener("submit", async (event: SubmitEvent) => {
        event.preventDefault();
        const email = (document.getElementById("whatsappEmail") as HTMLInputElement).value;
        try {
          const recaptchaToken = await grecaptcha.execute("6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac", { action: "submit_subscription" });
          const response = await fetch("https://kcmi-backend.onrender.com/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, subscriptionType: "whatsapp", recaptchaToken }),
          });
          const data = await response.json();
          alert(data.message);
          if (data.success) {
            const modalEl = document.getElementById("whatsappModal");
            if (modalEl) {
              const modalInstance = bootstrap.Modal.getInstance(modalEl);
              if (modalInstance) modalInstance.hide();
            }
            whatsappForm.reset();
          }
        } catch (error) {
          console.error("Subscription Error:", error);
          alert("An error occurred. Please try again.");
        }
      });
    }
  });
}

// Attach to the window object to be globally accessible for the script tag's onload
(window as any).onLoadRecaptcha = onLoadRecaptcha;


// =========================================
// Feature Initializer Functions
// =========================================

/**
 * Fetches and displays the livestream video and updates the "Watch Live" button.
 */
async function initializeLivestream(): Promise<void> {
  const watchLiveContainer = document.getElementById("watch-live-container");
  const livestreamContainer = document.getElementById("livestream-video-container");

  if (!watchLiveContainer && !livestreamContainer) return;

  try {
    const response = await fetch("https://kcmi-backend.onrender.com/api/livestream");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data: LivestreamData = await response.json();

    if (livestreamContainer && data.embedCode) {
      livestreamContainer.innerHTML = data.embedCode;
    }

    if (watchLiveContainer) {
      const button = watchLiveContainer.querySelector('a') as HTMLAnchorElement | null;
      if (button) {
        button.textContent = data.isLive ? "Join Us Live" : "Rewatch the Last Service";
        button.style.backgroundColor = data.isLive ? "green" : "red";
        watchLiveContainer.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error fetching livestream data:", error);
    if (watchLiveContainer) watchLiveContainer.style.display = 'none';
  }
}

/**
 * Sets up the mobile navbar toggler and click-outside-to-close behavior.
 */
function initializeNavbar(): void {
  const navbarToggler = document.querySelector(".navbar-toggler");
  const navbarCollapse = document.querySelector(".navbar-collapse");
  if (!navbarToggler || !navbarCollapse) return;

  navbarToggler.addEventListener("click", () => {
    document.body.classList.toggle("navbar-open");
  });

  document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as Node;
    if (!navbarCollapse.contains(target) && !navbarToggler.contains(target) && navbarCollapse.classList.contains("show")) {
      const bsCollapse = new bootstrap.Collapse(navbarCollapse);
      bsCollapse.hide();
      document.body.classList.remove("navbar-open");
    }
  });
}

/**
 * Implements smooth scrolling for all anchor links starting with '#'.
 */
function initializeSmoothScroll(): void {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (this: HTMLAnchorElement, e: Event) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });
}

/**
 * Sets up the click-to-copy functionality for the WhatsApp number.
 */
function initializeClickToCopy(): void {
    const whatsappNumberElement = document.getElementById("DFRwhatsappNumber");
    if (whatsappNumberElement) {
        whatsappNumberElement.addEventListener("click", function (this: HTMLElement) {
            const number = this.textContent?.trim();
            if (number) {
                navigator.clipboard.writeText(number).then(() => {
                    const originalText = this.textContent;
                    this.textContent = "Copied to Clipboard!";
                    setTimeout(() => { this.textContent = originalText; }, 1500);
                }).catch(err => console.error("Failed to copy text:", err));
            }
        });
    }
}

/**
 * Sets up the dark mode toggle button and applies the theme.
 */
function initializeDarkMode(): void {
  const darkModeToggle = document.getElementById("darkModeToggle") as HTMLButtonElement;
  const darkIcon = document.getElementById("darkIcon") as HTMLElement;
  const lightIcon = document.getElementById("lightIcon") as HTMLElement;
  if (!darkModeToggle || !darkIcon || !lightIcon) return;

  const prefersDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const setDarkMode = (enabled: boolean): void => {
    document.documentElement.setAttribute("data-bs-theme", enabled ? "dark" : "light");
    darkIcon.style.display = enabled ? "none" : "inline";
    lightIcon.style.display = enabled ? "inline" : "none";
    localStorage.setItem("darkMode", enabled ? "enabled" : "disabled");
  };

  const currentMode = localStorage.getItem("darkMode");
  if (currentMode === "enabled" || (prefersDarkMode && currentMode !== "disabled")) {
    setDarkMode(true);
  }

  darkModeToggle.addEventListener("click", () => {
    const isDarkMode = document.documentElement.getAttribute("data-bs-theme") === "dark";
    setDarkMode(!isDarkMode);
  });
}

/**
 * Fetches map configuration and dynamically loads the Google Maps API script.
 */
async function initializeMaps(): Promise<void> {
    try {
        const response = await fetch("https://kcmi-backend.onrender.com/api/maps-proxy");
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const mapData: MapData = await response.json();
        
        if (!(window as any).google?.maps) {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${mapData.apiKey}&callback=initMaps&loading=async&v=beta&libraries=marker`;
            script.async = true;
            document.head.appendChild(script);
        } else {
            initMaps();
        }
    } catch (error) {
        console.error("Map initialization failed:", error);
    }
}

/**
 * Callback function for the Google Maps API script. Initializes the map.
 * This must be attached to the window object to be globally accessible.
 */
function initMaps(): void {
  const churchLocation = { lat: 4.831148938457418, lng: 7.01167364093468 };
  
  const initSingleMap = (mapId: string, placeholderSelector: string) => {
    const mapElement = document.getElementById(mapId) as HTMLDivElement | null;
    const placeholder = document.querySelector(placeholderSelector) as HTMLDivElement | null;
    if (!mapElement || !placeholder) return;

    try {
      const map = new google.maps.Map(mapElement, {
        center: churchLocation,
        zoom: 16,
        mapId: "3d8b3c0ff08fcc80a84accd3",
        mapTypeControl: false,
        streetViewControl: false,
      });
      new google.maps.marker.AdvancedMarkerElement({ position: churchLocation, map, title: "Kingdom Covenant Ministries International" });
      placeholder.style.display = "none";
    } catch (error) {
      console.error(`Error initializing map with ID ${mapId}:`, error);
    }
  };

  initSingleMap("churchMap", ".map-loading-placeholder");
  initSingleMap("contactPageMap", ".contact-map-loading-placeholder");

  // Setup "Get Directions" buttons after maps are initialized
  document.querySelectorAll(".get-directions-btn").forEach(button => {
    button.addEventListener("click", () => {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${churchLocation.lat},${churchLocation.lng}`, "_blank");
    });
  });
}

// Attach to the window object to be globally accessible
(window as any).initMaps = initMaps;


// =========================================
// Main DOMContentLoaded Event Listener
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  AOS.init({
    duration: 1000,
    easing: "ease-in-out",
    once: true,
  });

  initializeLivestream();
  setInterval(initializeLivestream, 30000);
  initializeNavbar();
  initializeSmoothScroll();
  initializeClickToCopy();
  initializeDarkMode();
  initializeMaps();
});
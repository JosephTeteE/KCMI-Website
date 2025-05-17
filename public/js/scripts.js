// public/js/scripts.js

// =========================================================================
// OVERVIEW: This file contains all the frontend JavaScript logic for the KCMI website.
// It handles form submissions, livestream embedding, navigation behaviors,
// animations, Google Maps integration, and dark mode functionality.
//
// FOR FUTURE DEVELOPERS: Please read the comments carefully to understand the
// purpose and implementation of each section. When modifying code, ensure
// you understand the potential impact on other parts of the website.
// =========================================================================

// =========================================================================
// === Initialize reCAPTCHA for Contact & Subscription Forms ===
//
// Purpose: This section handles the initialization and execution of Google
// reCAPTCHA v3 for both the contact form and the WhatsApp subscription form
// to prevent spam submissions.
// =========================================================================
function onLoadRecaptcha() {
  console.log("Initializing reCAPTCHA...");

  try {
    grecaptcha.ready(function () {
      console.log("reCAPTCHA API is ready.");

      // --- Contact Form reCAPTCHA ---
      const contactForm = document.getElementById("contactForm");
      if (contactForm) {
        console.log(
          "Found contact form. Adding reCAPTCHA execution on submit."
        );
        contactForm.addEventListener("submit", async function (event) {
          event.preventDefault();

          console.log("Contact form submission initiated.");

          const submitBtn = document.getElementById("submitBtn");
          submitBtn.disabled = true;
          submitBtn.textContent = "Sending...";

          const email = document.getElementById("email").value;
          const phone = document.getElementById("phone").value;
          const message = document.getElementById("message").value;
          const statusElement = document.getElementById("formStatus");

          statusElement.textContent = "Sending message...";
          statusElement.style.color = "blue";

          try {
            console.log("Generating reCAPTCHA token for contact form...");
            const recaptchaToken = await grecaptcha.execute(
              "6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac", // Site key - DO NOT HARDCODE SENSITIVE INFO IN PRODUCTION
              { action: "contact" }
            );
            console.log(
              "Contact form reCAPTCHA token generated:",
              recaptchaToken
            );
            document.getElementById("recaptchaToken").value = recaptchaToken;

            console.log("Sending contact form data to server...");
            const response = await fetch(
              "https://kcmi-backend.onrender.com/submit-contact", // Backend API endpoint
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, phone, message, recaptchaToken }),
              }
            );
            console.log("Contact form response status:", response.status);
            const data = await response.json();
            console.log("Contact form response data:", data);

            if (data.success) {
              statusElement.textContent = "Message sent successfully!";
              statusElement.style.color = "green";
              contactForm.reset();
            } else {
              statusElement.textContent = "Error: " + data.message;
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
      } else {
        console.warn("Contact form not found.");
      }

      // --- WhatsApp Subscription Form reCAPTCHA ---
      const whatsappForm = document.getElementById("whatsappSubscriptionForm");
      if (whatsappForm) {
        console.log(
          "Found WhatsApp subscription form. Adding event listener for reCAPTCHA on submit."
        );
        whatsappForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const email = document.getElementById("whatsappEmail").value;
          try {
            console.log("Generating reCAPTCHA token for subscription form...");
            const recaptchaToken = await grecaptcha.execute(
              "6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac", // Site key - DO NOT HARDCODE SENSITIVE INFO IN PRODUCTION
              { action: "submit_subscription" }
            );
            console.log("reCAPTCHA token generated:", recaptchaToken);
            console.log("Submitting subscription form data...");
            const response = await fetch(
              "https://kcmi-backend.onrender.com/subscribe", // Backend API endpoint
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: email,
                  subscriptionType: "whatsapp",
                  recaptchaToken: recaptchaToken,
                }),
              }
            );
            console.log("Subscription form response status:", response.status);
            const data = await response.json();
            console.log("Subscription form response data:", data);
            alert(data.message);
            if (data.success) {
              const modal = bootstrap.Modal.getInstance(
                document.getElementById("whatsappModal")
              );
              if (modal) {
                modal.hide();
                whatsappForm.reset();
              }
            }
          } catch (error) {
            console.error("Subscription Error:", error);
            alert("An error occurred. Please try again.");
          }
        });
      } else {
        console.warn("WhatsApp subscription form not found.");
      }
    });
  } catch (error) {
    console.error("reCAPTCHA initialization error:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================================================
  // === Livestream Embed Code Fetching and Loading ===
  //
  // Purpose: Fetches the livestream embed code from the backend API and
  // dynamically updates the designated container on the page. This allows
  // for easy updating of the embedded video without modifying the frontend code.
  // ==========================================================================
  console.log("Document fully loaded, initializing livestream fetching...");

  try {
    console.log("Fetching livestream embed code...");

    const response = await fetch(
      "https://kcmi-backend.onrender.com/api/livestream" // Backend API endpoint
    );

    console.log(`Livestream fetch response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    console.log("Livestream embed code retrieved:", data);

    const embedCode = data.embedCode ? data.embedCode.trim() : "";

    const livestreamContainer = document.getElementById(
      "livestream-video-container"
    );

    if (embedCode) {
      console.log("Updating livestream container with embed code...");

      if (livestreamContainer) {
        livestreamContainer.innerHTML = embedCode;
      }
    } else {
      console.warn("No embed code found.");
    }
  } catch (error) {
    console.error("Error fetching livestream:", error);
  }

  // ==========================================================================
  // === Navbar Toggler and Click-Outside-to-Close Logic ===
  //
  // Purpose: Handles the behavior of the mobile navbar. When the toggler button
  // is clicked, it adds/removes a class to open/close the navbar. Additionally,
  // it adds an event listener to close the navbar when the user clicks outside
  // of it.
  // ==========================================================================
  const navbarToggler = document.querySelector(".navbar-toggler");
  const body = document.body;

  if (navbarToggler) {
    navbarToggler.addEventListener("click", function () {
      body.classList.toggle("navbar-open"); // Class to control body overflow and potential styling
    });
  }

  document.addEventListener("click", function (event) {
    const navbar = document.querySelector(".navbar-collapse");

    if (
      navbar &&
      navbarToggler &&
      !navbar.contains(event.target) &&
      !navbarToggler.contains(event.target)
    ) {
      if (navbar.classList.contains("show")) {
        const bsCollapse = new bootstrap.Collapse(navbar); // Bootstrap collapse object

        bsCollapse.hide();
        body.classList.remove("navbar-open");
      }
    }
  });

  // ==========================================================================
  // === Smooth Scroll for Anchor Links ===
  //
  // Purpose: Implements smooth scrolling functionality for all anchor links (<a>
  // tags with href starting with '#') on the page.
  // ==========================================================================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();

      const targetElement = document.querySelector(this.getAttribute("href"));

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // ==========================================================================
  // === Initialize AOS (Animate On Scroll) ===
  //
  // Purpose: Initializes the Animate On Scroll (AOS) library to add scroll-triggered
  // animations to elements with the `data-aos` attribute. Configuration options
  // are set here. For more details, refer to the AOS library documentation.
  // ==========================================================================
  AOS.init({
    duration: 1000, // Animation duration in milliseconds
    easing: "ease-in-out", // Animation easing
    once: true, // Whether animation should happen only once on scroll
    mirror: false, // Whether elements should animate out while scrolling past them
  });

  // ==========================================================================
  // === Click-to-Copy WhatsApp Number Functionality ===
  //
  // Purpose: Makes the WhatsApp number clickable and copies it to the user's
  // clipboard when clicked. Provides visual feedback to the user upon successful copy.
  // ==========================================================================
  const whatsappNumberElement = document.getElementById("DFRwhatsappNumber");

  if (whatsappNumberElement) {
    whatsappNumberElement.addEventListener("click", function () {
      const number = this.textContent.trim();

      navigator.clipboard
        .writeText(number)
        .then(() => {
          const originalText = this.textContent;
          this.textContent = "Copied to Clipboard!";
          setTimeout(() => {
            this.textContent = originalText;
          }, 1000); // Revert text after 1 second
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy WhatsApp number. Please try again.");
        });
    });
  }

  // ==========================================================================
  // === Watch Live Button Update Logic ===
  //
  // Purpose: Periodically checks the backend API to determine if the livestream
  // is currently live. Updates the "Watch Live" button's text and appearance
  // accordingly.
  // ==========================================================================
  const watchLiveButton = document
    .getElementById("watch-live-container")
    .querySelector("a"); // Select the <a> tag inside the container

  async function checkLivestreamStatus() {
    try {
      const response = await fetch(
        "https://kcmi-backend.onrender.com/api/livestream" // Backend API endpoint
      );
      const data = await response.json();
      console.log("API response:", data); // Log the API response

      if (data.isLive) {
        watchLiveButton.textContent = "Join Us Live";
        watchLiveButton.style.backgroundColor = "green";
      } else {
        watchLiveButton.textContent = "Rewatch the Last Service";
        watchLiveButton.style.backgroundColor = "red";
      }
      document.getElementById("watch-live-container").style.display = "block";
    } catch (error) {
      console.error("Error fetching livestream data:", error); // Log fetch errors
      watchLiveButton.textContent = "Watch Live";
      watchLiveButton.style.backgroundColor = "gray";
    }
  }

  // Call the function initially and then periodically
  checkLivestreamStatus();
  setInterval(checkLivestreamStatus, 30000); // Check every 30 seconds - adjust as needed
});

// ==========================================================================
// Dark Mode Toggle
//
// Purpose: Implements the dark mode toggle functionality. It checks the user's
// system preference and local storage to set the initial theme. It also
// handles the click event of the toggle button to switch between light and
// dark modes and stores the user's preference in local storage.
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
  const darkModeToggle = document.getElementById("darkModeToggle");
  const darkIcon = document.getElementById("darkIcon");
  const lightIcon = document.getElementById("lightIcon");
  const prefersDarkMode = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  // Check local storage for dark mode preference, or system preference if none is set
  if (
    localStorage.getItem("darkMode") === "enabled" ||
    (prefersDarkMode && localStorage.getItem("darkMode") !== "disabled")
  ) {
    document.documentElement.setAttribute("data-bs-theme", "dark");
    darkIcon.style.display = "none";
    lightIcon.style.display = "inline";
  }

  darkModeToggle.addEventListener("click", function () {
    const isDarkMode =
      document.documentElement.getAttribute("data-bs-theme") === "dark";
    document.documentElement.setAttribute(
      "data-bs-theme",
      isDarkMode ? "light" : "dark"
    );

    if (isDarkMode) {
      localStorage.setItem("darkMode", "disabled");
      darkIcon.style.display = "inline";
      lightIcon.style.display = "none";
    } else {
      localStorage.setItem("darkMode", "enabled");
      darkIcon.style.display = "none";
      lightIcon.style.display = "inline";
    }
  });
});

// ==========================================================================
// Google Maps JavaScript API Implementation
//
// Purpose: This section handles the loading and initialization of the Google
// Maps JavaScript API and displays a map on both the contact page and the
// index page. It also includes functionality for the "Get Directions" button.
//
// Key elements:
// - Server-side proxying for API key security
// - Caching for better performance
// - Initializes separate maps for the index page ("churchMap") and contact page ("contactPageMap").
// - Uses Advanced Markers for improved marker customization and performance.
// - Handles loading states and error scenarios for the map display.
// - Sets up event listeners for the "Get Directions" buttons.
// ==========================================================================
// Church location coordinates
const churchLocation = {
  mapId: "3d8b3c0ff08fcc80a84accd3",
  lat: 4.831148938457418,
  lng: 7.01167364093468,
};

// Initialize maps for both pages
function initMaps() {
  console.log("Google Maps API loaded, initializing maps...");

  // Initialize index page map if it exists
  const indexMapElement = document.getElementById("churchMap");
  if (indexMapElement) {
    initMap("churchMap", ".map-loading-placeholder");
  }

  // Initialize contact page map if it exists
  const contactMapElement = document.getElementById("contactPageMap");
  if (contactMapElement) {
    initMap("contactPageMap", ".contact-map-loading-placeholder");
  }
}

// Initialize a single map instance
function initMap(mapId, placeholderSelector) {
  const mapElement = document.getElementById(mapId);
  const placeholder = document.querySelector(placeholderSelector);

  if (!mapElement || !placeholder) {
    console.error(`Map elements not found for ${mapId}`);
    return;
  }

  try {
    const map = new google.maps.Map(mapElement, {
      center: churchLocation,
      zoom: 16,
      mapId: "3d8b3c0ff08fcc80a84accd3",
      mapTypeId: "roadmap",
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }],
        },
      ],
      zoomControl: false,
      mapTypeControl: true,
      scaleControl: true,
      streetViewControl: true,
    });

    // Create an Advanced Marker
    new google.maps.marker.AdvancedMarkerElement({
      position: churchLocation,
      map: map,
      title: "Kingdom Covenant Ministries International",
    });

    placeholder.style.display = "none";
  } catch (error) {
    console.error(`Error initializing ${mapId}:`, error);
    handleMapError();
  }
}

// Load map data from server proxy
async function loadMapData() {
  try {
    const response = await fetch(
      "https://kcmi-backend.onrender.com/api/maps-proxy"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to load map data:", error);
    throw error;
  }
}

// Main initialization for Google Maps API
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const mapData = await loadMapData();

    // Load the Google Maps API asynchronously
    await new Promise((resolve, reject) => {
      if (window.google?.maps) {
        console.log("Google Maps already loaded");
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapData.apiKey}&callback=initMaps&loading=async&v=beta&libraries=marker`;
      script.async = true;
      script.defer = true;
      script.onerror = reject;
      document.head.appendChild(script);

      script.onload = resolve;
    });

    // Setup direction buttons
    document.querySelectorAll(".get-directions-btn").forEach((button) => {
      button.addEventListener("click", () => {
        window.open(
          `https://www.google.com/maps/dir/?api=1&destination=${churchLocation.lat},${churchLocation.lng}&travelmode=driving`,
          "_blank"
        );
      });
    });
  } catch (error) {
    console.error("Map initialization failed:", error);
    handleMapError();
  }
});

// Function to handle map loading errors
function handleMapError() {
  console.error("Handling map error by displaying fallback messages.");

  // Update all loading placeholders
  document
    .querySelectorAll(
      ".map-loading-placeholder, .contact-map-loading-placeholder"
    )
    .forEach((placeholder) => {
      const errorText = placeholder.querySelector("p");
      const spinner = placeholder.querySelector(".spinner-border");

      if (errorText) {
        errorText.textContent =
          "Unable to load maps. Please refresh or try again later.";
      }
      if (spinner) {
        spinner.style.display = "none";
      }

      // Add fallback link
      const fallbackLink = document.createElement("a");
      fallbackLink.href = `https://www.google.com/maps/place/${churchLocation.lat},${churchLocation.lng}`;
      fallbackLink.textContent = "Open in Google Maps";
      fallbackLink.className = "btn btn-secondary mt-2";
      fallbackLink.target = "_blank";

      placeholder.appendChild(fallbackLink);
    });
}

// ==========================================================================
// Navbar Video Container Logic
//
// Purpose: Controls the behavior of the video container in the homepage header
// when the mobile navbar is open. It ensures the video container adjusts its
// position to be below the expanded navbar on smaller screens.
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
  const navbarToggler = document.querySelector(".navbar-toggler");
  const videoContainer = document.querySelector(
    ".homepage-header-video-container"
  );
  const navbar = document.querySelector(".navbar-collapse");

  if (navbarToggler && videoContainer) {
    navbarToggler.addEventListener("click", function () {
      videoContainer.classList.toggle("navbar-open"); // Class to adjust video container position
    });
  }

  function resetVideoContainer() {
    if (window.innerWidth >= 992) {
      // On larger screens, reset the video container's top position
      videoContainer.classList.remove("navbar-open");
      videoContainer.style.top = "0";
    }
  }

  window.addEventListener("resize", function () {
    const navbar = document.querySelector(".navbar-collapse");
    const videoContainer = document.querySelector(
      ".homepage-header-video-container"
    );

    if (navbar && videoContainer && navbar.classList.contains("show")) {
      // Adjust video container top position to be below the open navbar
      const navbarHeight = navbar.offsetHeight;
      videoContainer.style.top = `${navbarHeight}px`;
    } else {
      // Reset top position when navbar is closed or on larger screens
      videoContainer.style.top = "0";
    }
  });

  // Initial reset check when the page loads
  resetVideoContainer();
});

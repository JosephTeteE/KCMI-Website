// public/js/scripts.js

// This file contains the JavaScript logic for the frontend of the website.

// =========================================================================

// === Initialize reCAPTCHA for Contact & Subscription Forms ===

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
              "6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac",
              { action: "contact" }
            );
            console.log(
              "Contact form reCAPTCHA token generated:",
              recaptchaToken
            );
            document.getElementById("recaptchaToken").value = recaptchaToken;

            console.log("Sending contact form data to server...");
            const response = await fetch(
              "https://kcmi-backend.onrender.com/submit-contact",
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
              "6LcRdOsqAAAAAMzghoNjWqpTB3AjOBayn8KIpxac",
              { action: "submit_subscription" }
            );
            console.log("reCAPTCHA token generated:", recaptchaToken);
            console.log("Submitting subscription form data...");
            const response = await fetch(
              "https://kcmi-backend.onrender.com/subscribe",
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

  // ==========================================================================

  console.log("Document fully loaded, initializing livestream fetching...");

  try {
    console.log("Fetching livestream embed code...");

    const response = await fetch(
      "https://kcmi-backend.onrender.com/api/livestream"
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

  // ==========================================================================

  const navbarToggler = document.querySelector(".navbar-toggler");

  const body = document.body;

  if (navbarToggler) {
    navbarToggler.addEventListener("click", function () {
      body.classList.toggle("navbar-open");
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
        const bsCollapse = new bootstrap.Collapse(navbar);

        bsCollapse.hide();

        body.classList.remove("navbar-open");
      }
    }
  });

  // ==========================================================================

  // === Smooth Scroll for Anchor Links ===

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

  // ==========================================================================

  AOS.init({
    duration: 1000,
    easing: "ease-in-out",
    once: true,
    mirror: false,
  });

  // ==========================================================================

  // === Click-to-Copy WhatsApp Number Functionality ===

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
          }, 1000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);

          alert("Failed to copy WhatsApp number. Please try again.");
        });
    });
  }

  // ==========================================================================

  // === Watch Live Button Update Logic ===

  // ==========================================================================

  const watchLiveButton = document
    .getElementById("watch-live-container")
    .querySelector("a"); // Select the <a> tag inside the container

  async function checkLivestreamStatus() {
    try {
      const response = await fetch(
        "https://kcmi-backend.onrender.com/api/livestream"
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
  setInterval(checkLivestreamStatus, 30000); // Check every 30 seconds
});

// ==========================================================================
// Dark Mode Toggle
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
// Map Logic
// ==========================================================================
// This code initializes a Google Map and handles the loading state of the map on contact-page & index-page

document.addEventListener("DOMContentLoaded", function () {
  // Common coordinates
  const churchCoords = {
    lat: 4.831148938457418,
    lng: 7.01167364093468,
  };

  // Initialize homepage map
  const initMap = (mapId, placeholderClass) => {
    const placeholder = document.querySelector(placeholderClass);
    const map = document.getElementById(mapId);

    if (!map || !placeholder) return;

    setTimeout(() => {
      map.src = `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3975.490292089824!2d${churchCoords.lng}!3d${churchCoords.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNMKwNDgnNTYuMiJOIDfCsDAyJzU5LjQiRQ!5e0!3m2!1sen!2sng!4v1620000000000!5m2!1sen!2sng`;

      map.onload = function () {
        placeholder.style.display = "none";
        map.style.display = "block";
      };

      setTimeout(() => {
        if (map.style.display === "none") {
          placeholder.querySelector("p").textContent =
            "Map failed to load. Please try again.";
        }
      }, 5000);
    }, 1000);
  };

  // Initialize both maps
  initMap("churchMap", ".homepage-map-container .map-loading-placeholder");
  initMap("contactPageMap", ".contact-page .map-loading-placeholder");

  // Button functionality (homepage only)
  document.getElementById("openInMaps")?.addEventListener("click", () => {
    window.open(
      `https://www.google.com/maps?q=${churchCoords.lat},${churchCoords.lng}`
    );
  });

  document.getElementById("getDirections")?.addEventListener("click", () => {
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${churchCoords.lat},${churchCoords.lng}`
    );
  });
});

// ==========================================================================
// Navbar Video Container Logic
// ==========================================================================
document.addEventListener("DOMContentLoaded", function () {
  const navbarToggler = document.querySelector(".navbar-toggler");
  const videoContainer = document.querySelector(
    ".homepage-header-video-container"
  );
  const navbar = document.querySelector(".navbar-collapse");

  if (navbarToggler && videoContainer) {
    navbarToggler.addEventListener("click", function () {
      videoContainer.classList.toggle("navbar-open");
    });
  }

  function resetVideoContainer() {
    if (window.innerWidth >= 992) {
      videoContainer.classList.remove("navbar-open");
      videoContainer.style.top = "0"; // Reset top position
    }
  }

  window.addEventListener("resize", function () {
    const navbar = document.querySelector(".navbar-collapse");
    const videoContainer = document.querySelector(
      ".homepage-header-video-container"
    );

    if (navbar && videoContainer && navbar.classList.contains("show")) {
      const navbarHeight = navbar.offsetHeight;
      videoContainer.style.top = `${navbarHeight}px`;
    } else {
      videoContainer.style.top = "0";
    }
  });

  // Initial reset check
  resetVideoContainer();
});

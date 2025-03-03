// public/js/scripts.js
// This file contains the JavaScript logic for the frontend of the website.
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

  // =========================================================================
  // === Initialize reCAPTCHA for Contact & Subscription Forms ===
  // =========================================================================
  function onLoadRecaptcha() {
    console.log("Initializing reCAPTCHA...");

    try {
      grecaptcha.ready(function () {
        console.log("reCAPTCHA API is ready.");

        // Contact Form reCAPTCHA (handled inline in contact-us.html)
        console.log("Contact form reCAPTCHA logic should be executed inline.");

        // WhatsApp Subscription Form reCAPTCHA
        const whatsappForm = document.getElementById(
          "whatsappSubscriptionForm"
        );
        if (whatsappForm) {
          console.log(
            "Found WhatsApp subscription form. Adding event listener."
          );

          whatsappForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const email = document.getElementById("whatsappEmail").value;

            try {
              console.log(
                "Generating reCAPTCHA token for subscription form..."
              );
              const recaptchaToken = await grecaptcha.execute(
                "6LdwouMqAAAAANg9Y2OM_A9TTHayJXDheteqd-kl",
                { action: "submit_subscription" }
              );
              console.log("reCAPTCHA token generated:", recaptchaToken);

              console.log("Submitting subscription form data...");
              const response = await fetch("/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: email,
                  subscriptionType: "whatsapp",
                  recaptchaToken: recaptchaToken,
                }),
              });

              console.log(
                "Subscription form response status:",
                response.status
              );
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
        watchLiveButton.textContent = "Revisit the Last Service";
        watchLiveButton.style.backgroundColor = "red";
      }
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

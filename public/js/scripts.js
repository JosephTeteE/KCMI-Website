// public/js/scripts.js //

document.addEventListener("DOMContentLoaded", async () => {
  // ==========================================================================
  // === Livestream Embed Code Fetching and Loading ===
  // ==========================================================================
  try {
    const response = await fetch("/api/livestream");
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    const data = await response.json();
    const embedCode = data.embedCode ? data.embedCode.trim() : "";

    const livestreamContainer = document.getElementById(
      "livestream-video-container"
    );
    const watchLiveContainer = document.getElementById("watch-live-container");

    if (embedCode) {
      if (livestreamContainer) livestreamContainer.innerHTML = embedCode;
      if (watchLiveContainer) watchLiveContainer.style.display = "block";
    } else {
      if (watchLiveContainer) watchLiveContainer.style.display = "none";
    }
  } catch (error) {
    console.error("Error fetching livestream:", error);
  }

  // ==========================================================================
  // === Navbar Toggler and Click-Outside-to-Close Logic ===
  // ==========================================================================
  const navbarToggler = document.querySelector(".navbar-toggler");
  const body = document.body;

  navbarToggler.addEventListener("click", function () {
    body.classList.toggle("navbar-open");
  });

  document.addEventListener("click", function (event) {
    const navbar = document.querySelector(".navbar-collapse");
    if (
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

  // =========================================================================
  // === Navbar Search Functionality ===
  // =========================================================================
  let matches = []; // Array to store all highlighted search matches (HTML elements).
  let currentMatchIndex = -1; // Index of the currently highlighted match in the 'matches' array.
  let originalHTML = new Map(); // Map to store the original HTML content of elements before highlighting, for reset.
  let lastSearchTerm = ""; // Stores the last search term to optimize consecutive searches.
  let expandedAccordions = []; // Array to keep track of accordions expanded during search, to collapse on clear.
  let expandedSeeMoreCards = []; // Array to track "see more" cards expanded, to collapse on clear.

  const searchForm = document.getElementById("search-form");
  const searchInput = document.getElementById("search-input");
  const prevMatchButton = document.getElementById("prev-match");
  const nextMatchButton = document.getElementById("next-match");
  const clearSearchButton = document.getElementById("clear-search");

  if (searchForm) searchForm.addEventListener("submit", performSearch);
  if (prevMatchButton)
    prevMatchButton.addEventListener("click", () => navigateMatches(-1));
  if (nextMatchButton)
    nextMatchButton.addEventListener("click", () => navigateMatches(1));
  if (clearSearchButton)
    clearSearchButton.addEventListener("click", clearSearch);

  /**
   * Checks if an element is actually visible on the page (not hidden by CSS display/visibility).
   * @param {HTMLElement} element - The element to check for visibility.
   * @returns {boolean} - True if the element is visible, false otherwise.
   */
  function isVisible(element) {
    if (!element || !document.body.contains(element)) return false;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none") return false;

    function checkParentVisibility(el) {
      if (!el || el === document.body) return true;
      const parentStyle = getComputedStyle(el);
      if (parentStyle.visibility === "hidden" || parentStyle.display === "none")
        return false;
      return checkParentVisibility(el.parentElement);
    }

    return checkParentVisibility(element);
  }

  function performSearch(event) {
    event.preventDefault();

    const searchTerm = searchInput.value.trim().toLowerCase();
    if (!searchTerm) {
      alert("Please enter a search term.");
      return;
    }

    if (searchTerm === lastSearchTerm && matches.length > 0) {
      navigateMatches(1);
      return;
    }

    clearSearch();
    lastSearchTerm = searchTerm;
    expandedAccordions = [];
    expandedSeeMoreCards = [];

    const textElements = Array.from(
      document.querySelectorAll("p, h1, h2, h3, h4, h5, h6, span, div, li, a")
    ).filter(isVisible);

    textElements.forEach((element) => highlightText(element, searchTerm));

    document.querySelectorAll(".accordion-item").forEach((item) => {
      const question =
        item.querySelector(".accordion-button")?.textContent.toLowerCase() ||
        "";
      const answer =
        item.querySelector(".accordion-body")?.textContent.toLowerCase() || "";
      const collapseElement = item.querySelector(".accordion-collapse");

      if (question.includes(searchTerm) || answer.includes(searchTerm)) {
        const bsCollapse = new bootstrap.Collapse(collapseElement, {
          toggle: false,
        });
        expandedAccordions.push(bsCollapse);
        bsCollapse.show();

        collapseElement.addEventListener(
          "shown.bs.collapse",
          () => highlightText(item, searchTerm),
          { once: true }
        );
      }
    });

    document.querySelectorAll(".col[data-country]").forEach((cardCol) => {
      const cardTextElement = cardCol.querySelector(".card-text");
      const seeMoreButton = cardCol.querySelector(".see-more");
      const cardTextContent = cardTextElement?.textContent.toLowerCase() || "";

      if (cardTextContent.includes(searchTerm)) {
        expandedSeeMoreCards.push({ cardTextElement, seeMoreButton });
        if (!cardTextElement.classList.contains("expanded")) {
          cardTextElement.classList.add("expanded");
          seeMoreButton.textContent = "See Less";
        }
        highlightText(cardTextElement, searchTerm);
      }
    });

    if (matches.length > 0) {
      updateNavigationButtons(true);
      currentMatchIndex = 0;
      highlightCurrentMatch();
    } else {
      alert("Search term not found.");
      updateNavigationButtons(false);
    }
  }

  function highlightText(element, searchTerm) {
    if (
      !element ||
      !searchTerm ||
      !element.innerText.toLowerCase().includes(searchTerm)
    )
      return;

    if (!originalHTML.has(element)) {
      originalHTML.set(element, element.innerHTML);
    }

    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, "gi");
    element.innerHTML = element.innerHTML.replace(
      regex,
      `<span class="highlight">$1</span>`
    );

    element
      .querySelectorAll(".highlight")
      .forEach((match) => matches.push(match));
  }

  function navigateMatches(direction) {
    if (matches.length === 0) return;

    removeCurrentHighlight();
    currentMatchIndex =
      (currentMatchIndex + direction + matches.length) % matches.length;
    highlightCurrentMatch();
  }

  function highlightCurrentMatch() {
    if (matches.length > 0 && currentMatchIndex !== -1) {
      matches[currentMatchIndex].classList.add("current-highlight");
      matches[currentMatchIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  function removeCurrentHighlight() {
    if (currentMatchIndex !== -1 && matches[currentMatchIndex]) {
      matches[currentMatchIndex].classList.remove("current-highlight");
    }
  }

  function clearSearch() {
    originalHTML.forEach((originalContent, element) => {
      if (document.body.contains(element)) {
        element.innerHTML = originalContent;
      }
    });

    originalHTML.clear();
    matches = [];
    currentMatchIndex = -1;
    searchInput.value = "";
    updateNavigationButtons(false);
    lastSearchTerm = "";

    expandedAccordions.forEach((bsCollapse) => bsCollapse.hide()); // Collapse accordions expanded during search
    expandedAccordions = [];

    expandedSeeMoreCards.forEach(({ cardTextElement, seeMoreButton }) => {
      cardTextElement.classList.remove("expanded"); // Collapse "see more" card text
      seeMoreButton.textContent = "See More"; // Reset "see more" button text
    });
    expandedSeeMoreCards = [];
  }

  function updateNavigationButtons(show) {
    const display = show ? "inline-block" : "none";
    if (prevMatchButton) prevMatchButton.style.display = display;
    if (nextMatchButton) nextMatchButton.style.display = display;
    if (clearSearchButton) clearSearchButton.style.display = display;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // =========================================================================
  // === Initialize reCAPTCHA for Contact & Subscription Forms ===
  // =========================================================================
  function onLoadRecaptcha() {
    grecaptcha.ready(function () {
      console.log("reCAPTCHA is ready!");
    });
  }

  // =========================================================================
  // === Footer Subscription Form Logic ===
  // =========================================================================
  const whatsappForm = document.getElementById("whatsappSubscriptionForm");
  if (whatsappForm) {
    whatsappForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("whatsappEmail").value;

      try {
        const recaptchaToken = await grecaptcha.execute(
          "6LdwouMqAAAAANg9Y2OM_A9TTHayJXDheteqd-kl", // Subscription reCAPTCHA key
          { action: "submit_subscription" }
        );

        const response = await fetch("/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email,
            subscriptionType: "whatsapp",
            recaptchaToken: recaptchaToken,
          }),
        });

        const data = await response.json();
        alert(data.message);

        if (data.success) {
          const modal = bootstrap.Modal.getInstance(
            document.getElementById("whatsappModal")
          );
          modal.hide();
          whatsappForm.reset();
        }
      } catch (error) {
        console.error("Subscription Error:", error);
        alert("An error occurred. Please try again.");
      }
    });
  }

  // =========================================================================
  // === Initialize AOS (Animate On Scroll) ===
  // =========================================================================
  AOS.init({
    duration: 1000,
    easing: "ease-in-out",
    once: true,
    mirror: false,
  });

  // =========================================================================
  // === Click-to-Copy WhatsApp Number Functionality ===
  // =========================================================================
  const whatsappNumberElement = document.getElementById("DFRwhatsappNumber");

  if (whatsappNumberElement) {
    whatsappNumberElement.addEventListener("click", function () {
      const number = this.textContent.trim(); // Get the WhatsApp number from the element's text

      // Copy the number to the clipboard
      navigator.clipboard
        .writeText(number)
        .then(() => {
          // Provide feedback to the user
          const originalText = this.textContent;
          this.textContent = "Copied to Clipboard!";
          setTimeout(() => {
            this.textContent = originalText; // Reset the text after 2 seconds
          }, 1000);
        })
        .catch((err) => {
          console.error("Failed to copy:", err);
          alert("Failed to copy WhatsApp number. Please try again.");
        });
    });
  }

  // =========================================================================
  // === Smooth Scroll for Anchor Links ===
  // =========================================================================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });
});

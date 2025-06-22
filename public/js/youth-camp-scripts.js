// public/js/youth-camp-scripts.js

// Initialize camp-specific reCAPTCHA v2
function initializeCampRecaptcha() {
  console.log("Initializing camp reCAPTCHA");

  const campForm = document.getElementById("campRegistrationForm");
  const submitBtn = document.getElementById("submitCampFormBtn");

  if (!campForm || !submitBtn) {
    console.error("Camp form elements not found");
    return;
  }

  if (typeof grecaptcha === "undefined") {
    console.error("reCAPTCHA not loaded");
    const formStatus = document.getElementById("formStatus");
    if (formStatus) {
      formStatus.textContent =
        "Security verification failed to load. Please refresh the page.";
      formStatus.style.color = "red";
    }
    return;
  }

  // Render v2 invisible recaptcha
  const recaptchaWidgetId = grecaptcha.render(submitBtn, {
    sitekey: "6LdcG2grAAAAAKp6kKoG58Nmu0-6NPHcj7rkd6Zk",
    size: "invisible",
    badge: "bottomright",
    callback: function (token) {
      document.getElementById("recaptchaToken").value = token;
      submitCampForm();
    },
  });

  // Camp form submission logic
  campForm.addEventListener("submit", function (e) {
    e.preventDefault();
    // Execute reCAPTCHA
    grecaptcha.execute(recaptchaWidgetId);
  });
}

// Rest of your existing code remains the same...

// Camp form submission handler
function submitCampForm() {
  const form = document.getElementById("campRegistrationForm");
  const submitBtn = document.getElementById("submitCampFormBtn");
  const formStatus = document.getElementById("formStatus");
  const successMessage = document.getElementById("successMessage");

  submitBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
  if (formStatus) {
    formStatus.textContent = "Processing your registration...";
    formStatus.style.color = "blue";

    const progressBar = document.createElement("div");
    progressBar.className = "upload-progress mt-3";
    progressBar.style.height = "10px";
    progressBar.style.background = "#ccc";
    progressBar.style.borderRadius = "5px";
    progressBar.style.overflow = "hidden";
    formStatus.appendChild(progressBar);

    const fill = document.createElement("div");
    fill.style.height = "100%";
    fill.style.width = "0%";
    fill.style.background = "green";
    fill.style.transition = "width 0.3s ease";
    progressBar.appendChild(fill);
  }

  const formData = new FormData(form);
  const xhr = new XMLHttpRequest();
  xhr.open("POST", "https://kcmi-backend.onrender.com/api/camp-registration");

  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable && formStatus) {
      const progressBar = formStatus.querySelector(".upload-progress");
      if (progressBar) {
        const fill = progressBar.querySelector("div");
        if (fill) {
          const percent = (event.loaded / event.total) * 100;
          fill.style.width = percent + "%";
        }
      }
    }
  };

  xhr.onload = function () {
    try {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status === 200 && data.success) {
        localStorage.setItem("lastCampSubmission", Date.now().toString());
        if (formStatus) formStatus.textContent = "";
        if (form) form.style.display = "none";
        if (successMessage) successMessage.style.display = "block";
      } else if (formStatus) {
        formStatus.textContent =
          "Error: " + (data.message || "Something went wrong.");
        formStatus.style.color = "red";
      }
    } catch (e) {
      if (formStatus) {
        formStatus.textContent = "Unexpected response from server.";
        formStatus.style.color = "red";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Register for Camp";
      grecaptcha.reset();
      if (formStatus) {
        const progressBar = formStatus.querySelector(".upload-progress");
        if (progressBar && progressBar.parentNode === formStatus) {
          formStatus.removeChild(progressBar);
        }
      }
    }
  };

  xhr.onerror = function () {
    if (formStatus) {
      formStatus.textContent = "Network error. Please try again.";
      formStatus.style.color = "red";
    }
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Register for Camp";
    grecaptcha.reset();
    if (formStatus) {
      const progressBar = formStatus.querySelector(".upload-progress");
      if (progressBar && progressBar.parentNode === formStatus) {
        formStatus.removeChild(progressBar);
      }
    }
  };

  xhr.send(formData);
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  let isSubmitting = false;
  const form = document.getElementById("campRegistrationForm");
  const submitBtn = document.getElementById("submitCampFormBtn");
  const formStatus = document.getElementById("formStatus");

  // Initialize all copy functionality
  const setupCopyFunctionality = (spanElement, confirmationElement) => {
    if (spanElement) {
      spanElement.addEventListener("click", async function () {
        const accountNumber = this.childNodes[0].textContent.trim();

        try {
          await navigator.clipboard.writeText(accountNumber);
          console.log("Account number copied:", accountNumber);

          if (confirmationElement) {
            confirmationElement.style.display = "block";
            confirmationElement.style.animation = "fadeIn 0.3s ease-in-out";
          }
          spanElement.style.cursor = "default";

          const iconElement = spanElement.querySelector("i");
          if (iconElement) {
            iconElement.classList.remove("fa-copy");
            iconElement.classList.add("fa-check-circle", "text-success");
          }

          setTimeout(() => {
            if (confirmationElement) {
              confirmationElement.style.display = "none";
            }
            spanElement.style.cursor = "pointer";
            if (iconElement) {
              iconElement.classList.remove("fa-check-circle", "text-success");
              iconElement.classList.add("fa-copy");
            }
          }, 2000);
        } catch (err) {
          console.error("Failed to copy account number:", err);
          const errorMsg = document.createElement("div");
          errorMsg.className = "alert alert-danger mt-2";
          errorMsg.style.fontSize = "0.9em";
          errorMsg.innerHTML = `<i class="fas fa-exclamation-circle me-1"></i> Failed to copy. Please copy manually: ${accountNumber}`;
          spanElement.parentNode.insertBefore(
            errorMsg,
            spanElement.nextSibling
          );

          setTimeout(() => {
            errorMsg.remove();
          }, 5000);
        }
      });
    }
  };

  // Set up all account number copy elements
  const accountNumbers = [
    {
      element: document.getElementById("youthCampDonationAccountNumber"),
      confirmation: document.getElementById(
        "youthCampDonationCopyConfirmation"
      ),
    },
    {
      element: document.getElementById("accountNumber"),
      confirmation: document.getElementById("copyConfirmation"),
    },
  ];

  accountNumbers.forEach(({ element, confirmation }) => {
    if (element && confirmation) {
      setupCopyFunctionality(element, confirmation);
    }
  });

  // Add hover effects to donation benefits
  const benefitItems = document.querySelectorAll(
    ".youth-camp-donation-benefits .list-group-item"
  );
  benefitItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      const icon = this.querySelector("i");
      if (icon) icon.style.transform = "scale(1.2)";
    });

    item.addEventListener("mouseleave", function () {
      const icon = this.querySelector("i");
      if (icon) icon.style.transform = "scale(1)";
    });
  });

  // Pulse animation for donation icon
  const donationIcon = document.querySelector(".youth-camp-donation-icon i");
  if (donationIcon) {
    setInterval(() => {
      donationIcon.style.transform = "rotate(-5deg)";
      setTimeout(() => {
        donationIcon.style.transform = "rotate(5deg)";
      }, 1000);
      setTimeout(() => {
        donationIcon.style.transform = "rotate(0deg)";
      }, 2000);
    }, 8000);
  }

  // --- Receipt Upload Enhancement ---
  const paymentReceiptInput = document.getElementById("paymentReceipt");
  const dropPasteZone = document.getElementById("dropPasteZone");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const selectedFileNameSpan = document.getElementById("selectedFileName");
  const clearFileBtn = document.getElementById("clearFileBtn");
  const paymentReceiptInvalidFeedback = document.getElementById(
    "paymentReceiptInvalidFeedback"
  );

  function setReceiptFile(file) {
    const dataTransfer = new DataTransfer();
    if (file) dataTransfer.items.add(file);
    paymentReceiptInput.files = dataTransfer.files;

    const fileStatusIcon = document.getElementById("fileStatusIcon");
    const fileStatusText = document.getElementById("fileStatusText");

    if (file) {
      selectedFileNameSpan.textContent = file.name;
      fileNameDisplay.style.display = "flex";
      fileNameDisplay.classList.add("file-selected-state");
      dropPasteZone.style.display = "none";

      if (fileStatusIcon && fileStatusText) {
        fileStatusIcon.className = "fas fa-check-circle text-success me-2";
        fileStatusText.textContent = "File Uploaded:";
      }

      paymentReceiptInput.classList.remove("is-invalid");
      if (paymentReceiptInvalidFeedback) {
        paymentReceiptInvalidFeedback.style.display = "none";
      }
    } else {
      selectedFileNameSpan.textContent = "";
      fileNameDisplay.style.display = "none";
      fileNameDisplay.classList.remove("file-selected-state");
      dropPasteZone.style.display = "flex";

      if (fileStatusIcon && fileStatusText) {
        fileStatusIcon.className = "";
        fileStatusText.textContent = "";
      }
    }
  }

  // Setup file input handlers
  if (paymentReceiptInput && dropPasteZone) {
    const browseLink = dropPasteZone.querySelector(".browse-link");
    if (browseLink) {
      browseLink.addEventListener("click", (event) => {
        event.stopPropagation();
        paymentReceiptInput.click();
      });
    }

    paymentReceiptInput.addEventListener("change", function () {
      setReceiptFile(this.files.length > 0 ? this.files[0] : null);
    });

    dropPasteZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropPasteZone.classList.add("highlight");
    });

    dropPasteZone.addEventListener("dragleave", () => {
      dropPasteZone.classList.remove("highlight");
    });

    dropPasteZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropPasteZone.classList.remove("highlight");

      if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "application/pdf",
        ];
        const maxFileSize = 5 * 1024 * 1024;

        if (allowedTypes.includes(file.type) && file.size <= maxFileSize) {
          setReceiptFile(file);
        } else if (paymentReceiptInvalidFeedback) {
          paymentReceiptInput.classList.add("is-invalid");
          paymentReceiptInvalidFeedback.style.display = "block";
          paymentReceiptInvalidFeedback.textContent =
            "Invalid file. Only JPG, PNG, GIF, or PDF (max 5MB) are allowed.";
        }
      }
    });
  }

  document.addEventListener("paste", (event) => {
    if (
      dropPasteZone &&
      window.getComputedStyle(dropPasteZone).display !== "none"
    ) {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) setReceiptFile(file);
          break;
        }
      }
    }
  });

  if (clearFileBtn) {
    clearFileBtn.addEventListener("click", () => {
      setReceiptFile(null);
      paymentReceiptInput.classList.remove("is-invalid");
      if (paymentReceiptInvalidFeedback) {
        paymentReceiptInvalidFeedback.style.display = "none";
      }
    });
  }

  // Form validation
  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (isSubmitting) return;

      if (formStatus) {
        formStatus.textContent = "";
        formStatus.className = "mt-3 text-center fw-bold fs-5";
      }
      Array.from(form.elements).forEach((el) =>
        el.classList.remove("is-invalid")
      );

      // Client-side validation
      let isValid = true;
      const fullName = form.elements["fullName"].value.trim();
      const email = form.elements["email"].value.trim();
      const phoneNumber = form.elements["phoneNumber"].value.trim();
      const numPeople = parseInt(form.elements["numPeople"].value);
      const paymentReceipt = form.elements["paymentReceipt"].files[0];

      if (!fullName) {
        form.elements["fullName"].classList.add("is-invalid");
        isValid = false;
      }

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        form.elements["email"].classList.add("is-invalid");
        isValid = false;
      }

      if (!phoneNumber || !/^\+?[0-9\s-]{7,15}$/.test(phoneNumber)) {
        form.elements["phoneNumber"].classList.add("is-invalid");
        isValid = false;
      }

      if (isNaN(numPeople) || numPeople < 1 || numPeople > 10) {
        form.elements["numPeople"].classList.add("is-invalid");
        isValid = false;
      }

      if (!paymentReceipt) {
        form.elements["paymentReceipt"].classList.add("is-invalid");
        if (paymentReceiptInvalidFeedback) {
          paymentReceiptInvalidFeedback.style.display = "block";
        }
        isValid = false;
      }

      if (!isValid) {
        if (formStatus) {
          formStatus.textContent = "Please correct the errors in the form.";
          formStatus.style.color = "red";
        }
        return;
      }

      // All validation passed - trigger reCAPTCHA
      isSubmitting = true;
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
      if (formStatus) {
        formStatus.textContent = "Verifying with reCAPTCHA...";
        formStatus.style.color = "blue";
      }

      // The actual reCAPTCHA execution will be handled by the onCampRecaptchaLoad function
      // which is called when the reCAPTCHA v2 script loads
    });
  }

  // Highlight donation section
  function highlightDonationSection() {
    const donationSection = document.querySelector(
      ".youth-camp-donation-prompt-prominent"
    );
    if (donationSection) {
      donationSection.style.boxShadow = "0 0 0 3px rgba(124, 25, 99, 0.3)";
      setTimeout(() => (donationSection.style.boxShadow = ""), 1000);
    }
  }
  setTimeout(highlightDonationSection, 1500);
});

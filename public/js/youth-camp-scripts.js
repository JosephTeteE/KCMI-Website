// public/js/youth-camp-scripts.js
// Youth Camp Registration Form Script
// This script handles the youth camp registration form submission, validation, and reCAPTCHA integration.

document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("campRegistrationForm");
  const submitBtn = document.getElementById("submitCampFormBtn");
  const formStatus = document.getElementById("formStatus");
  const successMessage = document.getElementById("successMessage");
  const recaptchaTokenInput = document.getElementById("recaptchaToken");
  const recaptchaErrorDiv = document.getElementById("recaptchaError");

  let isSubmitting = false;

  // Initialize all copy functionality
  const setupCopyFunctionality = (spanElement, confirmationElement) => {
    if (spanElement) {
      spanElement.addEventListener("click", async function () {
        const accountNumber = this.childNodes[0].textContent.trim();

        try {
          await navigator.clipboard.writeText(accountNumber);
          console.log("Account number copied:", accountNumber);

          confirmationElement.style.display = "block";
          confirmationElement.style.animation = "fadeIn 0.3s ease-in-out";
          spanElement.style.cursor = "default";

          const iconElement = spanElement.querySelector("i");
          if (iconElement) {
            iconElement.classList.remove("fa-copy");
            iconElement.classList.add("fa-check-circle", "text-success");
          }

          setTimeout(() => {
            confirmationElement.style.display = "none";
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
    {
      element: document.getElementById("accountNumberBottom"),
      confirmation: document.getElementById("copyConfirmationBottom"),
    },
  ];

  accountNumbers.forEach(({ element, confirmation }) => {
    setupCopyFunctionality(element, confirmation);
  });

  // Add hover effects to donation benefits
  const benefitItems = document.querySelectorAll(
    ".youth-camp-donation-benefits .list-group-item"
  );
  benefitItems.forEach((item) => {
    item.addEventListener("mouseenter", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "scale(1.2)";
      }
    });

    item.addEventListener("mouseleave", function () {
      const icon = this.querySelector("i");
      if (icon) {
        icon.style.transform = "scale(1)";
      }
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

  // --- Start Receipt Upload Enhancement ---
  const paymentReceiptInput = document.getElementById("paymentReceipt");
  const dropPasteZone = document.getElementById("dropPasteZone");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const selectedFileNameSpan = document.getElementById("selectedFileName");
  const clearFileBtn = document.getElementById("clearFileBtn");
  const paymentReceiptInvalidFeedback = document.getElementById(
    "paymentReceiptInvalidFeedback"
  );

  // Function to set a file to the input and update display
  function setReceiptFile(file) {
    const dataTransfer = new DataTransfer();
    if (file) {
      dataTransfer.items.add(file);
    }
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
      paymentReceiptInvalidFeedback.style.display = "none";
      paymentReceiptInvalidFeedback.textContent =
        "Please upload a valid payment receipt (image or PDF, max 5MB).";
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

  const browseLink = dropPasteZone
    ? dropPasteZone.querySelector(".browse-link")
    : null;

  if (browseLink) {
    browseLink.addEventListener("click", (event) => {
      event.stopPropagation();
      paymentReceiptInput.click();
    });
  }

  if (paymentReceiptInput) {
    paymentReceiptInput.addEventListener("change", function () {
      if (this.files.length > 0) {
        setReceiptFile(this.files[0]);
      } else {
        setReceiptFile(null);
      }
    });
  }

  if (dropPasteZone) {
    dropPasteZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropPasteZone.classList.add("highlight");
    });

    dropPasteZone.addEventListener("dragleave", (event) => {
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
        } else {
          setReceiptFile(null);
          paymentReceiptInput.classList.add("is-invalid");
          paymentReceiptInvalidFeedback.style.display = "block";
          paymentReceiptInvalidFeedback.textContent =
            "Invalid file. Only JPG, PNG, GIF, or PDF (max 5MB) are allowed.";
          console.warn(
            "Invalid file dropped:",
            file.name,
            file.type,
            file.size
          );
        }
      }
    });
  }

  document.addEventListener("paste", (event) => {
    if (
      dropPasteZone &&
      window.getComputedStyle(dropPasteZone).display !== "none" &&
      document.activeElement !== paymentReceiptInput
    ) {
      const items = event.clipboardData.items;
      let pastedFile = null;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            const allowedTypes = [
              "image/jpeg",
              "image/png",
              "image/gif",
              "application/pdf",
            ];
            const maxFileSize = 5 * 1024 * 1024;

            if (allowedTypes.includes(file.type) && file.size <= maxFileSize) {
              pastedFile = file;
              break;
            }
          }
        }
      }

      if (pastedFile) {
        event.preventDefault();
        setReceiptFile(pastedFile);
      }
    }
  });

  if (clearFileBtn) {
    clearFileBtn.addEventListener("click", () => {
      setReceiptFile(null);
      paymentReceiptInput.classList.remove("is-invalid");
      paymentReceiptInvalidFeedback.style.display = "none";
      paymentReceiptInvalidFeedback.textContent =
        "Please upload a valid payment receipt (image or PDF, max 5MB).";
    });
  }

  // --- End Receipt Upload Enhancement ---

  // --- Main Form Submission Logic ---
  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (isSubmitting) {
      console.log("Form already submitting.");
      return;
    }

    const lastSubmissionTime = localStorage.getItem("lastCampSubmission");
    if (lastSubmissionTime && Date.now() - lastSubmissionTime < 300000) {
      formStatus.textContent =
        "Please wait at least 5 minutes before submitting again.";
      formStatus.style.color = "orange";
      return;
    }

    formStatus.textContent = "";
    formStatus.className = "mt-3 text-center fw-bold fs-5";
    Array.from(form.elements).forEach((el) =>
      el.classList.remove("is-invalid")
    );
    recaptchaErrorDiv.style.display = "none";

    const numPeopleHelp = form.querySelector("#numPeople + .form-text");
    if (numPeopleHelp && !numPeopleHelp.dataset.originalText) {
      numPeopleHelp.dataset.originalText = numPeopleHelp.textContent;
    }
    const paymentReceiptHelp = form.querySelector(
      "#paymentReceipt + .form-text"
    );
    if (paymentReceiptHelp && !paymentReceiptHelp.dataset.originalText) {
      paymentReceiptHelp.dataset.originalText = paymentReceiptHelp.textContent;
    }

    // Perform all client-side validation *before* executing reCAPTCHA
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
      if (numPeopleHelp) {
        numPeopleHelp.textContent =
          "You can register up to 10 people. For larger groups, please contact us.";
      }
    } else {
      if (numPeopleHelp && numPeopleHelp.dataset.originalText) {
        numPeopleHelp.textContent = numPeopleHelp.dataset.originalText;
      }
    }

    if (!paymentReceipt) {
      form.elements["paymentReceipt"].classList.add("is-invalid");
      isValid = false;
      paymentReceiptInvalidFeedback.style.display = "block";
      paymentReceiptInvalidFeedback.textContent =
        "Please upload a payment receipt.";
    } else {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
      ];
      const allowedExts = ["jpg", "jpeg", "png", "gif", "pdf"];
      const maxFileSize = 5 * 1024 * 1024;
      const fileExt = paymentReceipt.name.split(".").pop().toLowerCase();

      if (
        !allowedTypes.includes(paymentReceipt.type) &&
        !allowedExts.includes(fileExt)
      ) {
        form.elements["paymentReceipt"].classList.add("is-invalid");
        isValid = false;
        paymentReceiptInvalidFeedback.style.display = "block";
        paymentReceiptInvalidFeedback.textContent =
          "Invalid file type. Only JPG, PNG, GIF, or PDF.";
      } else if (paymentReceipt.size > maxFileSize) {
        form.elements["paymentReceipt"].classList.add("is-invalid");
        isValid = false;
        paymentReceiptInvalidFeedback.style.display = "block";
        paymentReceiptInvalidFeedback.textContent =
          "File size exceeds 5MB limit.";
      } else {
        if (paymentReceiptHelp && paymentReceiptHelp.dataset.originalText) {
          paymentReceiptHelp.textContent =
            paymentReceiptHelp.dataset.originalText;
        }
        paymentReceiptInput.classList.remove("is-invalid");
        paymentReceiptInvalidFeedback.style.display = "none";
      }
    }

    if (!isValid) {
      formStatus.textContent = "Please correct the errors in the form.";
      formStatus.style.color = "red";
      return;
    }

    // All client-side validation passed. Now execute reCAPTCHA.
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';
    formStatus.textContent = "Verifying with reCAPTCHA...";
    formStatus.style.color = "blue";

    try {
      const recaptchaToken = await grecaptcha.execute(
        "6LdcG2grAAAAAKp6kKoG58Nmu0-6NPHcj7rkd6Zk",
        { action: "camp_registration_submit" }
      );
      recaptchaTokenInput.value = recaptchaToken;

      submitFormWithData();
    } catch (error) {
      console.error("reCAPTCHA execution failed:", error);
      recaptchaErrorDiv.style.display = "block";
      recaptchaErrorDiv.textContent =
        "reCAPTCHA verification failed. Please try again.";
      formStatus.textContent = "Registration failed: reCAPTCHA error.";
      formStatus.style.color = "red";
      // Reset button state and submission flag
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Register for Camp";
      grecaptcha.reset();
    }
  });

  function submitFormWithData() {
    submitBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
    formStatus.textContent = "Processing your registration...";
    formStatus.style.color = "blue";

    const formData = new FormData(form);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://kcmi-backend.onrender.com/api/camp-registration");

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

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        fill.style.width = percent + "%";
      }
    };

    xhr.onload = function () {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && data.success) {
          localStorage.setItem("lastCampSubmission", Date.now().toString());
          formStatus.textContent = "";
          form.style.display = "none";
          successMessage.style.display = "block";
          grecaptcha.reset();
        } else {
          formStatus.textContent =
            "Error: " + (data.message || "Something went wrong.");
          formStatus.style.color = "red";
          grecaptcha.reset();
        }
      } catch (e) {
        formStatus.textContent = "Unexpected response from server.";
        formStatus.style.color = "red";
        grecaptcha.reset();
      } finally {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Register for Camp";
        if (progressBar.parentNode === formStatus) {
          formStatus.removeChild(progressBar);
        }
      }
    };

    xhr.onerror = function () {
      formStatus.textContent = "Network error. Please try again.";
      formStatus.style.color = "red";
      grecaptcha.reset();
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Register for Camp";
      if (progressBar.parentNode === formStatus) {
        formStatus.removeChild(progressBar);
      }
    };

    xhr.send(formData);
  }
});

// If you need to add any new functionality for the donation section:
function highlightDonationSection() {
  const donationSection = document.querySelector(
    ".youth-camp-donation-prompt-prominent"
  );
  if (donationSection) {
    donationSection.style.boxShadow = "0 0 0 3px rgba(124, 25, 99, 0.3)";
    setTimeout(() => {
      donationSection.style.boxShadow = "";
    }, 1000);
  }
}

// Call this function if you want to draw attention to the donation section
// For example, you could call it after page loads or after registration
setTimeout(highlightDonationSection, 1500);

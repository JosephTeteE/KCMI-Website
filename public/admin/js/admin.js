// public/admin/js/admin.js

document.addEventListener("DOMContentLoaded", async () => {
  const saveEmbedButton = document.getElementById("saveEmbed");
  const embedElement = document.getElementById("embedCode");

  if (!saveEmbedButton || !embedElement) {
    console.error("Required elements not found.");
    return;
  }

  const backendUrl = "https://kcmi-backend.onrender.com/api/livestream";

  // Fetch and display existing embed code on page load
  try {
    const response = await fetch(backendUrl);
    if (response.ok) {
      const data = await response.json();
      embedElement.value = data.embedCode || "";
    }
  } catch (error) {
    console.error("Failed to load existing embed code.", error);
  }

  // Save new embed code when button is clicked
  saveEmbedButton.addEventListener("click", async () => {
    const embedCode = embedElement.value.trim();
    if (!embedCode) {
      alert("Please enter an embed code.");
      return;
    }

    try {
      const response = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedCode }),
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Livestream updated:", data);
      alert("Livestream embed code updated successfully!");
    } catch (error) {
      console.error("Failed to update livestream.", error);
      alert("Failed to update livestream. Please try again later.");
    }
  });
});

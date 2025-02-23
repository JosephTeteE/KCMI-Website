// js/admin.js
const saveEmbedButton = document.getElementById("saveEmbed");
const embedElement = document.getElementById("embedCode");

if (!saveEmbedButton || !embedElement) {
  console.error("Required elements not found.");
} else {
  saveEmbedButton.addEventListener("click", async () => {
    const embedCode = embedElement.value.trim();

    if (!embedCode) {
      alert("Please enter an embed code.");
      return;
    }

    const backendUrl = "YOUR_BACKEND_URL"; // Replace with your actual backend URL

    try {
      const response = await fetch(`${backendUrl}/api/livestream`, {
        // Use the full URL here
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedCode }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Livestream updated:", data);
      alert("Livestream embed code has been successfully updated!");
    } catch (error) {
      console.error(
        "Failed to update livestream. Please try again later.",
        error
      );
      alert("Failed to update livestream. Please try again later.");
    }
  });
}

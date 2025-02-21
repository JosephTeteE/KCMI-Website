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

    try {
      const response = await fetch("/api/livestream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedCode }),
      });

      const data = await response.json();
      alert("Livestream embed code has been successfully updated!");
    } catch (error) {
      console.error(
        "Failed to update livestream. Please try again later.",
        error
      );
    }
  });
}
// The admin.js file contains client-side JavaScript code that sends a POST request to the /api/livestream route to save the embed code to the database. The code retrieves the embed code from the input field on the page, validates it, and then sends it to the server using the fetch API. If the request is successful, an alert is displayed to confirm that the embed code has been updated. If an error occurs, an error message is logged to the console.

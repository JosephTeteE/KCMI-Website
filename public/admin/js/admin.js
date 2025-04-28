/* File: public/admin/js/admin.js */
// This script handles the functionality of the admin page for managing livestream embed codes.
// It allows the admin to view and update the embed code for the livestream.
// The script uses the Fetch API to communicate with a backend server to retrieve and update the embed code.
// It also includes error handling and user notifications for successful or failed operations.
// The script is designed to be executed in a web browser environment and is triggered when the DOM content is fully loaded.
// The script is intended to be used in conjunction with an HTML page that contains elements with specific IDs.
// The script assumes that the backend server is running and accessible at the specified URL.
// The script is designed to be modular and can be easily integrated into a larger web application.

// Wait for the DOM to fully load before executing the script
document.addEventListener("DOMContentLoaded", async () => {
  // Get references to the "Save Embed" button and the embed code input element
  const saveEmbedButton = document.getElementById("saveEmbed");
  const embedElement = document.getElementById("embedCode");

  // Check if the required elements exist on the page
  if (!saveEmbedButton || !embedElement) {
    console.error("Required elements not found.");
    return; // Exit if elements are missing
  }

  // Backend API URL for fetching and updating livestream embed code
  const backendUrl = "https://kcmi-backend.onrender.com/api/livestream";

  // Fetch and display the existing embed code when the page loads
  try {
    const response = await fetch(backendUrl); // Make a GET request to the backend
    if (response.ok) {
      const data = await response.json(); // Parse the JSON response
      embedElement.value = data.embedCode || ""; // Populate the input with the embed code
    }
  } catch (error) {
    console.error("Failed to load existing embed code.", error); // Log any errors
  }

  // Add a click event listener to the "Save Embed" button
  saveEmbedButton.addEventListener("click", async () => {
    // Get the trimmed value of the embed code input
    const embedCode = embedElement.value.trim();
    if (!embedCode) {
      alert("Please enter an embed code."); // Alert the user if the input is empty
      return;
    }

    // Check the state of the "Is Live" checkbox
    const isLive = document.getElementById("isLiveCheckbox").checked;

    // Send the new embed code and "isLive" status to the backend
    try {
      const response = await fetch(backendUrl, {
        method: "POST", // Use POST method to update the data
        headers: { "Content-Type": "application/json" }, // Set the request headers
        body: JSON.stringify({ embedCode, isLive }), // Send the data as JSON
      });

      // Check if the response is successful
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json(); // Parse the JSON response
      console.log("Livestream updated:", data); // Log the success response
      alert("Livestream embed code updated successfully!"); // Notify the user
    } catch (error) {
      console.error("Failed to update livestream.", error); // Log any errors
      alert("Failed to update livestream. Please try again later."); // Notify the user of failure
    }
  });
});

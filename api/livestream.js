// api/livestream.js
const express = require("express");
const pool = require("../server/db"); // Adjust the path if needed

const router = express.Router(); // Create an Express router

// Livestream Routes
router.post("/livestream", async (req, res) => {
  const { embedCode } = req.body;

  // Check if embedCode is provided
  if (!embedCode) {
    return res.status(400).json({ message: "Embed code is required" });
  }

  try {
    // Update the livestream embed code in the database
    await pool.execute(
      "REPLACE INTO livestream (id, embed_code) VALUES (1, ?)",
      [embedCode]
    );
    console.log("Updated embed code:", embedCode);

    // Respond without regionId since it’s not necessary
    res.json({
      message: "Livestream embed updated successfully",
    });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .json({ message: "Database error occurred", error: error.message });
  }
});

router.get("/livestream", async (req, res) => {
  try {
    // Retrieve the embed code from the database
    const [rows] = await pool.execute(
      "SELECT embed_code FROM livestream WHERE id = 1"
    );
    const embedCode = rows.length > 0 ? rows[0].embed_code : "";
    console.log("Retrieved embed code:", embedCode);

    // Respond with the embed code (no regionId)
    res.json({ embedCode });
  } catch (error) {
    console.error("Database Error:", error);
    res
      .status(500)
      .json({ message: "Database error occurred", error: error.message });
  }
});

module.exports = router; // Export the router

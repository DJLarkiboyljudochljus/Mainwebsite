const router = require('express').Router();
const Settings = require('../../models/Settings');
const auth = require('../../middleware/auth');

router.post('/settings/general', auth.auth(["admin"]), async (req, res) => {
  try {
    const updatedSettings = req.body;

    // Validate the incoming data
    if (!updatedSettings || Object.keys(updatedSettings).length === 0) {
      return res.status(400).json({ message: "Invalid settings data" });
    }

    // Update the existing settings or create a new one if it doesn't exist
    const settings = await Settings.findOneAndUpdate({}, updatedSettings, {
      new: true, // Return the updated document
      upsert: true, // Create a new document if none exists
    });

    res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

module.exports = router;

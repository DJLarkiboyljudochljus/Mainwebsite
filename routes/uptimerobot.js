const express = require("express");
const axios = require("axios");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs").promises;

const router = express.Router();

// UptimeRobot Status Page route
router.get("/", async (req, res) => {
  try {
    const API_KEY = process.env.UPTIMEROBOT_API_KEY;

    // Fetch monitor data from UptimeRobot API
    const response = await axios.post(
      "https://api.uptimerobot.com/v2/getMonitors",
      {
        api_key: API_KEY,
        format: "json",
        logs: 1,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const monitors = response.data.monitors;

    // Format data for the view
    const statusData = {
      monitors: monitors.map((monitor) => ({
        name: monitor.friendly_name,
        url: monitor.url,
        status: getStatusText(monitor.status),
        statusClass: getStatusClass(monitor.status),
        uptime: monitor.all_time_uptime_ratio,
        lastDowntime: getLastDowntime(monitor.logs),
      })),
      lastUpdated: new Date().toLocaleString(),
      nonce: res.locals.nonce,
    };

    // Read the EJS template file
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      "uptimerobot",
      "status.ejs",
    );
    const template = await fs.readFile(templatePath, "utf8");

    // Manually render the EJS template
    const html = ejs.render(template, statusData);

    // Send the rendered HTML
    res.send(html);
  } catch (error) {
    console.error("Error fetching UptimeRobot data:", error);
    res.status(500).send("Error fetching status data");
  }
});

// Helper functions
function getStatusText(status) {
  const statusMap = {
    0: "Paused",
    1: "Not checked yet",
    2: "Up",
    8: "Seems down",
    9: "Down",
  };
  return statusMap[status] || "Unknown";
}

function getStatusClass(status) {
  const classMap = {
    0: "status-paused",
    1: "status-pending",
    2: "status-up",
    8: "status-warning",
    9: "status-down",
  };
  return classMap[status] || "status-unknown";
}

function getLastDowntime(logs) {
  const downLogs = logs.filter((log) => log.type === 1); // Type 1 is DOWN
  if (downLogs.length === 0) return "No downtime recorded";

  const lastDown = downLogs[0];
  return new Date(lastDown.datetime * 1000).toLocaleString();
}

module.exports = router;

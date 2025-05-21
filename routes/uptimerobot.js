const express = require("express");
const axios = require("axios");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs").promises;

const router = express.Router();

const API_KEY = process.env.UPTIMEROBOT_API_KEY;

// UptimeRobot Status Page route - now only serves the page
router.get("/", async (req, res) => {
  try {
    // Read the EJS template file
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      "uptimerobot",
      "status.ejs",
    );
    const template = await fs.readFile(templatePath, "utf8");

    // Initial data for the template (without monitors)
    const statusData = {
      monitors: [],
      lastUpdated: null,
      nonce: res.locals.nonce,
    };

    // Render the template with initial data
    const html = ejs.render(template, statusData);

    // Send the rendered HTML
    res.send(html);
  } catch (error) {
    console.error("Error rendering UptimeRobot status page:", error);
    res.status(500).send("Error loading status page");
  }
});

// New API endpoint to fetch monitor data
router.get("/api/monitors", async (req, res) => {
  try {
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

    // Format data for the response
    const statusData = {
      monitors: monitors.map((monitor) => ({
        name: monitor.friendly_name,
        url: monitor.url,
        status: getStatusText(monitor.status),
        statusClass: getStatusClass(monitor.status),
        uptime: calculateUptimeRatio(monitor.logs),
        lastDowntime: getLastDowntime(monitor.logs),
      })),
      lastUpdated: new Date().toLocaleString(),
    };

    // Send the JSON response
    res.json(statusData);
  } catch (error) {
    console.error("Error fetching UptimeRobot data:", error);
    res.status(500).json({ error: "Error fetching status data" });
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

/**
 * Calculate the uptime ratio percentage from the first log to the current time
 * @param {Object[]} logs - Array of log entries
 * @returns {Object} - Contains uptime percentage and measurement duration info
 */
function calculateUptimeRatio(logs) {
  // Sort logs by datetime in ascending order (oldest first)
  const sortedLogs = [...logs].sort((a, b) => a.datetime - b.datetime);

  // Get the current timestamp in seconds (UNIX time)
  const currentTime = Math.floor(Date.now() / 1000);

  // Get the first log's datetime as the starting point
  const startTime = sortedLogs[0].datetime;

  // Calculate total duration from first log to now
  const totalDuration = currentTime - startTime;

  // Initialize counters
  let uptimeDuration = 0;
  let downtimeDuration = 0;
  let pausedDuration = 0;

  // Process the logs to calculate uptime/downtime
  let lastState = null;
  let lastTime = startTime;

  // Process each log to determine system state over time
  for (const log of sortedLogs) {
    const currentState = log.type;
    const currentTime = log.datetime;
    const timeDiff = currentTime - lastTime;

    // Attribute the time since the last log based on the previous state
    if (lastState === 2) {
      // State 2 = Up
      uptimeDuration += timeDiff;
    } else if (lastState === 1) {
      // State 1 = Down
      downtimeDuration += timeDiff;
    } else if (lastState === 99) {
      // State 99 = Paused
      pausedDuration += timeDiff;
    }
    // For state 98 (Monitor started), we don't attribute time

    // Update the last state and time
    lastState = currentState;
    lastTime = currentTime;
  }

  // Handle the time from the last log to now
  const timeFromLastLog = currentTime - lastTime;
  if (lastState === 2) {
    uptimeDuration += timeFromLastLog;
  } else if (lastState === 1) {
    downtimeDuration += timeFromLastLog;
  } else if (lastState === 99) {
    pausedDuration += timeFromLastLog;
  }

  // Calculate the monitored duration (excluding paused time)
  const monitoredDuration = totalDuration - pausedDuration;

  // Calculate uptime percentage (only considering monitored time)
  const uptimePercentage =
    monitoredDuration > 0 ? (uptimeDuration / monitoredDuration) * 100 : 0;

  // Format the duration as days, hours, minutes, seconds
  const formatDuration = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return {
      days,
      hours,
      minutes,
      seconds: remainingSeconds,
      formatted: `${days}d ${hours}h ${minutes}m ${remainingSeconds}s`,
    };
  };

  return {
    uptimePercentage: uptimePercentage.toFixed(3),
    measurementPeriod: {
      startTimestamp: startTime,
      startDate: new Date(startTime * 1000).toISOString(),
      endTimestamp: currentTime,
      endDate: new Date(currentTime * 1000).toISOString(),
      totalDuration: formatDuration(totalDuration),
      monitoredDuration: formatDuration(monitoredDuration),
      pausedDuration: formatDuration(pausedDuration),
    },
    statistics: {
      uptimeDuration: formatDuration(uptimeDuration),
      downtimeDuration: formatDuration(downtimeDuration),
    },
  };
}

module.exports = router;

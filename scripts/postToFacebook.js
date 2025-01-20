require("dotenv").config();
const axios = require("axios");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const { formatReportedTimeForPost } = require("../helpers/formatTime");

const pageId = process.env.PAGE_ID;
const accessToken = process.env.ACCESS_TOKEN;
const citizensFilePath = path.join("data", "incidents.json");

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const checkForRecentPosts = async (level, delayHours = 2) => {
  const query = `
    SELECT COUNT(*) FROM posted_alerts
    WHERE level = $1 AND posted = TRUE
      AND posted_at >= NOW() - INTERVAL '${delayHours} hours';
  `;
  const values = [level];

  try {
    const result = await client.query(query, values);
    return parseInt(result.rows[0].count, 10) > 0; // Returns true if posts exist
  } catch (error) {
    console.error(`Error checking for recent ${level}-priority posts:`, error.message);
    return false;
  }
};

const checkIfAlertExists = async (title, time) => {
  const query = `
    SELECT COUNT(*) FROM posted_alerts
    WHERE title = $1 AND time = $2;
  `;
  const values = [title, time];

  try {
    const result = await client.query(query, values);
    return parseInt(result.rows[0].count, 10) > 0; // Returns true if the alert exists
  } catch (error) {
    console.error("Error checking for existing alert:", error.message);
    return false;
  }
};

const savePostedAlertToDB = async (alert) => {
  const query = `
    INSERT INTO posted_alerts (title, level, rank, location, neighborhood, time, updates, posted, posted_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW())
    RETURNING id;
  `;
  const values = [
    alert.title,
    alert.level,
    alert.rank,
    alert.location,
    alert.neighborhood,
    alert.time,
    alert.updates,
  ];

  try {
    const result = await client.query(query, values);
    console.log(`Alert saved to database with ID: ${result.rows[0].id}`);
  } catch (error) {
    console.error("Error saving alert to database:", error.message);
  }
};

const postToFacebook = async (level, rank = null, delayHours = 2) => {
  try {
    if (!fs.existsSync(citizensFilePath)) {
      console.error("No incidents data file found. Run fetchIncidents.js first.");
      return;
    }

    const data = JSON.parse(fs.readFileSync(citizensFilePath, "utf8"));
    if (data.length === 0) {
      console.log("No incidents to post.");
      return;
    }

    await client.connect();

    if (level === "medium") {
      console.log("Checking for recent high and medium-priority posts...");
      const recentHighPosts = await checkForRecentPosts("high", delayHours);
      const recentMediumPosts = await checkForRecentPosts("medium", delayHours);

      if (recentHighPosts || recentMediumPosts) {
        console.log(
          `Skipping medium-priority posts: High-priority or medium-priority posts detected in the last ${delayHours} hours.`
        );
        return;
      }
    }

    for (const post of data) {
      if (post.level !== level || (rank && post.rank !== rank)) {
        continue; // Skip posts that don't match the level or rank
      }

      const { title, location, time, updates, neighborhood } = post;

      // Skip posting if the alert already exists in the database
      const alertExists = await checkIfAlertExists(title, time);
      if (alertExists) {
        console.log(`Skipping duplicate alert: ${title}`);
        continue;
      }

      const borough = neighborhood.split(",").pop().trim();
      const boroughWithAddress = `${location}, ${borough}`;
      const hashtags = `#safety #alerts #NYC #${borough.replace(/\s+/g, "")}NY`;

      // Format the time for Facebook posts
      const formattedTime = formatReportedTimeForPost(time);

      // Construct the Facebook post content
      const formattedOutput = `${title}\n\n${boroughWithAddress}\n\n${formattedTime}\n\n${hashtags}`;

      try {
        // Post to Facebook
        const response = await axios.post(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          { message: formattedOutput, access_token: accessToken }
        );

        console.log(`Posted to Facebook: ${title}`);

        // Save the posted alert to the database
        await savePostedAlertToDB(post);

        break; // Stop after posting the first eligible incident
      } catch (error) {
        console.error("Error posting to Facebook:", error.message);
        break;
      }
    }
  } catch (error) {
    console.error("An error occurred in the posting process:", error.message);
  } finally {
    await client.end();
  }
};

module.exports = postToFacebook;

if (require.main === module) {
    const args = process.argv.slice(2); // Get command-line arguments
    const level = args[0] || "high"; // Default to "high" if no argument provided
    const rank = args[1] ? parseInt(args[1], 10) : null; // Optional rank argument

    (async () => {
      console.log(`Starting the posting script for ${level} priority...`);
      await postToFacebook(level, rank);
    })();
  }

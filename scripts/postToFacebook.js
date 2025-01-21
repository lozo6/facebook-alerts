require("dotenv").config();
const axios = require("axios");
const {
  connectDB,
  disconnectDB,
  getIncidentToPost,
  savePostedAlert,
} = require("../helpers/dbUtils");
const { formatReportedTimeForPost } = require("../helpers/formatTime");

const pageId = process.env.PAGE_ID;
const accessToken = process.env.ACCESS_TOKEN;

// Define `checkForRecentPosts` directly in the script
const checkForRecentPosts = async (client, level, delayHours = 2) => {
  const query = `
    SELECT COUNT(*) FROM posted_alerts
    WHERE level IN ('high', $1) AND posted = TRUE
      AND posted_at >= NOW() - INTERVAL '${delayHours} hours';
  `;
  const values = [level];

  try {
    const result = await client.query(query, values);
    return parseInt(result.rows[0].count, 10) > 0; // Returns true if posts exist
  } catch (error) {
    console.error(`Error checking recent ${level} posts:`, error.message);
    return false;
  }
};

// Define `checkIfAlertExists` for duplicate checks
const checkIfAlertExists = async (client, title, time) => {
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

const postToFacebook = async (level, rank = null, delayHours = 2) => {
  let client;
  try {
    client = await connectDB();

    // Skip medium-priority posts if there are recent high- or medium-priority posts
    if (level === "medium") {
      console.log("Checking for recent high or medium-priority posts...");
      const recentPosts = await checkForRecentPosts(client, "medium", delayHours);
      if (recentPosts) {
        console.log("Skipping medium-priority post: Recent high or medium-priority posts detected.");
        return;
      }
    }

    const post = await getIncidentToPost(client, level, rank);

    if (!post) {
      console.log(`No ${level} priority incidents to post.`);
      return;
    }

    // Check if the alert is already posted before proceeding
    const alertExists = await checkIfAlertExists(client, post.title, post.time);
    if (alertExists) {
      console.log(`Skipping duplicate alert: ${post.title}`);
      return;
    }

    const formattedTime = formatReportedTimeForPost(post.time);
    const borough = post.neighborhood.split(",").pop().trim();
    const hashtags = `#safety #alerts #NYC #${borough.replace(/\s+/g, "")}NY`;
    const message = `${post.title}\n\n${post.location}, ${borough}\n\n${formattedTime}\n\n${hashtags}`;

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        { message, access_token: accessToken }
      );

      console.log(`Posted to Facebook: ${post.title}`);
      await savePostedAlert(client, post);
    } catch (error) {
      console.error("Error posting to Facebook:", error.message);
    }
  } catch (error) {
    console.error("An error occurred in the posting process:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }
};

module.exports = postToFacebook;

if (require.main === module) {
  const args = process.argv.slice(2);
  const level = args[0] || "high";
  const rank = args[1] ? parseInt(args[1], 10) : null;

  (async () => {
    console.log(`Starting the posting script for ${level} priority...`);
    await postToFacebook(level, rank);
  })();
}

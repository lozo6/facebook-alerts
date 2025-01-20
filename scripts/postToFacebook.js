require("dotenv").config();
const axios = require("axios");
const { connectDB, disconnectDB, getIncidentToPost, savePostedAlert } = require("../helpers/dbUtils");
const { formatReportedTimeForPost } = require("../helpers/formatTime");

const pageId = process.env.PAGE_ID;
const accessToken = process.env.ACCESS_TOKEN;

const checkForRecentPosts = async (level, delayHours = 2) => {
  const query = `
    SELECT COUNT(*) FROM posted_alerts
    WHERE level IN ('high', $1) AND posted = TRUE
      AND posted_at >= NOW() - INTERVAL '${delayHours} hours';
  `;
  const values = [level];

  try {
    const result = await connectDB().then(() => client.query(query, values));
    return parseInt(result.rows[0].count, 10) > 0;
  } catch (error) {
    console.error(`Error checking recent ${level} posts:`, error.message);
    return false;
  }
};

const postToFacebook = async (level, rank = null, delayHours = 2) => {
  try {
    await connectDB();

    // Skip medium-priority posts if there are recent high- or medium-priority posts
    if (level === "medium") {
      console.log("Checking for recent high or medium-priority posts...");
      const recentPosts = await checkForRecentPosts(level, delayHours);
      if (recentPosts) {
        console.log(`Skipping medium-priority post: Recent high or medium posts detected.`);
        return;
      }
    }

    const post = await getIncidentToPost(level, rank);

    if (!post) {
      console.log(`No ${level} priority incidents to post.`);
      return;
    }

    const formattedTime = formatReportedTimeForPost(post.time);
    const borough = post.neighborhood.split(",").pop().trim();
    const message = `${post.title}\n\n${post.location}, ${borough}\n\n${formattedTime}\n\n#safety #alerts`;

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        { message, access_token: accessToken }
      );

      console.log(`Posted to Facebook: ${post.title}`);
      await savePostedAlert(post);
    } catch (error) {
      console.error("Error posting to Facebook:", error.message);
    }
  } catch (error) {
    console.error("An error occurred in the posting process:", error.message);
  } finally {
    await disconnectDB();
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

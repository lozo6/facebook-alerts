require("dotenv").config();
const fetchIncidents = require("./fetchIncidents");
const postToFacebook = require("./postToFacebook");
const { connectDB, disconnectDB } = require("../helpers/dbUtils");

const DAILY_POST_LIMIT = 15; // Limit for posts between 7 AM and 11 PM

// Function to count posts during the specified timeframe
const getDaytimePostCount = async (client) => {
  const query = `
    SELECT COUNT(*) AS count FROM posted_alerts
    WHERE posted_at >= CURRENT_DATE + INTERVAL '7 hours'
      AND posted_at < CURRENT_DATE + INTERVAL '23 hours';
  `;
  try {
    const result = await client.query(query);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error("Error fetching daytime post count:", error.message);
    return null;
  }
};

const runWorkflow = async () => {
  const now = new Date();
  const hour = now.getHours();
  const currentTime = now.toLocaleString();

  console.log(`Workflow execution started. Current time: ${currentTime}, Hour: ${hour}`);

  console.log("Step 1: Fetching new incidents...");
  await fetchIncidents();

  let client;
  try {
    client = await connectDB();

    // Daytime logic: Check and enforce post limit
    if (hour >= 7 && hour < 23) {
      const daytimePostCount = await getDaytimePostCount(client);

      console.log(`Daytime post count: ${daytimePostCount}/${DAILY_POST_LIMIT}`);
      if (daytimePostCount >= DAILY_POST_LIMIT) {
        console.log("Daytime post limit reached. Skipping further posts.");
        return;
      }

      console.log("Daytime detected. Processing high-priority alerts...");
      await postToFacebook("high");

      console.log("Processing medium-priority alerts...");
      await postToFacebook("medium");
    } else {
      // Nighttime logic: No limit
      console.log("Nighttime detected. Processing home invasion alerts only...");
      await postToFacebook("high", 1);
    }
  } catch (error) {
    console.error("An error occurred in the workflow:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }

  console.log("Workflow execution complete.");
};

module.exports = runWorkflow;

if (require.main === module) {
  (async () => {
    console.log("Starting the main workflow...");
    await runWorkflow();
    console.log("Main workflow completed.");
  })();
}

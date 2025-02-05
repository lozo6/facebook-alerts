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

const runHighPriorityWorkflow = async () => {
  console.log("Step 1: Fetching new incidents...");
  await fetchIncidents();

  let client;
  try {
    client = await connectDB();

    const daytimePostCount = await getDaytimePostCount(client);

    console.log(`Daytime post count: ${daytimePostCount}/${DAILY_POST_LIMIT}`);
    if (daytimePostCount >= DAILY_POST_LIMIT) {
      console.log("Daytime post limit reached. Skipping further posts.");
      return;
    }

    console.log("Processing high-priority alerts during daytime...");
    await postToFacebook("high", 2);
  } catch (error) {
    console.error("An error occurred in the high-priority workflow:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }

  console.log("High-priority workflow complete.");
};

const runMediumPriorityWorkflow = async () => {
  console.log("Step 1: Fetching new incidents...");
  await fetchIncidents();

  let client;
  try {
    client = await connectDB();

    const daytimePostCount = await getDaytimePostCount(client);

    console.log(`Daytime post count: ${daytimePostCount}/${DAILY_POST_LIMIT}`);
    if (daytimePostCount >= DAILY_POST_LIMIT) {
      console.log("Daytime post limit reached. Skipping further posts.");
      return;
    }

    console.log("Processing medium-priority alerts during daytime...");
    await postToFacebook("medium");
  } catch (error) {
    console.error("An error occurred in the medium-priority workflow:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }

  console.log("Medium-priority workflow complete.");
};

const runNightHighPriorityWorkflow = async () => {
  console.log("Step 1: Fetching new incidents...");
  await fetchIncidents();

  console.log("Processing high-priority alerts during nighttime...");
  await postToFacebook("high", 1);

  console.log("Nighttime high-priority workflow complete.");
};

module.exports = { runHighPriorityWorkflow, runMediumPriorityWorkflow, runNightHighPriorityWorkflow };

if (require.main === module) {
  (async () => {
    const mode = process.argv[2];
    if (mode === "high") {
      console.log("Starting the high-priority daytime workflow...");
      await runHighPriorityWorkflow();
      console.log("High-priority daytime workflow completed.");
    } else if (mode === "medium") {
      console.log("Starting the medium-priority workflow...");
      await runMediumPriorityWorkflow();
      console.log("Medium-priority workflow completed.");
    } else if (mode === "night") {
      console.log("Starting the high-priority nighttime workflow...");
      await runNightHighPriorityWorkflow();
      console.log("High-priority nighttime workflow completed.");
    } else {
      console.error("Invalid mode specified. Use 'high', 'medium', or 'night'.");
    }
  })();
}

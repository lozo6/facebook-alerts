require("dotenv").config();
const fetchIncidents = require("./fetchIncidents");
const postToFacebook = require("./postToFacebook");

const runWorkflow = async () => {
  const now = new Date();
  const hour = now.getHours();

  console.log(`Current time: ${now.toLocaleString()} | Hour: ${hour}`);

  // Fetch incidents
  console.log("Fetching new incidents...");
  await fetchIncidents();

  if (hour >= 7 && hour < 23) {
    // Daytime Logic
    console.log("Daytime detected: Processing high-level alerts...");
    await postToFacebook("high");

    console.log("Processing medium-level alerts...");
    await postToFacebook("medium");
  } else {
    // Nighttime Logic
    console.log("Nighttime detected: Only processing home invasion alerts...");
    await postToFacebook("high", 1); // Rank 1 is for home invasion
  }
};

module.exports = runWorkflow;

// Run the workflow only if the script is executed directly
if (require.main === module) {
  (async () => {
    console.log("Starting the main workflow...");
    await runWorkflow();
    console.log("Workflow completed.");
  })();
}

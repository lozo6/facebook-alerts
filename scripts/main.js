require("dotenv").config();
const fetchIncidents = require("./fetchIncidents");
const postToFacebook = require("./postToFacebook");

const runWorkflow = async () => {
  const now = new Date();
  const hour = now.getHours();
  const currentTime = now.toLocaleString();

  console.log(`Workflow execution started. Current time: ${currentTime}, Hour: ${hour}`);

  console.log("Step 1: Fetching new incidents...");
  await fetchIncidents();

  if (hour >= 7 && hour < 23) {
    console.log("Daytime detected. Processing high-priority alerts...");
    await postToFacebook("high");

    console.log("Processing medium-priority alerts...");
    await postToFacebook("medium");
  } else {
    console.log("Nighttime detected. Processing home invasion alerts only...");
    await postToFacebook("high", 1);
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

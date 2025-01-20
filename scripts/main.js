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
    console.log("Daytime detected: Processing high-priority alerts...");
    await postToFacebook({ priority: "high" });

    console.log("Processing medium-priority alerts...");
    await postToFacebook({ priority: "medium", delayHours: 2 });
  } else {
    // Nighttime Logic
    console.log("Nighttime detected: Only processing home invasion alerts...");
    await postToFacebook({ priority: "high", filter: "Home Invasion" });
  }
};

// Run the workflow only if the script is executed directly
if (require.main === module) {
  (async () => {
    console.log("Starting the main workflow...");
    await runWorkflow();
    console.log("Workflow completed.");
  })();
}

module.exports = runWorkflow;

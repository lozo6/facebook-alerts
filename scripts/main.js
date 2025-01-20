require("dotenv").config();
const fetchIncidents = require("./fetchIncidents");
const postToFacebook = require("./postToFacebook");

(async () => {
  try {
    console.log("Starting the full incident alert workflow...");

    // Step 1: Fetch and process incidents
    await fetchIncidents();

    // Step 2: Post incidents to Facebook
    await postToFacebook();

    console.log("Workflow completed successfully.");
  } catch (error) {
    console.error("An error occurred in the main workflow:", error.message);
  }
})();

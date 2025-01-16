const { fetchAndProcessData, postToFacebook } = require("../guardianNYC");

module.exports = async (req, res) => {
  try {
    console.log("Starting the cronjob...");

    // Fetch and process data
    const data = await fetchAndProcessData();

    if (data.length > 0) {
      console.log("Posting high-priority data to Facebook...");
      await postToFacebook(data);
    } else {
      console.log("No data to process.");
    }

    res.status(200).send("Cronjob executed successfully.");
  } catch (error) {
    console.error("Error during cronjob execution:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

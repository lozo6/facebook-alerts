require("dotenv").config();
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { getPostedContent, savePostedData } = require("../helpers/facebookUtils");

const pageId = process.env.PAGE_ID;
const accessToken = process.env.ACCESS_TOKEN;
const citizensFilePath = path.join("data", "incidents.json");

const postToFacebook = async () => {
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

    const previouslyPosted = getPostedContent().map((p) => p.postContent);

    for (const post of data) {
      const { title, location, time, updates, neighborhood } = post;
      const borough = neighborhood.split(",").pop().trim();
      const boroughWithAddress = `${location}, ${borough}`;
      const hashtags = `#safety #alerts #NYC #${borough.replace(/\s+/g, "")}NY`;

      const formattedOutput = `${title}\n\n${boroughWithAddress}\n${time}\n\n${hashtags}`; // \n${updates} (removed temporarily for now)

      if (previouslyPosted.includes(formattedOutput)) {
        console.log(`Skipping duplicate post: ${title}`);
        continue;
      }

      try {
        const response = await axios.post(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          { message: formattedOutput, access_token: accessToken }
        );

        savePostedData(formattedOutput, response.data.id);
        console.log(`Posted: ${title}`);
        break; // Stop after posting the first eligible incident
      } catch (error) {
        console.error("Error posting to Facebook:", error.message);
        break;
      }
    }
  } catch (error) {
    console.error("An error occurred in the posting process:", error.message);
  }
};

module.exports = postToFacebook;

// Run only if this script is executed directly
if (require.main === module) {
  (async () => {
    console.log("Starting the posting script...");
    await postToFacebook();
  })();
}

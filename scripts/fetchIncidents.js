require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const processIncidents = require("../helpers/processIncidents");

const url = process.env.INCIDENT_URL;
const params = {
  lowerLatitude: parseFloat(process.env.LOWER_LATITUDE),
  lowerLongitude: parseFloat(process.env.LOWER_LONGITUDE),
  upperLatitude: parseFloat(process.env.UPPER_LATITUDE),
  upperLongitude: parseFloat(process.env.UPPER_LONGITUDE),
  fullResponse: process.env.FULL_RESPONSE === "true",
  limit: parseInt(process.env.LIMIT, 10),
};

const dataDir = "data";
const citizensFilePath = path.join(dataDir, "incidents.json");

const fetchIncidents = async () => {
  try {
    console.log("Fetching data from Citizens API...");
    const response = await axios.get(url, { params });
    const formattedData = processIncidents(response.data);

    if (formattedData.length === 0) {
      console.log("No incidents matched the criteria. No data saved.");
    } else {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(citizensFilePath, JSON.stringify(formattedData, null, 2));
      console.log(`Data saved to ${citizensFilePath}`);
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
};

module.exports = fetchIncidents;

// Run only if this script is executed directly
if (require.main === module) {
  (async () => {
    console.log("Starting the fetch incidents script...");
    await fetchIncidents();
  })();
}

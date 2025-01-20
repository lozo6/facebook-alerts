require("dotenv").config();
const axios = require("axios");
const processIncidents = require("../helpers/processIncidents");
const { connectDB, disconnectDB, saveIncident, clearTable } = require("../helpers/dbUtils");

const url = process.env.INCIDENT_URL;
const params = {
  lowerLatitude: parseFloat(process.env.LOWER_LATITUDE),
  lowerLongitude: parseFloat(process.env.LOWER_LONGITUDE),
  upperLatitude: parseFloat(process.env.UPPER_LATITUDE),
  upperLongitude: parseFloat(process.env.UPPER_LONGITUDE),
  fullResponse: "true",
  sort: "timestamp",
  limit: 20,
};

const fetchIncidents = async () => {
  try {
    console.log("Fetching data from Citizens API...");
    const response = await axios.get(url, { params });
    const formattedData = processIncidents(response.data);

    if (formattedData.length === 0) {
      console.log("No incidents matched the criteria.");
      return;
    }

    await connectDB();
    await clearTable("current_incidents");

    for (const incident of formattedData) {
      await saveIncident(incident, "incidents");
      await saveIncident(incident, "current_incidents");
    }
  } catch (error) {
    console.error("Error fetching incidents:", error.message);
  } finally {
    await disconnectDB();
  }
};

module.exports = fetchIncidents;

if (require.main === module) {
  (async () => {
    console.log("Starting the fetch incidents script...");
    await fetchIncidents();
  })();
}

require("dotenv").config();
const axios = require("axios");
const { connectDB, disconnectDB, saveIncident, clearTable } = require("../helpers/dbUtils");
const processIncidents = require("../helpers/processIncidents");

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
  let client;
  try {
    console.log("Starting data fetch from Citizens API...");
    const response = await axios.get(url, { params });
    const formattedData = processIncidents(response.data);

    if (formattedData.length === 0) {
      console.log("No new incidents found.");
      return;
    }

    client = await connectDB();

    await clearTable(client, "current_incidents");
    console.log("Cleared `current_incidents` table.");

    for (const incident of formattedData) {
      await saveIncident(client, incident, "incidents");
      await saveIncident(client, incident, "current_incidents");
    }
    console.log("Incidents successfully processed and saved.");
  } catch (error) {
    console.error("Error fetching incidents:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }
};

module.exports = fetchIncidents;

if (require.main === module) {
  (async () => {
    console.log("Executing fetchIncidents script...");
    await fetchIncidents();
    console.log("fetchIncidents script execution complete.");
  })();
}

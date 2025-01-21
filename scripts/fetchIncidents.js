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
    console.log("Fetching data from Citizens API...");
    const response = await axios.get(url, { params });
    const formattedData = processIncidents(response.data);

    if (formattedData.length === 0) {
      console.log("No incidents matched the criteria. No data saved.");
      return;
    }

    client = await connectDB();

    // Clear `current_incidents` before inserting new data
    await clearTable("current_incidents");
    console.log("Cleared current_incidents table.");

    for (const incident of formattedData) {
      await saveIncident(client, incident, "incidents");
      await saveIncident(client, incident, "current_incidents");
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  } finally {
    if (client) await disconnectDB(client);
  }
};

module.exports = fetchIncidents;

if (require.main === module) {
  (async () => {
    console.log("Starting the fetch incidents script...");
    await fetchIncidents();
  })();
}

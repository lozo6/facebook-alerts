require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
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

const dataDir = "data";
const citizensFilePath = path.join(dataDir, "incidents.json");

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const saveToDatabase = async (incident) => {
    const query = `
      INSERT INTO incidents (title, level, rank, location, neighborhood, time, updates, fetched_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (title, time) DO NOTHING
      RETURNING id;
    `;
    const values = [
      incident.title,
      incident.level,
      incident.rank,
      incident.location,
      incident.neighborhood,
      incident.time,
      incident.updates,
    ];

    try {
      const result = await client.query(query, values);

      if (result.rowCount > 0) {
        console.log(`Inserted incident: ${incident.title}`);
      } else {
        console.log(`Skipped duplicate incident: ${incident.title}`);
      }
    } catch (error) {
      console.error(`Error saving incident (${incident.title}) to database:`, error.message);
    }
  };

const fetchIncidents = async () => {
  try {
    console.log("Fetching data from Citizens API...");
    const response = await axios.get(url, { params });
    const formattedData = processIncidents(response.data);

    if (formattedData.length === 0) {
      console.log("No incidents matched the criteria. No data saved.");
      return;
    }

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(citizensFilePath, JSON.stringify(formattedData, null, 2));
    console.log(`Data saved to ${citizensFilePath}`);

    await client.connect();

    for (const incident of formattedData) {
      await saveToDatabase(incident);
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  } finally {
    await client.end();
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

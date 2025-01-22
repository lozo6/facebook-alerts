const { Client } = require("pg");

const createClient = () => {
  return new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
};

const connectDB = async () => {
  const client = createClient();
  try {
    await client.connect();
    console.info("Database connection established.");
    return client;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};

const disconnectDB = async (client) => {
  try {
    await client.end();
    console.info("Database connection closed.");
  } catch (error) {
    console.error("Error during database disconnection:", error.message);
  }
};

const saveIncident = async (client, incident, table) => {
  const query = `
    INSERT INTO ${table} (title, level, rank, location, neighborhood, time, updates, fetched_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    ON CONFLICT (title, time) DO NOTHING;
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
    const action = result.rowCount > 0 ? "Inserted" : "Duplicate skipped";
    console.debug(`${action} into ${table}: "${incident.title}"`);
  } catch (error) {
    console.error(`Error saving incident to ${table}:`, error.message);
  }
};

const clearTable = async (client, table) => {
  try {
    await client.query(`TRUNCATE TABLE ${table};`);
    console.debug(`Table "${table}" cleared.`);
  } catch (error) {
    console.error(`Error clearing table "${table}":`, error.message);
  }
};

const getIncidentToPost = async (client, level, rank = null) => {
  const query = `
    SELECT * FROM current_incidents
    WHERE level = $1 ${rank ? "AND rank = $2" : ""};
  `;
  const values = rank ? [level, rank] : [level];

  try {
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error retrieving incident for posting:", error.message);
    return null;
  }
};

const savePostedAlert = async (client, alert) => {
  const query = `
    INSERT INTO posted_alerts (title, level, rank, location, neighborhood, time, updates, posted, posted_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, NOW());
  `;
  const values = [
    alert.title,
    alert.level,
    alert.rank,
    alert.location,
    alert.neighborhood,
    alert.time,
    alert.updates,
  ];

  try {
    await client.query(query, values);
    console.info(`Posted alert recorded: "${alert.title}"`);
  } catch (error) {
    console.error("Error recording posted alert:", error.message);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  saveIncident,
  clearTable,
  getIncidentToPost,
  savePostedAlert,
};

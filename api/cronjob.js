require("dotenv").config();
const { fetchAndProcessData } = require("../../guardianNYC"); // Adjust the path based on your structure

module.exports = async (req, res) => {
  try {
    console.log("Cronjob started.");
    const data = await fetchAndProcessData();
    console.log("Cronjob completed.");
    res.status(200).json({ message: "Cronjob executed successfully", data });
  } catch (error) {
    console.error("Error during cronjob execution:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

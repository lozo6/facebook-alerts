const axios = require("axios");
const fs = require("fs");
const path = require("path");

const configFilePath = "./config.json";

// Function to read the config file
function readConfig() {
  const config = JSON.parse(fs.readFileSync(configFilePath));
  return config;
}

// Read configuration from config.json
const { auth_key, params, pageId, accessToken } = readConfig();

// Define store directory
const storeDir = path.join(__dirname, "data");

// --- First Script: Citizen Data Extraction ---
const url = "https://citizen.com/api/incident/trending";

const softCrimeKeywords = [
  "lost dog",
  "lost cat",
  "pet",
  "missing pet",
  "stray",
  "found pet",
  "dog",
  "cat",
  "missing",
  "drone",
  "drones",
  "gas",
  "odor",
  "fire",
  "EMS",
  "ems",
  "backup",
  "stuck",
  "crash",
  "sinkhole",
];

const unwantedUpdates = ["Radio clips available."];

function formatTime(ts) {
  const date = new Date(ts);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12' for 12 AM
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

async function translateToChinese(title) {
  try {
    const response = await axios.post(
      "https://api-free.deepl.com/v2/translate",
      null,
      {
        params: {
          auth_key: auth_key, // Use auth_key from config.json
          text: title,
          target_lang: "ZH", // Target language is Chinese
        },
      }
    );
    return response.data.translations[0].text;
  } catch (error) {
    console.error("Error translating title:", error);
    return "";
  }
}

async function extractData(responseData) {
  if (responseData && Array.isArray(responseData.results)) {
    const results = [];
    for (const item of responseData.results) {
      const updates = item.updates
        ? Object.values(item.updates)
            .map((update) => update.text)
            .filter((updateText) => !unwantedUpdates.includes(updateText))
        : [];
      const chineseTranslation = await translateToChinese(item.title);
      results.push({
        location: item.location,
        neighborhood: item.neighborhood,
        title: `${item.title} (${chineseTranslation})`, // Title with Chinese translation
        time: formatTime(item.ts),
        updates: updates,
      });
    }
    return results.filter((item) => {
      return !softCrimeKeywords.some((keyword) =>
        item.title.toLowerCase().includes(keyword)
      );
    });
  } else {
    return [];
  }
}

function logExtraction() {
  const logMessage = `Data extracted successfully at ${new Date().toISOString()}\n`;
  fs.appendFileSync(path.join(storeDir, "extraction_log.txt"), logMessage);
}

async function citizenAPI() {
  try {
    const response = await axios.get(url, { params });

    const extractedData = await extractData(response.data);

    fs.writeFileSync(
      path.join(storeDir, "citizens.json"),
      JSON.stringify(extractedData, null, 2)
    );

    logExtraction();
  } catch (error) {
    console.error("Error fetching data from Citizens API:", error);
  }
}

// --- Second Script: Posting to Facebook ---
function getCurrentDateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

fs.readFile(path.join(storeDir, "citizens.json"), "utf8", (err, data) => {
  if (err) {
    console.error("Error reading extracted data:", err);
    return;
  }

  try {
    const parsedData = JSON.parse(data);
    const firstPost = parsedData[0];
    const { title, location, neighborhood, time, updates } = firstPost;
    const borough = neighborhood.split(",").pop().trim();
    const boroughHashtag = `#${borough}NY`;
    const hashtags = `#safety #alerts #NYC ${boroughHashtag}`;
    const formattedUpdates = updates.map((update) => `- ${update}`).join("\n");

    const formattedOutput = `${title}\n\n${location}\n${neighborhood}\nReported at ${time}\nUpdates:\n${formattedUpdates}\n\n${hashtags}`;

    const dateTimePosted = getCurrentDateTime();

    axios
      .post(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        message: formattedOutput,
        access_token: accessToken,
      })
      .then((response) => {
        console.log("Post created:", response.data);

        if (!fs.existsSync(storeDir)) {
          fs.mkdirSync(storeDir, { recursive: true });
        }

        const postData = {
          postContent: formattedOutput,
          dateTimePosted: dateTimePosted,
        };

        fs.writeFileSync(
          path.join(storeDir, "posted.json"),
          JSON.stringify(postData, null, 2)
        );

        console.log(
          "Post content and dateTimePosted saved to data/posted.json"
        );
      })
      .catch((error) => {
        console.error(
          "Error posting:",
          error.response ? error.response.data : error.message
        );
      });
  } catch (parseError) {
    console.error("Error parsing JSON:", parseError);
  }
});

// Call the function to test
citizenAPI();

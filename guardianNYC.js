const axios = require("axios");
const fs = require("fs");
const path = require("path");
const nlp = require("compromise");

// Read configuration
const configFilePath = "./config.json";

function readConfig() {
  const config = JSON.parse(fs.readFileSync(configFilePath));
  return config;
}

const { pageId, accessToken, params } = readConfig();

// Define directories
const storeDir = path.join(__dirname, "data");
if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

// Define alert keywords
const alertKeywords = [
  "shoot",
  "shooting",
  "shot",
  "gunfire",
  "stab",
  "stabbing",
  "stabbed",
  "knife",
  "robbery",
  "rob",
  "robbed",
  "mugging",
  "mugged",
  "home invasion",
  "break-in",
  "broke into",
  "forced entry",
  "intruder",
  "burglary",
  "burgle",
  "burgled",
  "murder",
  "kill",
  "killing",
  "homicide",
  "manslaughter",
  "body found",
  "corpse",
  "dead body",
  "human remains",
  "stolen vehicle",
  "car theft",
  "vehicle theft",
  "stole car",
  "car stolen",
];

// Helper functions
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCurrentDateTime() {
  const now = new Date();
  return now.toISOString().replace("T", " ").split(".")[0];
}

function savePostedData(postContent, postId, filePath) {
  const dateTimePosted = getCurrentDateTime();
  let existingPosts = [];

  if (fs.existsSync(filePath)) {
    try {
      const fileData = fs.readFileSync(filePath, "utf8");
      existingPosts = JSON.parse(fileData);

      if (!Array.isArray(existingPosts)) {
        existingPosts = [];
      }
    } catch (error) {
      console.error("Error reading posted.json:", error.message);
    }
  }

  existingPosts.push({ postContent, postId, dateTimePosted });

  fs.writeFileSync(filePath, JSON.stringify(existingPosts, null, 2));
  console.log("Post content appended to posted.json.");
}

function getPostedContent(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      const fileData = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileData) || [];
    } catch {
      return [];
    }
  }
  return [];
}

// Sorting function
function sortByPriority(data) {
  return data.sort((a, b) => {
    const aIndex = alertKeywords.indexOf(a.priority);
    const bIndex = alertKeywords.indexOf(b.priority);
    return (
      (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
    );
  });
}

// Process and extract data from CitizenAPI response
async function fetchAndProcessData() {
  const url = "https://citizen.com/api/incident/trending";
  try {
    const response = await axios.get(url, { params });

    if (response.data && Array.isArray(response.data.results)) {
      const extractedData = response.data.results.map((item) => {
        const { title, location, neighborhood = "Unknown", ts } = item;
        const updates = item.updates
          ? Object.values(item.updates)
              .map((update) => update.text)
              .join(" ")
          : "No further details at this time.";

        const priority =
          alertKeywords.find((keyword) =>
            nlp(title).out("root").includes(keyword)
          ) || "low";

        const time = getCurrentDateTime(new Date(ts));

        return { title, priority, location, neighborhood, time, updates };
      });

      return sortByPriority(extractedData);
    }
  } catch (error) {
    console.error("Error fetching Citizen data:", error.message);
  }
  return [];
}

// Post data to Facebook
async function postToFacebook(data) {
  const postDataFile = path.join(storeDir, "posted.json");
  const previouslyPosted = getPostedContent(postDataFile).map(
    (item) => item.postContent
  );

  for (const post of data) {
    if (post.priority === "low") continue; // Skip low-priority items
    const { title, location, time, updates, neighborhood } = post;

    const borough = neighborhood.includes(",")
      ? neighborhood.split(",").pop().trim()
      : neighborhood;
    const boroughHashtag = `#${borough}`;
    const hashtags = `#safety #alerts #NYC ${boroughHashtag}`;
    const formattedOutput = `${title}\n\n${location}\nReported at ${time}\nUpdates:\n${updates}\n\n${hashtags}`;

    if (previouslyPosted.includes(formattedOutput)) {
      console.log("Skipping duplicate post:", title);
      continue;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          message: formattedOutput,
          access_token: accessToken,
        }
      );

      savePostedData(formattedOutput, response.data.id, postDataFile);
      console.log("Posted:", title);

      console.log("Waiting 60 seconds before posting the next item...");
      await delay(60000); // 60-second delay
    } catch (error) {
      console.error("Error posting to Facebook:", error.message);
    }
  }
}

// Main function
(async () => {
  const data = await fetchAndProcessData();
  if (data.length > 0) {
    await postToFacebook(data);
  } else {
    console.log("No data to process.");
  }
})();

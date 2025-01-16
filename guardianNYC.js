require("dotenv").config(); // Automatically loads variables from .env
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Constants and Configurations
const configFilePath = "./config.json";
const { params } = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
const auth_key = process.env.AUTH_KEY;
const pageId = process.env.PAGE_ID;
const accessToken = process.env.ACCESS_TOKEN;

// Directories and Logging
const storeDir = path.join(__dirname, "data");
const logFile = path.join(storeDir, "process_log.txt");

if (!fs.existsSync(storeDir)) {
  fs.mkdirSync(storeDir, { recursive: true });
}

// Redirect console.log to a log file
const originalConsoleLog = console.log;
console.log = (...args) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${args.join(" ")}\n`);
  originalConsoleLog(...args);
};

// Alert Keywords
const alertKeywords = [
  "shoot",
  "shooting",
  "shot",
  "gunfire",
  "gun",
  "stab",
  "stabbing",
  "stabbed",
  "knife",
  "murder",
  "kill",
  "killing",
  "homicide",
  "manslaughter",
  "body found",
  "corpse",
  "dead body",
  "human remains",
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
  "stolen vehicle",
  "car theft",
  "vehicle theft",
  "stole car",
  "car stolen",
];

// Helper Functions
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getPostedContent = (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data) || [];
    } catch (error) {
      console.error("Error reading posted.json:", error.message);
    }
  }
  return [];
};

const savePostedData = (postContent, postId, filePath) => {
  const dateTimePosted = new Date().toISOString();
  const existingPosts = getPostedContent(filePath);
  existingPosts.push({ postContent, postId, dateTimePosted });
  fs.writeFileSync(filePath, JSON.stringify(existingPosts, null, 2));
  console.log("Post content appended to posted.json.");
};

const formatReportedTime = (ts) => {
  const date = new Date(ts);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  return `Reported at ${hours % 12 || 12}:${minutes} ${ampm}`;
};

// Hybrid Summarization: String Matching + Keyword Matching
const summarizeUpdates = (updates, title) => {
  if (!title) return "No further details at this time.";

  const titleLower = title.toLowerCase();
  const meaningfulUpdates = updates.filter((update) => {
    if (!update || typeof update !== "string") return false;
    const updateLower = update.toLowerCase();

    // Exclude updates that duplicate the title
    if (updateLower.includes(titleLower)) return false;

    // Include updates with alert keywords
    return alertKeywords.some((keyword) => updateLower.includes(keyword));
  });

  return meaningfulUpdates.length > 0
    ? meaningfulUpdates.join(" ")
    : "No further details at this time.";
};

function processTitle(title) {
  let sanitizedTitle = title
    .replace(/\(.*?\)/g, "") // Remove content in parentheses
    .replace(/[^a-zA-Z0-9\s'-]/g, "") // Allow only alphanumeric characters, hyphens, and apostrophes
    .trim();

  if (sanitizedTitle.toLowerCase().includes("body found")) {
    const genderedTerm =
      sanitizedTitle.match(/\b(man|woman|person)\b/i)?.[0] || "Body";
    sanitizedTitle = `${genderedTerm}'s Body Found`.replace(
      "'s Body's",
      "'s Body"
    );
  }

  const truncatedTitle = sanitizedTitle.split(" ").slice(0, 6).join(" ");
  const priority =
    alertKeywords.find((keyword) =>
      sanitizedTitle.toLowerCase().includes(keyword)
    ) || "low";

  return {
    title: truncatedTitle.replace(/,+$/, ""), // Remove trailing commas
    priority,
  };
}

// Sorting and Data Extraction
const sortByPriority = (data) =>
  data.sort((a, b) => {
    const aIndex = alertKeywords.indexOf(a.priority);
    const bIndex = alertKeywords.indexOf(b.priority);
    return (
      (aIndex === -1 ? Infinity : aIndex) - (bIndex === -1 ? Infinity : bIndex)
    );
  });

const extractData = (responseData) => {
  if (!responseData?.results?.length) return [];
  return sortByPriority(
    responseData.results.map((item) => {
      const updates = item.updates
        ? Object.values(item.updates).map((update) => update.text)
        : [];
      const { title, priority } = processTitle(item.title || "");
      return {
        title,
        priority,
        location: item.location,
        neighborhood: item.neighborhood || "Unknown",
        time: formatReportedTime(item.ts),
        updates: summarizeUpdates(updates, title),
      };
    })
  );
};

// Citizen API and Facebook Posting
const fetchAndProcessData = async () => {
  const url = "https://citizen.com/api/incident/trending";
  console.log("Fetching data from Citizen API...");
  try {
    const response = await axios.get(url, { params });
    const data = extractData(response.data);
    fs.writeFileSync(
      path.join(storeDir, "citizens.json"),
      JSON.stringify(data, null, 2)
    );
    console.log("Data saved to citizens.json");
    return data;
  } catch (error) {
    console.error("Error fetching data from Citizens API:", error.message);
    return [];
  }
};

const postToFacebook = async (data) => {
  const postDataFile = path.join(storeDir, "posted.json");
  const previouslyPosted = getPostedContent(postDataFile).map(
    (p) => p.postContent
  );

  for (const post of data) {
    if (post.priority === "low") continue; // Skip low-priority items

    const { title, location, time, updates, neighborhood } = post;
    const borough = neighborhood.split(",").pop().trim(); // Extract borough
    const hashtags = `#safety #alerts #NYC #${borough}`; // Correct hashtag format

    // Format the post content
    const formattedOutput = `${title}\n\n${location}\n${time}\nUpdates:\n${updates}\n\n${hashtags}`;

    // Check for duplicate posts
    if (previouslyPosted.includes(formattedOutput)) {
      console.log(`Skipping duplicate post: ${title}`);
      continue;
    }

    try {
      const response = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        { message: formattedOutput, access_token: accessToken }
      );

      savePostedData(formattedOutput, response.data.id, postDataFile);
      console.log(`Posted: ${title}`);

      console.log("Waiting 60 seconds before posting the next item...");
      await delay(60000); // Wait 60 seconds between posts
    } catch (error) {
      console.error("Error posting to Facebook:", error.message);
    }
  }
};

// // Main Function
// (async () => {
//   console.log("Starting the script...");
//   const data = await fetchAndProcessData();
//   if (data.length > 0) {
//     console.log("Posting high-priority data to Facebook...");
//     await postToFacebook(data);
//   } else {
//     console.log("No data to process.");
//   }
// })();

const fs = require("fs");
const path = require("path");

const postedFilePath = path.join("data", "posted.json");

const getPostedContent = () => {
  if (fs.existsSync(postedFilePath)) {
    try {
      const data = fs.readFileSync(postedFilePath, "utf8");
      return JSON.parse(data) || [];
    } catch (error) {
      console.error("Error reading posted.json:", error.message);
    }
  }
  return [];
};

const savePostedData = (postContent, postId) => {
  const dateTimePosted = new Date().toISOString();
  const existingPosts = getPostedContent();
  existingPosts.push({ postContent, postId, dateTimePosted });
  fs.writeFileSync(postedFilePath, JSON.stringify(existingPosts, null, 2));
  console.log("Post content appended to posted.json.");
};

module.exports = { getPostedContent, savePostedData };

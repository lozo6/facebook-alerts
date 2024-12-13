const axios = require("axios");
const fs = require("fs");

// Path to your config file
const configFilePath = "./config.json";

// Function to read the current access token, appId, and appSecret from the config file
function readConfig() {
  const config = JSON.parse(fs.readFileSync(configFilePath));
  return {
    accessToken: config.accessToken,
    appId: config.appId,
    appSecret: config.appSecret,
  };
}

// Function to update the access token in the config file
function updateAccessToken(newToken) {
  const config = JSON.parse(fs.readFileSync(configFilePath));
  config.accessToken = newToken; // Update the token
  fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2)); // Write back to config.json
}

// Function to refresh the long-lived access token
async function refreshLongLivedToken() {
  const { accessToken, appId, appSecret } = readConfig(); // Get the current token, appId, and appSecret

  try {
    // Send the request to refresh the token
    const response = await axios.get(
      "https://graph.facebook.com/v21.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token", // Indicating we want to extend the token
          client_id: appId, // Your App ID from config
          client_secret: appSecret, // Your App Secret from config
          fb_exchange_token: accessToken, // The long-lived token you already have
        },
      }
    );

    // Get the new long-lived token from the response
    const newLongLivedToken = response.data.access_token;
    console.log("New Long-Lived Token:", newLongLivedToken);

    // Update the config.json file with the new token
    updateAccessToken(newLongLivedToken);
    console.log("Access token updated in config.json");
  } catch (error) {
    if (error.response) {
      console.error("Error Response:", error.response.data);
    } else if (error.request) {
      console.error("Error Request:", error.request);
    } else {
      console.error("Error Message:", error.message);
    }
  }
}

// Call the function to refresh the token and update the config file
refreshLongLivedToken();

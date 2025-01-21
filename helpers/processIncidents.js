const keywordToTitleMap = require("../config/keywordToTitleMap");
const { formatFetchedTime } = require("./formatTime");

const processIncidents = (responseData) => {
  if (!responseData?.results?.length) return [];

  return responseData.results.map((item) => {
    const details = item.updates
      ? Object.values(item.updates).map((update) => update.text).join(" ")
      : "";

    let highestMatchCount = 0;
    let bestMatchAlertData = { title: item.title || "", level: "low", rank: 7 };

    for (const [key, alert] of Object.entries(keywordToTitleMap)) {
      let currentMatchCount = 0;

      alert.phrases.forEach((phrase) => {
        if (
          item.title.toLowerCase().includes(phrase) ||
          details.toLowerCase().includes(phrase)
        ) {
          currentMatchCount += 2;
        }
      });

      alert.words.forEach((word) => {
        const regex = new RegExp(`\\b${word}\\b`, "i");
        if (
          regex.test(item.title.toLowerCase()) ||
          regex.test(details.toLowerCase())
        ) {
          currentMatchCount += 1;
        }
      });

      if (currentMatchCount > highestMatchCount && currentMatchCount >= 2) {
        highestMatchCount = currentMatchCount;
        bestMatchAlertData = {
          title: alert.title,
          level: alert.level,
          rank: alert.rank,
        };
      }
    }

    return {
      ...bestMatchAlertData,
      location: item.location,
      neighborhood: item.neighborhood || "Unknown",
      time: formatFetchedTime(item.cs),
      updates: details,
    };
  });
};

module.exports = processIncidents;

const keywordToTitleMap = require("../config/keywordToTitleMap");
const formatReportedTime = require("./formatTime");

const processIncidents = (responseData) => {
  if (!responseData?.results?.length) return [];

  return responseData.results
    .map((item) => {
      const details = item.updates
        ? Object.values(item.updates).map((update) => update.text).join(" ")
        : "";

      let matchCount = 0;
      let alertData = { title: item.title || "", level: "low", rank: 7 };

      for (const [key, alert] of Object.entries(keywordToTitleMap)) {
        matchCount = alert.phrases.concat(alert.words).reduce((count, term) => {
          const regex = new RegExp(`\\b${term}\\b`, "i");
          if (regex.test(item.title.toLowerCase()) || regex.test(details)) {
            return count + 1;
          }
          return count;
        }, 0);

        if (matchCount >= 2) {
          alertData = { title: alert.title, level: alert.level, rank: alert.rank };
          break;
        }
      }

      return {
        ...alertData,
        location: item.location,
        neighborhood: item.neighborhood || "Unknown",
        time: formatReportedTime(item.cs),
        updates: details,
      };
    })
    .sort((a, b) => a.rank - b.rank);
};

module.exports = processIncidents;

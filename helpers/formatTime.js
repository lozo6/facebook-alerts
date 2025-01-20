// helpers/formatTime.js
const formatFetchedTime = (cs) => {
    const date = new Date(cs);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${minutes}:${seconds}`; // ISO 24-hour format
  };

  const formatReportedTimeForPost = (time) => {
    const date = new Date(time);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    return `Reported ${mm}/${dd}/${yy} at ${hours % 12 || 12}:${minutes} ${ampm}`;
  };

  module.exports = {
    formatFetchedTime,
    formatReportedTimeForPost,
  };

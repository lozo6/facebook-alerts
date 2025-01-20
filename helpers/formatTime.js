const formatReportedTime = (cs) => {
    const date = new Date(cs);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    return `Reported at ${mm}/${dd}/${yy} at ${hours % 12 || 12}:${minutes} ${ampm}`;
  };

  module.exports = formatReportedTime;

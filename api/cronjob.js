const handler = async (req, res) => {
  console.log("Starting the script...");
  const data = await fetchAndProcessData();
  if (data.length > 0) {
    console.log("Posting high-priority data to Facebook...");
    await postToFacebook(data);
  } else {
    console.log("No data to process.");
  }
  res.status(200).send("Script executed successfully");
};

export default handler;

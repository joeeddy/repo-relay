// dashboard/server.js
const express = require("express");
const app = express();
const { threadMap } = require("../threadTracker");

app.get("/", (req, res) => {
  const threads = Array.from(threadMap.entries());
  res.send(`<h1>RepoRelay Threads</h1><pre>${JSON.stringify(threads, null, 2)}</pre>`);
});

app.listen(3000, () => console.log("Dashboard running on http://localhost:3000"));

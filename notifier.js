const axios = require("axios");

async function sendSlackNotification(message) {
  const webhookUrl = process.env.SLACK_WEBHOOK;
  if (!webhookUrl) return;

  await axios.post(webhookUrl, {
    text: `📣 RepoRelay Notification:\n${message}`
  });
}

module.exports = { sendSlackNotification };

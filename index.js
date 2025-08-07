const { Probot } = require("probot");
const loadConfig = require("./configLoader");
const parseCommand = require("./commandParser");
const relayMessage = require("./relayEngine");
const trackThread = require("./threadTracker");

module.exports = (app) => {
  app.on(["issues.opened", "issue_comment.created"], async (context) => {
    const repoConfig = await loadConfig(context);
    if (!repoConfig || !repoConfig.enabled) return;

    const command = parseCommand(context.payload);
    if (!command) return;

    const targets = repoConfig.targets || [];
    for (const targetRepo of targets) {
      const relay = await relayMessage(context, command, targetRepo);
      await trackThread(context, relay);
    }
  });
};

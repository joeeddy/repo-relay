// relayResponder.js
const { Octokit } = require("@octokit/rest");

/**
 * Bi-directional relay handler
 * Listens for comments in relayed issues and sends them back to the origin repo
 */
module.exports = (app) => {
  app.on("issue_comment.created", async (context) => {
    const commentBody = context.payload.comment.body;
    const issueBody = context.payload.issue.body;
    const sender = context.payload.comment.user.login;

    // Avoid relaying bot's own messages
    if (sender === context.payload.repository.owner.login) return;
    if (commentBody.includes("<!-- relayed-by-reporelay -->")) return;

    // Check for origin metadata in issue body
    const originMatch = issueBody.match(
      /Originally relayed from `([\w-]+\/[\w-]+)#(\d+)`/
    );
    if (!originMatch) return;

    const [_, originRepo, originIssueNumber] = originMatch;

    const octokit = await app.auth();

    // Format reply
    const reply = `
💬 **Reply from \`${context.payload.repository.full_name}\`**

> _@${sender} said:_
>
> ${commentBody}

<!-- relayed-by-reporelay -->
`;

    try {
      await octokit.issues.createComment({
        owner: originRepo.split("/")[0],
        repo: originRepo.split("/")[1],
        issue_number: parseInt(originIssueNumber),
        body: reply,
      });
      context.log.info(`Relayed reply from ${context.payload.repository.full_name} to ${originRepo}`);
    } catch (error) {
      context.log.error("Failed to relay reply:", error);
    }
  });
};

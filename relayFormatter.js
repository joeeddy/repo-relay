// relayFormatter.js
const MarkdownIt = require("markdown-it");
const md = new MarkdownIt();

/**
 * Formats a relayed message with custom styling
 * @param {Object} options - Message details
 * @param {string} options.sender - GitHub username of the original sender
 * @param {string} options.originRepo - Full name of the origin repo
 * @param {number} options.originIssueNumber - Issue or PR number in origin repo
 * @param {string} options.message - Raw markdown message to relay
 * @param {string} options.direction - "forward" or "reply"
 * @returns {string} - Formatted markdown message
 */
function formatRelayMessage({ sender, originRepo, originIssueNumber, message, direction }) {
  const sanitizedMessage = md.renderInline(message);

  if (direction === "forward") {
    return `
📡 **Relayed Message from \`${originRepo}\`**

> _@${sender} said:_
>
> ${sanitizedMessage}

🔗 [View original thread](https://github.com/${originRepo}/issues/${originIssueNumber})

<!-- relayed-by-reporelay -->
`;
  } else {
    return `
💬 **Reply from \`${originRepo}\`**

> _@${sender} said:_
>
> ${sanitizedMessage}

<!-- relayed-by-reporelay -->
`;
  }
}

module.exports = { formatRelayMessage };

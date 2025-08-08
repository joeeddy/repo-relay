const axios = require("axios");

/**
 * Send Slack notification if webhook is configured
 */
async function sendSlackNotification(message, type = 'info') {
  const webhookUrl = process.env.SLACK_WEBHOOK;
  if (!webhookUrl) return;

  const emoji = {
    info: '📣',
    error: '🚨',
    warning: '⚠️',
    success: '✅'
  };

  try {
    await axios.post(webhookUrl, {
      text: `${emoji[type] || emoji.info} RepoRelay Notification:\n${message}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${emoji[type] || emoji.info} *RepoRelay ${type.toUpperCase()}*\n${message}`
          }
        }
      ]
    });
    console.log(`Slack notification sent: ${type}`);
  } catch (error) {
    console.error('Failed to send Slack notification:', error.message);
  }
}

/**
 * Post error notification as comment in GitHub issue
 */
async function postErrorToIssue(context, error, operation) {
  try {
    const errorMessage = `
🚨 **RepoRelay Error**

**Operation:** ${operation}  
**Error:** ${error.message || error}  
**Time:** ${new Date().toISOString()}

Please check the logs for more details. If this error persists, contact the repository maintainer.

<!-- error-notification-by-reporelay -->
`;

    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue?.number || context.payload.number,
      body: errorMessage
    });
    
    console.log(`Error notification posted to issue #${context.payload.issue?.number}`);
  } catch (postError) {
    console.error('Failed to post error to issue:', postError.message);
  }
}

/**
 * Comprehensive error handler
 */
async function handleError(context, error, operation, details = {}) {
  const timestamp = new Date().toISOString();
  const repo = context?.payload?.repository?.full_name || 'unknown';
  const issue = context?.payload?.issue?.number || context?.payload?.number || 'unknown';
  
  // Log to console
  console.error(`[${timestamp}] RepoRelay Error in ${operation}:`, error);
  
  // Create detailed error message
  const errorDetails = `
**Repository:** ${repo}
**Issue:** #${issue}
**Operation:** ${operation}
**Error:** ${error.message || error}
**Details:** ${JSON.stringify(details, null, 2)}
**Timestamp:** ${timestamp}
`;

  // Send to Slack if configured
  await sendSlackNotification(errorDetails, 'error');
  
  // Post to GitHub issue if context available
  if (context && context.payload?.issue?.number) {
    await postErrorToIssue(context, error, operation);
  }
  
  // Store error for dashboard
  await logErrorEvent({
    timestamp,
    repo,
    issue,
    operation,
    error: error.message || error.toString(),
    details
  });
}

/**
 * Log events for dashboard display
 */
const eventLog = [];
const MAX_LOG_SIZE = parseInt(process.env.MAX_RELAY_HISTORY) || 1000;

async function logEvent(type, message, details = {}) {
  const event = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    type,
    message,
    details
  };
  
  eventLog.unshift(event); // Add to beginning
  
  // Keep log size manageable
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.splice(MAX_LOG_SIZE);
  }
  
  console.log(`[${event.timestamp}] ${type.toUpperCase()}: ${message}`);
  
  // Send success events to Slack if configured
  if (type === 'success') {
    await sendSlackNotification(message, 'success');
  }
}

async function logErrorEvent(errorDetails) {
  await logEvent('error', `Error in ${errorDetails.operation}`, errorDetails);
}

/**
 * Get event log for dashboard
 */
function getEventLog(filters = {}) {
  let filtered = [...eventLog];
  
  if (filters.type) {
    filtered = filtered.filter(event => event.type === filters.type);
  }
  
  if (filters.repo) {
    filtered = filtered.filter(event => 
      event.details?.repo?.includes(filters.repo) || 
      event.message?.includes(filters.repo)
    );
  }
  
  if (filters.limit) {
    filtered = filtered.slice(0, parseInt(filters.limit));
  }
  
  return filtered;
}

module.exports = { 
  sendSlackNotification, 
  postErrorToIssue, 
  handleError, 
  logEvent, 
  logErrorEvent, 
  getEventLog 
};

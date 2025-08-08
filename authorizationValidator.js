const { isBotSender } = require("./spamPrevention");

const AUTHORIZED_USER = 'joeeddy';

/**
 * Check if a repository is private and owned by the authorized user
 * @param {Object} octokit - GitHub API client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Promise<boolean>} True if repo is private and owned by authorized user
 */
async function isAuthorizedPrivateRepo(octokit, owner, repo) {
  try {
    // Only allow repos owned by the authorized user
    if (owner !== AUTHORIZED_USER) {
      return false;
    }

    // Check if repository is private
    const { data: repoData } = await octokit.rest.repos.get({
      owner,
      repo
    });

    return repoData.private === true;
  } catch (error) {
    console.log(`Error checking repository ${owner}/${repo}:`, error.message);
    return false;
  }
}

/**
 * Validate command authorization based on user, repository, and token
 * @param {Object} context - Probot context
 * @param {Object} command - Parsed command object
 * @returns {Promise<Object>} Authorization result with details
 */
async function validateCommandAuthorization(context, command) {
  const sender = command.sender;
  const repoOwner = context.payload.repository.owner.login;
  const repoName = context.payload.repository.name;
  const isBot = isBotSender(sender);
  const hasToken = command.params && command.params.token;
  const REPO_RELAY_TOKEN = process.env.REPO_RELAY_TOKEN; // Get token dynamically
  const isValidToken = hasToken && command.params.token === REPO_RELAY_TOKEN;

  // Check if user is the authorized user
  const isAuthorizedUser = sender === AUTHORIZED_USER;

  // Check if repository is private and owned by authorized user
  const isAuthorizedRepo = await isAuthorizedPrivateRepo(context.octokit, repoOwner, repoName);

  // Repository must always be authorized (private and owned by authorized user)
  if (!isAuthorizedRepo) {
    return {
      authorized: false,
      reason: 'unauthorized_repo',
      message: `❌ **Unauthorized Repository**\n\nCommands are only allowed from private repositories owned by ${AUTHORIZED_USER}.`
    };
  }

  // Decision logic:
  // 1. Authorized user commands are always allowed in authorized repos
  // 2. Bot/automated commands require valid token AND must be in authorized repos
  // 3. Non-authorized users can only execute commands if they are bots with valid tokens

  if (isAuthorizedUser) {
    // Authorized user is always allowed in authorized repos
    return {
      authorized: true,
      reason: 'authorized_user',
      isBot,
      hasValidToken: isValidToken
    };
  }

  // For non-authorized users, they must be bots with valid tokens
  if (!isBot) {
    return {
      authorized: false,
      reason: 'unauthorized_user',
      message: `❌ **Unauthorized User**\n\nOnly user '${AUTHORIZED_USER}' or authorized bots with valid tokens can use this bot.`
    };
  }

  // Bot commands require valid token
  if (!REPO_RELAY_TOKEN) {
    return {
      authorized: false,
      reason: 'token_not_configured',
      message: `❌ **Configuration Error**\n\nREPO_RELAY_TOKEN not configured on server.`
    };
  }

  if (!isValidToken) {
    return {
      authorized: false,
      reason: 'invalid_token',
      message: `❌ **Invalid Token**\n\nBot/automated commands require a valid token parameter.`
    };
  }

  return {
    authorized: true,
    reason: 'authorized_bot',
    isBot: true,
    hasValidToken: true
  };
}

/**
 * Check if token validation is required for this command
 * @param {string} sender - Command sender username
 * @param {Object} params - Command parameters
 * @returns {boolean} True if token validation is required
 */
function requiresTokenValidation(sender, params) {
  // Require token for bot accounts or when token parameter is provided
  return isBotSender(sender) || (params && params.token);
}

module.exports = {
  validateCommandAuthorization,
  isAuthorizedPrivateRepo,
  requiresTokenValidation,
  AUTHORIZED_USER
};
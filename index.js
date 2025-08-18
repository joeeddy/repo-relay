const { Probot } = require("probot");
const loadConfig = require("./configLoader");
const { parseCommand, validateCommand } = require("./commandParser");
const { validateCommandAuthorization } = require("./authorizationValidator");
const relayMessage = require("./relayEngine");
const { linkThread, getLinkedThread, unlinkThread, cleanupOldLinks } = require("./threadTracker");
const { handleError, logEvent } = require("./notifier");
const { isBotSender } = require("./spamPrevention");

module.exports = (app) => {
  app.on(["issues.opened", "issue_comment.created"], async (context) => {
    try {
      // Skip bot messages to prevent loops
      const sender = context.payload.issue?.user?.login || context.payload.comment?.user?.login || context.payload.sender?.login;
      if (isBotSender(sender)) {
        console.log(`Skipping bot message from ${sender}`);
        return;
      }
      
      const repoConfig = await loadConfig(context);
      if (!repoConfig || !repoConfig.enabled) {
        console.log(`Repository ${context.payload.repository.full_name} not configured for relay`);
        return;
      }

      const command = parseCommand(context.payload);
      if (!command) {
        console.log('No valid command found in message');
        return;
      }
      
      // Validate command syntax
      const validation = validateCommand(command);
      if (!validation.valid) {
        await context.octokit.issues.createComment({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: context.payload.issue?.number || context.payload.number,
          body: `❌ **Command Error:** ${validation.error}\n\nUse \`!help\` to see available commands.`
        });
        return;
      }

      // Validate authorization (user, repository, and token requirements)
      const authResult = await validateCommandAuthorization(context, command);
      if (!authResult.authorized) {
        await context.octokit.issues.createComment({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: context.payload.issue?.number || context.payload.number,
          body: authResult.message
        });
        
        await logEvent('error', `Authorization failed: ${authResult.reason} for user ${command.sender} in ${context.payload.repository.full_name}`);
        return;
      }
      
      console.log(`Processing authorized command: ${command.type} from ${command.sender} (bot: ${authResult.isBot}, token: ${authResult.hasValidToken})`);
      
      // Handle different command types
      switch (command.type) {
        case 'link':
          await handleLinkCommand(context, command, repoConfig);
          break;
          
        case 'unlink':
          await handleUnlinkCommand(context, command);
          break;
          
        case 'status':
          await handleStatusCommand(context);
          break;
          
        case 'help':
          await handleHelpCommand(context);
          break;
          
        case 'cleanup':
          await handleCleanupCommand(context);
          break;
          
        case 'deploy_strategy':
        case 'report_status':
        default:
          // Default relay behavior for configured targets
          await handleRelayCommand(context, command, repoConfig);
          break;
      }
      
    } catch (error) {
      await handleError(context, error, 'main event handler');
    }
  });
  
  // Periodic cleanup task
  setInterval(async () => {
    try {
      await cleanupOldLinks();
    } catch (error) {
      console.error('Error during periodic cleanup:', error);
    }
  }, 24 * 60 * 60 * 1000); // Run daily
};

/**
 * Handle link command
 */
async function handleLinkCommand(context, command, repoConfig) {
  try {
    const originRepo = context.payload.repository.full_name;
    const originIssue = context.payload.issue?.number;
    const targetRepo = command.target;
    
    // Create relay issue first
    const relay = await relayMessage(context, command, targetRepo);
    
    if (relay) {
      // Link the threads
      await linkThread(originRepo, originIssue, targetRepo, relay.targetIssue, {
        command: command.type,
        sender: command.sender,
        relaySignature: relay.signature
      });
      
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: originIssue,
        body: `✅ **Thread Linked Successfully**\n\nThis issue is now linked to ${targetRepo}#${relay.targetIssue}\n\n🔗 [View relayed issue](https://github.com/${targetRepo}/issues/${relay.targetIssue})`
      });
      
      await logEvent('success', `Thread linked: ${originRepo}#${originIssue} ↔ ${targetRepo}#${relay.targetIssue}`);
    }
  } catch (error) {
    await handleError(context, error, 'link command', { command });
  }
}

/**
 * Handle unlink command
 */
async function handleUnlinkCommand(context, command) {
  try {
    const originRepo = context.payload.repository.full_name;
    const originIssue = context.payload.issue?.number;
    
    const wasLinked = await unlinkThread(originRepo, originIssue);
    
    const message = wasLinked 
      ? '✅ **Thread Unlinked**\n\nThis issue is no longer linked to other repositories.'
      : 'ℹ️ **No Link Found**\n\nThis issue was not linked to any other repositories.';
      
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: originIssue,
      body: message
    });
    
    if (wasLinked) {
      await logEvent('success', `Thread unlinked: ${originRepo}#${originIssue}`);
    }
  } catch (error) {
    await handleError(context, error, 'unlink command', { command });
  }
}

/**
 * Handle status command
 */
async function handleStatusCommand(context) {
  try {
    const originRepo = context.payload.repository.full_name;
    const originIssue = context.payload.issue?.number;
    
    const linkedThread = await getLinkedThread(originRepo, originIssue);
    
    let statusMessage;
    if (linkedThread) {
      const age = Math.floor((Date.now() - linkedThread.timestamp) / (1000 * 60 * 60 * 24));
      statusMessage = `📊 **Thread Status**\n\n✅ **Linked to:** ${linkedThread.target}\n⏰ **Age:** ${age} days\n🔗 [View linked issue](https://github.com/${linkedThread.target.replace('#', '/issues/')})`;
    } else {
      statusMessage = `📊 **Thread Status**\n\n❌ **Not Linked**\n\nThis issue is not currently linked to any other repositories.`;
    }
    
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: originIssue,
      body: statusMessage
    });
  } catch (error) {
    await handleError(context, error, 'status command');
  }
}

/**
 * Handle help command
 */
async function handleHelpCommand(context) {
  const helpMessage = `
🤖 **RepoRelay Commands**

**Available Commands:**
- \`!link target:owner/repo\` - Link this issue to another repository
- \`!unlink\` - Remove link to other repositories  
- \`!status\` - Show current thread link status
- \`!cleanup\` - Clean up old thread links (admin only)
- \`!deploy_strategy strategy:name\` - Deploy a specific strategy
- \`!report_status\` - Request status report

**Command Formats:**
\`\`\`
!command target:owner/repo param1:value1 param2:value2
command: type
target: owner/repo
\`\`\`

**Security Notes:**
- Commands are only accepted from authorized private repositories
- Bot/automated commands require a valid token parameter: \`token:your_token\`
- Commands from public repositories are blocked

**Examples:**
\`\`\`
!link target:your-org/your-target-repo
!deploy_strategy strategy:arbitrage target:your-org/your-trading-repo
!deploy_strategy strategy:arbitrage target:your-org/your-trading-repo token:your_token
\`\`\`

📊 [View Dashboard](${process.env.DASHBOARD_URL || 'http://localhost:3001'})
`;

  await context.octokit.issues.createComment({
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
    issue_number: context.payload.issue?.number || context.payload.number,
    body: helpMessage
  });
}

/**
 * Handle cleanup command (admin only)
 */
async function handleCleanupCommand(context) {
  try {
    const removed = await cleanupOldLinks(30); // 30 days
    
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue?.number || context.payload.number,
      body: `🧹 **Cleanup Complete**\n\nRemoved ${removed} old thread links (older than 30 days).`
    });
    
    await logEvent('success', `Manual cleanup removed ${removed} old links`);
  } catch (error) {
    await handleError(context, error, 'cleanup command');
  }
}

/**
 * Handle default relay command
 */
async function handleRelayCommand(context, command, repoConfig) {
  try {
    const targets = repoConfig.targets || [];
    const specificTarget = command.target;
    
    // Use specific target if provided, otherwise use configured targets
    const targetRepos = specificTarget ? [specificTarget] : targets;
    
    if (targetRepos.length === 0) {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: `❌ **No Target Repositories**\n\nNo target repositories configured for command: ${command.type}`
      });
      return;
    }
    
    for (const targetRepo of targetRepos) {
      const relay = await relayMessage(context, command, targetRepo);
      if (relay) {
        await linkThread(
          relay.origin, 
          relay.originIssue, 
          relay.target, 
          relay.targetIssue,
          {
            command: command.type,
            sender: command.sender,
            relaySignature: relay.signature
          }
        );
      }
    }
  } catch (error) {
    await handleError(context, error, 'relay command', { command });
  }
}

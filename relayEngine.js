const { handleError, logEvent } = require('./notifier');
const { generateRelaySignature, isRelayedMessage, addToRelayHistory, checkRelayHistory } = require('./spamPrevention');

/**
 * Enhanced relay engine with spam prevention and error handling
 */
module.exports = async function relayMessage(context, command, targetRepo) {
  try {
    // Validate inputs
    if (!context || !command || !targetRepo) {
      throw new Error('Missing required parameters for relay');
    }
    
    const sender = command.sender;
    const originalMessage = context.payload.issue?.body || context.payload.comment?.body;
    const originRepo = context.payload.repository.full_name;
    const originIssue = context.payload.issue?.number;
    
    // Check if this is a bot message (prevent loops)
    if (isRelayedMessage(originalMessage)) {
      console.log('Skipping relay of bot message to prevent loop');
      return null;
    }
    
    // Check if this exact message was already relayed
    const messageHash = generateRelaySignature(originRepo, originIssue, originalMessage, targetRepo);
    if (checkRelayHistory(messageHash)) {
      console.log('Skipping duplicate relay (already processed)');
      return null;
    }
    
    // Generate unique relay signature
    const relaySignature = generateRelaySignature(originRepo, originIssue, originalMessage, targetRepo);
    
    const issueTitle = `[Relay] ${command.type} from ${context.payload.repository.name}`;
    const issueBody = `
📡 **Relayed from \`${originRepo}#${originIssue}\`**

**Command:** ${command.type}  
**Sender:** @${sender}  
**Parameters:** ${JSON.stringify(command.params, null, 2)}

---

**Original Message:**

${originalMessage}

---

🔗 [View original thread](https://github.com/${originRepo}/issues/${originIssue})

<!-- relayed-by-reporelay signature:${relaySignature} -->
Originally relayed from \`${originRepo}#${originIssue}\`
`;

    const [owner, repo] = targetRepo.split("/");
    
    if (!owner || !repo) {
      throw new Error(`Invalid target repository format: ${targetRepo}. Expected owner/repo`);
    }
    
    console.log(`Relaying message from ${originRepo}#${originIssue} to ${targetRepo}`);
    
    const issue = await context.octokit.issues.create({
      owner,
      repo,
      title: issueTitle,
      body: issueBody
    });

    // Record this relay in history
    addToRelayHistory(messageHash, {
      originRepo,
      originIssue,
      targetRepo,
      targetIssue: issue.data.number,
      timestamp: Date.now(),
      sender,
      signature: relaySignature
    });

    const relayResult = {
      origin: originRepo,
      originIssue,
      target: targetRepo,
      targetIssue: issue.data.number,
      signature: relaySignature,
      sender,
      timestamp: Date.now()
    };
    
    // Log successful relay
    await logEvent('success', 
      `Message relayed from ${originRepo}#${originIssue} to ${targetRepo}#${issue.data.number}`,
      relayResult
    );
    
    return relayResult;
    
  } catch (error) {
    // Comprehensive error handling
    await handleError(context, error, 'relayMessage', {
      command,
      targetRepo,
      originRepo: context?.payload?.repository?.full_name,
      originIssue: context?.payload?.issue?.number
    });
    
    throw error; // Re-throw for caller to handle
  }
};

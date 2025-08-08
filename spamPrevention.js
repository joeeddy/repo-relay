const crypto = require('crypto');

// In-memory relay history (could be made persistent if needed)
const relayHistory = new Map();
const MAX_HISTORY_SIZE = parseInt(process.env.MAX_RELAY_HISTORY) || 1000;

/**
 * Generate unique signature for a relay operation
 */
function generateRelaySignature(originRepo, originIssue, message, targetRepo) {
  const content = `${originRepo}#${originIssue}:${targetRepo}:${message}`;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

/**
 * Check if a message is already a relayed message
 */
function isRelayedMessage(messageBody) {
  if (!messageBody) return false;
  
  // Check for relay signatures
  const relayMarkers = [
    '<!-- relayed-by-reporelay',
    'Originally relayed from',
    '📡 **Relayed from',
    '💬 **Reply from'
  ];
  
  return relayMarkers.some(marker => messageBody.includes(marker));
}

/**
 * Check if this relay was already processed
 */
function checkRelayHistory(messageHash) {
  return relayHistory.has(messageHash);
}

/**
 * Add relay to history to prevent duplicates
 */
function addToRelayHistory(messageHash, relayDetails) {
  // Add to history
  relayHistory.set(messageHash, {
    ...relayDetails,
    processedAt: Date.now()
  });
  
  // Keep history size manageable
  if (relayHistory.size > MAX_HISTORY_SIZE) {
    // Remove oldest entries
    const entries = Array.from(relayHistory.entries());
    entries.sort((a, b) => a[1].processedAt - b[1].processedAt);
    
    // Remove oldest 10% of entries
    const toRemove = Math.floor(MAX_HISTORY_SIZE * 0.1);
    for (let i = 0; i < toRemove; i++) {
      relayHistory.delete(entries[i][0]);
    }
  }
  
  console.log(`Added relay to history: ${messageHash} (total: ${relayHistory.size})`);
}

/**
 * Get relay history for debugging/dashboard
 */
function getRelayHistory(limit = 100) {
  const entries = Array.from(relayHistory.entries());
  return entries
    .sort((a, b) => b[1].processedAt - a[1].processedAt)
    .slice(0, limit)
    .map(([hash, details]) => ({ hash, ...details }));
}

/**
 * Clean up old relay history
 */
function cleanupRelayHistory(maxAgeInDays = 7) {
  const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
  let removed = 0;
  
  for (const [hash, details] of relayHistory.entries()) {
    if (details.processedAt < cutoffTime) {
      relayHistory.delete(hash);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`Cleaned up ${removed} old relay history entries`);
  }
  
  return removed;
}

/**
 * Check if sender is a known bot account
 */
function isBotSender(sender) {
  const botPatterns = [
    /bot$/i,
    /\[bot\]$/i,
    /^github-actions/i,
    /^dependabot/i,
    /^renovate/i
  ];
  
  return botPatterns.some(pattern => pattern.test(sender));
}

module.exports = {
  generateRelaySignature,
  isRelayedMessage,
  checkRelayHistory,
  addToRelayHistory,
  getRelayHistory,
  cleanupRelayHistory,
  isBotSender
};
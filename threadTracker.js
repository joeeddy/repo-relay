const threadMap = new Map();

/**
 * Stores thread links between origin and target issues/comments
 */
function linkThread(originRepo, originIssue, targetRepo, targetIssue) {
  const key = `${originRepo}#${originIssue}`;
  threadMap.set(key, {
    target: `${targetRepo}#${targetIssue}`,
    timestamp: Date.now()
  });
}

function getLinkedThread(originRepo, originIssue) {
  const key = `${originRepo}#${originIssue}`;
  return threadMap.get(key);
}

module.exports = { linkThread, getLinkedThread };

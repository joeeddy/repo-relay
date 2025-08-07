const threadMap = {};

module.exports = async function trackThread(context, relay) {
  const key = `${relay.origin}#${relay.originIssue}`;
  threadMap[key] = {
    linkedTo: `${relay.target}#${relay.targetIssue}`,
    status: "active"
  };

  context.log(`Thread linked: ${key} ↔ ${threadMap[key].linkedTo}`);
};

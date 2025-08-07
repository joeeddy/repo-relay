/**
 * Determines relay targets based on labels or keywords
 */
function getSmartTargets(context, config) {
  const labels = context.payload.issue?.labels.map(l => l.name) || [];
  const body = context.payload.issue?.body || "";

  const targets = [];

  if (labels.includes("trading")) {
    targets.push("hummingbot-2.0");
  }
  if (body.includes("analytics")) {
    targets.push("analytics-bot");
  }

  return targets.length ? targets : config.targets || [];
}

module.exports = { getSmartTargets };

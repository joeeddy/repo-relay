module.exports = function parseCommand(payload) {
  const body = payload.issue?.body || payload.comment?.body;
  if (!body) return null;

  const match = body.match(/command:\s*(\w+)\s*[\r\n]+target:\s*(\S+)/);
  if (!match) return null;

  return {
    type: match[1],
    target: match[2],
    params: {} // Extend to parse structured params later
  };
};

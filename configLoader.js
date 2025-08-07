module.exports = async function loadConfig(context) {
  try {
    const config = await context.config(".dispatcherbot.yml");
    return config;
  } catch (err) {
    context.log("No config found");
    return null;
  }
};

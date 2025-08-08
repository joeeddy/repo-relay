/**
 * Parse commands with enhanced parameter support
 * Supports formats like:
 * - command: link target: repo/name
 * - !link target:repo/name param1:value1 param2:value2 token:shared_token
 * - /command target repo/name param1 value1
 */
function parseCommand(payload) {
  const body = payload.issue?.body || payload.comment?.body;
  const sender = payload.issue?.user?.login || payload.comment?.user?.login || payload.sender?.login;
  
  if (!body || !sender) return null;
  
  // Support multiple command formats
  const patterns = [
    // Format: command: type target: repo
    /command:\s*(\w+)\s*[\r\n]+target:\s*(\S+)/i,
    // Format: !command target:repo param1:value1 param2:value2
    /[!\/](\w+)\s+(.*)/i,
    // Format: !command (no parameters)
    /[!\/](\w+)$/i,
    // Format: command type target repo
    /command\s+(\w+)\s+target\s+(\S+)/i
  ];
  
  // Also check for traditional format with multiple lines
  const traditionalPattern = /command:\s*(\w+)[\r\n]+([\s\S]*)/i;
  const traditionalMatch = body.match(traditionalPattern);
  
  if (traditionalMatch) {
    const command = {
      type: traditionalMatch[1].toLowerCase(),
      sender: sender,
      timestamp: Date.now(),
      params: {}
    };
    
    // Parse each line for key: value pairs
    const lines = traditionalMatch[2].split(/[\r\n]+/);
    for (const line of lines) {
      const lineMatch = line.match(/(\w+):\s*(.+)/);
      if (lineMatch) {
        const key = lineMatch[1].trim();
        const value = lineMatch[2].trim();
        command.params[key] = value;
        
        // Set target if it's a target parameter
        if (key === 'target') {
          command.target = value;
        }
      }
    }
    
    // Validate required fields
    if (command.type && (command.target || isNonTargetCommand(command.type))) {
      return command;
    }
  }
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const command = {
        type: match[1].toLowerCase(),
        sender: sender,
        timestamp: Date.now(),
        params: {}
      };
      
      if (match[2]) {
        if (match[2].includes(':')) {
          // Parse parameters in format param1:value1 param2:value2
          const paramString = match[2];
          const paramPairs = paramString.split(/\s+/);
          
          for (const pair of paramPairs) {
            if (pair.includes(':')) {
              const [key, ...valueParts] = pair.split(':');
              const value = valueParts.join(':'); // Handle values with colons
              if (key && value) {
                command.params[key.trim()] = value.trim();
              }
            }
          }
          
          // Target is typically the first parameter or special case
          command.target = command.params.target || command.params.repo;
        } else {
          // Simple target format
          command.target = match[2];
        }
      }
      
      // Validate required fields
      if (command.type && (command.target || isNonTargetCommand(command.type))) {
        return command;
      }
    }
  }
  
  return null;
}

/**
 * Check if command doesn't require a target
 */
function isNonTargetCommand(commandType) {
  const nonTargetCommands = ['status', 'help', 'list', 'cleanup', 'unlink'];
  return nonTargetCommands.includes(commandType);
}

/**
 * Validate command parameters based on command type
 */
function validateCommand(command) {
  if (!command) return { valid: false, error: 'No command provided' };
  
  const validCommands = ['link', 'unlink', 'status', 'help', 'list', 'cleanup', 'deploy_strategy', 'report_status'];
  
  if (!validCommands.includes(command.type)) {
    return { 
      valid: false, 
      error: `Unknown command: ${command.type}. Valid commands: ${validCommands.join(', ')}` 
    };
  }
  
  // Command-specific validation
  switch (command.type) {
    case 'link':
      if (!command.target) {
        return { valid: false, error: 'Link command requires target repository' };
      }
      if (!command.target.includes('/')) {
        return { valid: false, error: 'Target must be in format owner/repo' };
      }
      break;
      
    case 'unlink':
      // Can unlink current thread or specific target
      break;
      
    case 'deploy_strategy':
      if (!command.params.strategy) {
        return { valid: false, error: 'deploy_strategy requires strategy parameter' };
      }
      break;
  }
  
  return { valid: true };
}

module.exports = { parseCommand, validateCommand };

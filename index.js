const { Probot } = require("probot");
const loadConfig = require("./configLoader");
const { parseCommand, validateCommand } = require("./commandParser");
const { validateCommandAuthorization } = require("./authorizationValidator");
const relayMessage = require("./relayEngine");
const { linkThread, getLinkedThread, unlinkThread, cleanupOldLinks } = require("./threadTracker");
const { handleError, logEvent } = require("./notifier");
const { isBotSender } = require("./spamPrevention");
const { 
  ArXivIntegration, 
  ExperimentTracker, 
  ModelDatasetManager, 
  ResearchToolIntegrations, 
  CollaborationTools 
} = require("./researchTools");

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
          
        // Research-specific commands
        case 'share_experiment':
          await handleShareExperimentCommand(context, command);
          break;
          
        case 'share_results':
          await handleShareResultsCommand(context, command);
          break;
          
        case 'share_dataset':
          await handleShareDatasetCommand(context, command);
          break;
          
        case 'share_model':
          await handleShareModelCommand(context, command);
          break;
          
        case 'cite_paper':
          await handleCitePaperCommand(context, command);
          break;
          
        case 'search_papers':
          await handleSearchPapersCommand(context, command);
          break;
          
        case 'track_experiment':
          await handleTrackExperimentCommand(context, command);
          break;
          
        case 'list_experiments':
          await handleListExperimentsCommand(context, command);
          break;
          
        case 'show_metrics':
          await handleShowMetricsCommand(context, command);
          break;
          
        case 'peer_review':
          await handlePeerReviewCommand(context, command);
          break;
          
        case 'research_proposal':
          await handleResearchProposalCommand(context, command);
          break;
          
        case 'share_logs':
          await handleShareLogsCommand(context, command);
          break;
          
        case 'tensorboard_link':
          await handleTensorBoardLinkCommand(context, command);
          break;
          
        case 'wandb_link':
          await handleWandBLinkCommand(context, command);
          break;
          
        case 'mlflow_link':
          await handleMLflowLinkCommand(context, command);
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
🤖 **RepoRelay Commands for AGI Researchers**

**Core Commands:**
- \`!link target:owner/repo\` - Link this issue to another repository
- \`!unlink\` - Remove link to other repositories  
- \`!status\` - Show current thread link status
- \`!cleanup\` - Clean up old thread links (admin only)
- \`!help\` - Show this help message

**Research Collaboration:**
- \`!share_experiment name:exp_name description:desc\` - Share experiment details
- \`!share_results experiment:name findings:results\` - Share research results
- \`!track_experiment name:exp_name type:training\` - Track experiment progress
- \`!list_experiments\` - List all tracked experiments
- \`!show_metrics [experiment_id:id]\` - Show experiment metrics

**Data & Model Sharing:**
- \`!share_dataset name:dataset_name type:training\` - Share dataset information
- \`!share_model name:model_name architecture:transformer\` - Share model details
- \`!share_logs experiment:name content:log_data\` - Share experiment logs

**Literature & Citations:**
- \`!cite_paper arxiv_id:2301.00001\` - Cite an ArXiv paper
- \`!cite_paper title:"Paper Title" authors:"Author Name"\` - Cite by title
- \`!search_papers query:"machine learning" limit:5\` - Search ArXiv papers

**Tool Integrations:**
- \`!tensorboard_link url:http://localhost:6006\` - Share TensorBoard link
- \`!wandb_link url:wandb_url run_name:experiment_1\` - Share W&B run
- \`!mlflow_link url:mlflow_url experiment:exp_name\` - Share MLflow experiment

**Peer Review & Collaboration:**
- \`!peer_review type:request reviewer:username\` - Request peer review
- \`!peer_review type:complete rating:8/10\` - Complete a review
- \`!research_proposal title:"Proposal Title"\` - Share research proposal

**Command Formats:**
\`\`\`
!command target:owner/repo param1:value1 param2:value2
command: type
target: owner/repo
param1: value1
\`\`\`

**Security Notes:**
- Commands are only accepted from authorized private repositories
- Bot/automated commands require a valid token parameter: \`token:your_token\`
- Commands from public repositories are blocked

**Research Examples:**
\`\`\`
!share_experiment name:"GPT Training" type:language_model status:running
!cite_paper arxiv_id:1706.03762 relevance:"Attention mechanism for our model"
!tensorboard_link url:http://localhost:6006 description:"Training loss curves"
!peer_review type:request reviewer:colleague scope:"Model architecture review"
\`\`\`

📊 [View Dashboard](${process.env.DASHBOARD_URL || 'http://localhost:3001'})
🔬 [Research Documentation](https://github.com/joeeddy/repo-relay#research-features)
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

/**
 * Research-specific command handlers
 */

/**
 * Handle share experiment command
 */
async function handleShareExperimentCommand(context, command) {
  try {
    const experimentTracker = new ExperimentTracker();
    
    let experimentData;
    if (command.params.experiment_id) {
      experimentData = await experimentTracker.getExperiment(command.params.experiment_id);
      if (!experimentData) {
        throw new Error(`Experiment ${command.params.experiment_id} not found`);
      }
    } else {
      experimentData = {
        name: command.params.name,
        description: command.params.description || 'No description provided',
        repo: context.payload.repository.full_name,
        issue: context.payload.issue?.number,
        type: command.params.type || 'experiment',
        status: command.params.status || 'running',
        parameters: command.params.parameters ? JSON.parse(command.params.parameters) : {},
        metrics: command.params.metrics ? JSON.parse(command.params.metrics) : {}
      };
    }
    
    const shareMessage = `
🧪 **Experiment Shared**

**Name:** ${experimentData.name}
**Status:** ${experimentData.status}
**Type:** ${experimentData.type || 'General Experiment'}
**Repository:** ${experimentData.repo}

**Description:**
${experimentData.description}

**Parameters:**
\`\`\`json
${JSON.stringify(experimentData.parameters || {}, null, 2)}
\`\`\`

**Current Metrics:**
\`\`\`json
${JSON.stringify(experimentData.metrics || {}, null, 2)}
\`\`\`

${experimentData.url ? `**URL:** ${experimentData.url}` : ''}
${experimentData.paper ? `**Related Paper:** ${experimentData.paper}` : ''}

---
*Shared via RepoRelay from ${context.payload.repository.full_name}*
`;

    if (command.target) {
      // Relay to specific target
      await relayMessage(context, { ...command, type: 'share_experiment' }, command.target);
    } else {
      // Post in current repository
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: shareMessage
      });
    }
    
    await logEvent('success', `Experiment shared: ${experimentData.name}`);
  } catch (error) {
    await handleError(context, error, 'share experiment command');
  }
}

/**
 * Handle share results command
 */
async function handleShareResultsCommand(context, command) {
  try {
    const resultsMessage = `
📊 **Research Results Shared**

**Experiment:** ${command.params.experiment || 'Not specified'}
**Type:** ${command.params.type || 'General Results'}
**Date:** ${new Date().toISOString().split('T')[0]}

**Key Findings:**
${command.params.findings || 'No findings specified'}

**Metrics:**
${command.params.metrics ? 
  '```json\n' + JSON.stringify(JSON.parse(command.params.metrics), null, 2) + '\n```' : 
  'No metrics provided'}

**Performance:**
${command.params.performance || 'No performance data provided'}

**Methodology:**
${command.params.methodology || 'No methodology specified'}

**Conclusions:**
${command.params.conclusions || 'No conclusions provided'}

${command.params.visualization ? `**Visualizations:** ${command.params.visualization}` : ''}
${command.params.code ? `**Code:** ${command.params.code}` : ''}
${command.params.data ? `**Data:** ${command.params.data}` : ''}

---
*Results shared via RepoRelay from ${context.payload.repository.full_name}*
`;

    if (command.target) {
      await relayMessage(context, { ...command, type: 'share_results' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: resultsMessage
      });
    }
    
    await logEvent('success', `Research results shared`);
  } catch (error) {
    await handleError(context, error, 'share results command');
  }
}

/**
 * Handle share dataset command
 */
async function handleShareDatasetCommand(context, command) {
  try {
    const datasetInfo = {
      name: command.params.dataset || command.params.name,
      type: command.params.type,
      size: command.params.size,
      format: command.params.format,
      domain: command.params.domain,
      license: command.params.license,
      repo: context.payload.repository.full_name,
      version: command.params.version,
      description: command.params.description,
      url: command.params.url,
      paper: command.params.paper,
      preprocessing: command.params.preprocessing
    };
    
    const datasetMessage = ModelDatasetManager.formatDatasetInfo(datasetInfo);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'share_dataset' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: datasetMessage + '\n---\n*Dataset shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `Dataset shared: ${datasetInfo.name}`);
  } catch (error) {
    await handleError(context, error, 'share dataset command');
  }
}

/**
 * Handle share model command
 */
async function handleShareModelCommand(context, command) {
  try {
    const modelInfo = {
      name: command.params.model || command.params.name,
      type: command.params.type,
      architecture: command.params.architecture,
      parameters: command.params.parameters,
      performance: command.params.performance ? JSON.parse(command.params.performance) : null,
      repo: context.payload.repository.full_name,
      version: command.params.version,
      training_data: command.params.training_data,
      description: command.params.description,
      url: command.params.url,
      paper: command.params.paper
    };
    
    const modelMessage = ModelDatasetManager.formatModelInfo(modelInfo);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'share_model' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: modelMessage + '\n---\n*Model shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `Model shared: ${modelInfo.name}`);
  } catch (error) {
    await handleError(context, error, 'share model command');
  }
}

/**
 * Handle cite paper command
 */
async function handleCitePaperCommand(context, command) {
  try {
    let paper = null;
    
    if (command.params.arxiv_id) {
      paper = await ArXivIntegration.getPaperByArXivId(command.params.arxiv_id);
    } else if (command.params.title) {
      const papers = await ArXivIntegration.searchPapers(command.params.title, 1);
      paper = papers[0] || null;
    }
    
    let citationMessage;
    if (paper) {
      citationMessage = `
📄 **Paper Citation**

**Title:** ${paper.title}
**Authors:** ${paper.authors.join(', ')}
**ArXiv ID:** ${paper.arxivId}
**URL:** ${paper.url}
**Published:** ${paper.published}

**Abstract:**
${paper.summary}

${command.params.notes ? `**Notes:** ${command.params.notes}` : ''}
${command.params.relevance ? `**Relevance:** ${command.params.relevance}` : ''}
`;
    } else {
      citationMessage = `
📄 **Paper Citation**

**Title:** ${command.params.title || 'Not specified'}
**Authors:** ${command.params.authors || 'Not specified'}
**DOI:** ${command.params.doi || 'Not specified'}
**URL:** ${command.params.url || 'Not specified'}
**Year:** ${command.params.year || 'Not specified'}

${command.params.abstract ? `**Abstract:** ${command.params.abstract}` : ''}
${command.params.notes ? `**Notes:** ${command.params.notes}` : ''}
${command.params.relevance ? `**Relevance:** ${command.params.relevance}` : ''}
`;
    }
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'cite_paper' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: citationMessage + '\n---\n*Citation shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `Paper cited: ${command.params.title || command.params.arxiv_id}`);
  } catch (error) {
    await handleError(context, error, 'cite paper command');
  }
}

/**
 * Handle search papers command
 */
async function handleSearchPapersCommand(context, command) {
  try {
    const query = command.params.query || command.params.q;
    if (!query) {
      throw new Error('Search query is required');
    }
    
    const maxResults = parseInt(command.params.limit) || 5;
    const papers = await ArXivIntegration.searchPapers(query, maxResults);
    
    let searchMessage = `
🔍 **ArXiv Paper Search Results**

**Query:** "${query}"
**Results:** ${papers.length} papers found

`;

    papers.forEach((paper, index) => {
      searchMessage += `
**${index + 1}. ${paper.title}**
- **Authors:** ${paper.authors.join(', ')}
- **ArXiv ID:** ${paper.arxivId}
- **URL:** ${paper.url}
- **Published:** ${paper.published}
- **Abstract:** ${paper.summary.substring(0, 200)}...

`;
    });
    
    if (papers.length === 0) {
      searchMessage += '\nNo papers found for this query. Try different keywords.';
    }
    
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue?.number || context.payload.number,
      body: searchMessage + '\n---\n*Search powered by ArXiv API via RepoRelay*'
    });
    
    await logEvent('success', `Paper search completed: ${query}`);
  } catch (error) {
    await handleError(context, error, 'search papers command');
  }
}

/**
 * Handle track experiment command
 */
async function handleTrackExperimentCommand(context, command) {
  try {
    const experimentTracker = new ExperimentTracker();
    
    const experimentData = {
      id: command.params.experiment_id,
      name: command.params.name,
      description: command.params.description,
      repo: context.payload.repository.full_name,
      issue: context.payload.issue?.number,
      type: command.params.type || 'experiment',
      status: command.params.status || 'running',
      parameters: command.params.parameters ? JSON.parse(command.params.parameters) : {},
      metrics: command.params.metrics ? JSON.parse(command.params.metrics) : {},
      url: command.params.url,
      paper: command.params.paper
    };
    
    const experimentId = await experimentTracker.trackExperiment(experimentData);
    
    const trackMessage = `
✅ **Experiment Tracked**

**Experiment ID:** ${experimentId}
**Name:** ${experimentData.name}
**Status:** ${experimentData.status}
**Repository:** ${experimentData.repo}

The experiment is now being tracked. Use \`!list_experiments\` to view all tracked experiments.
`;

    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue?.number || context.payload.number,
      body: trackMessage
    });
    
    await logEvent('success', `Experiment tracked: ${experimentId}`);
  } catch (error) {
    await handleError(context, error, 'track experiment command');
  }
}

/**
 * Handle list experiments command
 */
async function handleListExperimentsCommand(context, command) {
  try {
    const experimentTracker = new ExperimentTracker();
    const filters = {
      status: command.params.status,
      repo: command.params.repo
    };
    
    const experiments = await experimentTracker.listExperiments(filters);
    
    let listMessage = `
📋 **Experiment List**

**Total Experiments:** ${experiments.length}
${filters.status ? `**Filter:** Status = ${filters.status}` : ''}
${filters.repo ? `**Filter:** Repository = ${filters.repo}` : ''}

`;

    if (experiments.length === 0) {
      listMessage += 'No experiments found matching the criteria.';
    } else {
      experiments.slice(0, 10).forEach((exp, index) => {
        const age = Math.floor((Date.now() - exp.timestamp) / (1000 * 60 * 60 * 24));
        listMessage += `
**${index + 1}. ${exp.name}** (${exp.id})
- **Status:** ${exp.status}
- **Type:** ${exp.type}
- **Repository:** ${exp.repo}
- **Age:** ${age} days
- **Description:** ${exp.description || 'No description'}
`;
      });
      
      if (experiments.length > 10) {
        listMessage += `\n... and ${experiments.length - 10} more experiments.`;
      }
    }
    
    await context.octokit.issues.createComment({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: context.payload.issue?.number || context.payload.number,
      body: listMessage
    });
    
    await logEvent('success', `Experiment list displayed`);
  } catch (error) {
    await handleError(context, error, 'list experiments command');
  }
}

/**
 * Handle show metrics command
 */
async function handleShowMetricsCommand(context, command) {
  try {
    const experimentTracker = new ExperimentTracker();
    
    if (command.params.experiment_id) {
      const experiment = await experimentTracker.getExperiment(command.params.experiment_id);
      if (!experiment) {
        throw new Error(`Experiment ${command.params.experiment_id} not found`);
      }
      
      const metricsMessage = `
📊 **Experiment Metrics**

**Experiment:** ${experiment.name} (${experiment.id})
**Status:** ${experiment.status}
**Last Updated:** ${experiment.lastUpdated ? new Date(experiment.lastUpdated).toISOString() : 'Not updated'}

**Parameters:**
\`\`\`json
${JSON.stringify(experiment.parameters || {}, null, 2)}
\`\`\`

**Current Metrics:**
\`\`\`json
${JSON.stringify(experiment.metrics || {}, null, 2)}
\`\`\`

**Results:**
\`\`\`json
${JSON.stringify(experiment.results || {}, null, 2)}
\`\`\`
`;

      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: metricsMessage
      });
    } else {
      // Show general metrics about all experiments
      const experiments = await experimentTracker.listExperiments();
      const statusCounts = experiments.reduce((acc, exp) => {
        acc[exp.status] = (acc[exp.status] || 0) + 1;
        return acc;
      }, {});
      
      const metricsMessage = `
📊 **Research Metrics Overview**

**Total Experiments:** ${experiments.length}
**Status Breakdown:**
${Object.entries(statusCounts).map(([status, count]) => `- ${status}: ${count}`).join('\n')}

**Recent Activity:** ${experiments.filter(exp => (Date.now() - exp.timestamp) < (7 * 24 * 60 * 60 * 1000)).length} experiments in the last 7 days

Use \`!show_metrics experiment_id:your_experiment_id\` to view specific experiment metrics.
`;

      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: metricsMessage
      });
    }
    
    await logEvent('success', `Metrics displayed`);
  } catch (error) {
    await handleError(context, error, 'show metrics command');
  }
}

/**
 * Handle peer review command
 */
async function handlePeerReviewCommand(context, command) {
  try {
    const reviewType = command.params.type;
    
    let reviewMessage;
    switch (reviewType) {
      case 'request':
        const reviewData = {
          type: command.params.review_type || 'General Review',
          reviewer: command.params.reviewer,
          deadline: command.params.deadline,
          priority: command.params.priority,
          scope: command.params.scope,
          notes: command.params.notes,
          files: command.params.files ? command.params.files.split(',') : []
        };
        reviewMessage = CollaborationTools.formatPeerReviewRequest(reviewData);
        break;
        
      case 'accept':
        reviewMessage = `
✅ **Peer Review Accepted**

**Reviewer:** @${command.params.reviewer || command.sender}
**Accepted on:** ${new Date().toISOString().split('T')[0]}

Review has been accepted and will be completed by the specified deadline.
`;
        break;
        
      case 'complete':
        reviewMessage = `
✅ **Peer Review Completed**

**Reviewer:** @${command.sender}
**Completed on:** ${new Date().toISOString().split('T')[0]}

**Review Summary:**
${command.params.summary || 'No summary provided'}

**Rating:** ${command.params.rating || 'Not rated'}
**Recommendation:** ${command.params.recommendation || 'Not specified'}

${command.params.detailed_feedback ? `**Detailed Feedback:**\n${command.params.detailed_feedback}` : ''}
`;
        break;
        
      default:
        throw new Error(`Invalid peer review type: ${reviewType}`);
    }
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'peer_review' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: reviewMessage
      });
    }
    
    await logEvent('success', `Peer review ${reviewType} processed`);
  } catch (error) {
    await handleError(context, error, 'peer review command');
  }
}

/**
 * Handle research proposal command
 */
async function handleResearchProposalCommand(context, command) {
  try {
    const proposalData = {
      title: command.params.title,
      researcher: command.params.researcher || command.sender,
      timeline: command.params.timeline,
      status: command.params.status || 'Draft',
      objective: command.params.objective,
      methodology: command.params.methodology,
      outcomes: command.params.outcomes,
      resources: command.params.resources,
      related_work: command.params.related_work
    };
    
    const proposalMessage = CollaborationTools.formatResearchProposal(proposalData);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'research_proposal' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: proposalMessage
      });
    }
    
    await logEvent('success', `Research proposal shared: ${proposalData.title}`);
  } catch (error) {
    await handleError(context, error, 'research proposal command');
  }
}

/**
 * Handle share logs command
 */
async function handleShareLogsCommand(context, command) {
  try {
    const logsMessage = `
📋 **Logs Shared**

**Experiment:** ${command.params.experiment || 'Not specified'}
**Log Type:** ${command.params.type || 'General'}
**Timestamp:** ${new Date().toISOString()}

**Log Content:**
\`\`\`
${command.params.content || 'No log content provided'}
\`\`\`

${command.params.url ? `**Log File URL:** ${command.params.url}` : ''}
${command.params.size ? `**File Size:** ${command.params.size}` : ''}
${command.params.format ? `**Format:** ${command.params.format}` : ''}

**Notes:**
${command.params.notes || 'No additional notes'}

---
*Logs shared via RepoRelay from ${context.payload.repository.full_name}*
`;

    if (command.target) {
      await relayMessage(context, { ...command, type: 'share_logs' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: logsMessage
      });
    }
    
    await logEvent('success', `Logs shared`);
  } catch (error) {
    await handleError(context, error, 'share logs command');
  }
}

/**
 * Handle TensorBoard link command
 */
async function handleTensorBoardLinkCommand(context, command) {
  try {
    const url = command.params.url;
    const description = command.params.description || 'TensorBoard visualization';
    
    if (!url) {
      throw new Error('TensorBoard URL is required');
    }
    
    const tensorboardMessage = ResearchToolIntegrations.formatTensorBoardLink(url, description);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'tensorboard_link' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: tensorboardMessage + '\n---\n*Shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `TensorBoard link shared: ${url}`);
  } catch (error) {
    await handleError(context, error, 'tensorboard link command');
  }
}

/**
 * Handle Weights & Biases link command
 */
async function handleWandBLinkCommand(context, command) {
  try {
    const url = command.params.url;
    const runName = command.params.run_name || command.params.run;
    const project = command.params.project;
    
    if (!url) {
      throw new Error('Weights & Biases URL is required');
    }
    
    const wandbMessage = ResearchToolIntegrations.formatWandBLink(url, runName, project);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'wandb_link' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: wandbMessage + '\n---\n*Shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `Weights & Biases link shared: ${url}`);
  } catch (error) {
    await handleError(context, error, 'wandb link command');
  }
}

/**
 * Handle MLflow link command
 */
async function handleMLflowLinkCommand(context, command) {
  try {
    const url = command.params.url;
    const runId = command.params.run_id;
    const experiment = command.params.experiment;
    
    if (!url) {
      throw new Error('MLflow URL is required');
    }
    
    const mlflowMessage = ResearchToolIntegrations.formatMLflowLink(url, runId, experiment);
    
    if (command.target) {
      await relayMessage(context, { ...command, type: 'mlflow_link' }, command.target);
    } else {
      await context.octokit.issues.createComment({
        owner: context.payload.repository.owner.login,
        repo: context.payload.repository.name,
        issue_number: context.payload.issue?.number || context.payload.number,
        body: mlflowMessage + '\n---\n*Shared via RepoRelay*'
      });
    }
    
    await logEvent('success', `MLflow link shared: ${url}`);
  } catch (error) {
    await handleError(context, error, 'mlflow link command');
  }
}

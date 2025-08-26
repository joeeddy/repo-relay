/**
 * Research-specific tools and integrations for AGI researchers
 * Provides functionality for experiment tracking, paper citations, model sharing, etc.
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * ArXiv API integration for paper search and citation
 */
class ArXivIntegration {
  static async searchPapers(query, maxResults = 10) {
    try {
      const encodedQuery = encodeURIComponent(query);
      const url = `http://export.arxiv.org/api/query?search_query=${encodedQuery}&start=0&max_results=${maxResults}`;
      
      const response = await axios.get(url);
      const papers = this.parseArXivResponse(response.data);
      return papers;
    } catch (error) {
      console.error('ArXiv search error:', error);
      return [];
    }
  }
  
  static async getPaperByArXivId(arxivId) {
    try {
      const url = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
      const response = await axios.get(url);
      const papers = this.parseArXivResponse(response.data);
      return papers[0] || null;
    } catch (error) {
      console.error('ArXiv fetch error:', error);
      return null;
    }
  }
  
  static parseArXivResponse(xmlData) {
    // Simple XML parsing for ArXiv response
    const papers = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xmlData)) !== null) {
      const entry = match[1];
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const authorMatch = entry.match(/<author><name>(.*?)<\/name><\/author>/);
      const summaryMatch = entry.match(/<summary>(.*?)<\/summary>/);
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      
      if (titleMatch && idMatch) {
        const arxivId = idMatch[1].split('/').pop();
        papers.push({
          title: titleMatch[1].trim(),
          authors: authorMatch ? [authorMatch[1]] : [],
          summary: summaryMatch ? summaryMatch[1].trim() : '',
          arxivId: arxivId,
          url: `https://arxiv.org/abs/${arxivId}`,
          published: publishedMatch ? publishedMatch[1] : ''
        });
      }
    }
    
    return papers;
  }
}

/**
 * Experiment tracking and management
 */
class ExperimentTracker {
  constructor() {
    this.experimentsFile = process.env.EXPERIMENTS_FILE || 'experiments.json';
  }
  
  async loadExperiments() {
    try {
      const data = await fs.readFile(this.experimentsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }
  
  async saveExperiments(experiments) {
    await fs.writeFile(this.experimentsFile, JSON.stringify(experiments, null, 2));
  }
  
  async trackExperiment(experimentData) {
    const experiments = await this.loadExperiments();
    const experimentId = experimentData.id || `exp_${Date.now()}`;
    
    experiments[experimentId] = {
      ...experimentData,
      id: experimentId,
      timestamp: Date.now(),
      status: experimentData.status || 'running'
    };
    
    await this.saveExperiments(experiments);
    return experimentId;
  }
  
  async getExperiment(experimentId) {
    const experiments = await this.loadExperiments();
    return experiments[experimentId] || null;
  }
  
  async listExperiments(filters = {}) {
    const experiments = await this.loadExperiments();
    let filteredExperiments = Object.values(experiments);
    
    if (filters.status) {
      filteredExperiments = filteredExperiments.filter(exp => exp.status === filters.status);
    }
    
    if (filters.repo) {
      filteredExperiments = filteredExperiments.filter(exp => exp.repo === filters.repo);
    }
    
    return filteredExperiments.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  async updateExperimentStatus(experimentId, status, results = {}) {
    const experiments = await this.loadExperiments();
    if (experiments[experimentId]) {
      experiments[experimentId].status = status;
      experiments[experimentId].results = { ...experiments[experimentId].results, ...results };
      experiments[experimentId].lastUpdated = Date.now();
      await this.saveExperiments(experiments);
      return true;
    }
    return false;
  }
}

/**
 * Model and dataset management
 */
class ModelDatasetManager {
  static formatModelInfo(modelData) {
    return `
📊 **Model Information**

**Name:** ${modelData.name}
**Type:** ${modelData.type || 'Not specified'}
**Architecture:** ${modelData.architecture || 'Not specified'}
**Parameters:** ${modelData.parameters || 'Not specified'}
**Performance:** ${modelData.performance ? JSON.stringify(modelData.performance, null, 2) : 'Not specified'}
**Repository:** ${modelData.repo || 'Not specified'}
**Version:** ${modelData.version || 'Not specified'}
**Training Data:** ${modelData.training_data || 'Not specified'}

${modelData.description ? `**Description:** ${modelData.description}` : ''}
${modelData.url ? `**URL:** ${modelData.url}` : ''}
${modelData.paper ? `**Paper:** ${modelData.paper}` : ''}
`;
  }
  
  static formatDatasetInfo(datasetData) {
    return `
📂 **Dataset Information**

**Name:** ${datasetData.name}
**Type:** ${datasetData.type || 'Not specified'}
**Size:** ${datasetData.size || 'Not specified'}
**Format:** ${datasetData.format || 'Not specified'}
**Domain:** ${datasetData.domain || 'Not specified'}
**License:** ${datasetData.license || 'Not specified'}
**Repository:** ${datasetData.repo || 'Not specified'}
**Version:** ${datasetData.version || 'Not specified'}

${datasetData.description ? `**Description:** ${datasetData.description}` : ''}
${datasetData.url ? `**URL:** ${datasetData.url}` : ''}
${datasetData.paper ? `**Paper:** ${datasetData.paper}` : ''}
${datasetData.preprocessing ? `**Preprocessing:** ${datasetData.preprocessing}` : ''}
`;
  }
}

/**
 * Research tool integrations (TensorBoard, Weights & Biases, MLflow)
 */
class ResearchToolIntegrations {
  static formatTensorBoardLink(url, description = '') {
    return `
🔬 **TensorBoard Visualization**

**URL:** [Open TensorBoard](${url})
**Description:** ${description}

Click the link above to view experiment metrics, model graphs, and training progress.
`;
  }
  
  static formatWandBLink(url, runName = '', project = '') {
    return `
📈 **Weights & Biases Run**

**URL:** [View on Weights & Biases](${url})
${runName ? `**Run Name:** ${runName}` : ''}
${project ? `**Project:** ${project}` : ''}

Track real-time metrics, hyperparameters, and experiment results.
`;
  }
  
  static formatMLflowLink(url, runId = '', experiment = '') {
    return `
🔄 **MLflow Experiment**

**URL:** [View MLflow Run](${url})
${runId ? `**Run ID:** ${runId}` : ''}
${experiment ? `**Experiment:** ${experiment}` : ''}

View model metadata, parameters, metrics, and artifacts.
`;
  }
}

/**
 * Peer review and collaboration tools
 */
class CollaborationTools {
  static formatPeerReviewRequest(reviewData) {
    return `
👥 **Peer Review Request**

**Type:** ${reviewData.type || 'General Review'}
**Reviewer:** ${reviewData.reviewer ? `@${reviewData.reviewer}` : 'Open for assignment'}
**Deadline:** ${reviewData.deadline || 'Not specified'}
**Priority:** ${reviewData.priority || 'Normal'}

**Review Scope:**
${reviewData.scope || 'Please specify what needs to be reviewed'}

**Additional Notes:**
${reviewData.notes || 'None'}

**Files/Sections to Review:**
${reviewData.files ? reviewData.files.map(f => `- ${f}`).join('\n') : 'Not specified'}

---
To accept this review, comment: \`!peer_review type:accept reviewer:your-username\`
To complete a review, comment: \`!peer_review type:complete\`
`;
  }
  
  static formatResearchProposal(proposalData) {
    return `
📋 **Research Proposal**

**Title:** ${proposalData.title}
**Researcher:** @${proposalData.researcher}
**Timeline:** ${proposalData.timeline || 'Not specified'}
**Status:** ${proposalData.status || 'Draft'}

**Objective:**
${proposalData.objective || 'Not specified'}

**Methodology:**
${proposalData.methodology || 'Not specified'}

**Expected Outcomes:**
${proposalData.outcomes || 'Not specified'}

**Resources Required:**
${proposalData.resources || 'Not specified'}

**Related Work:**
${proposalData.related_work || 'Not specified'}

---
To comment on this proposal, use standard issue comments.
To approve/reject: \`!research_proposal action:approve/reject reviewer:your-username\`
`;
  }
}

module.exports = {
  ArXivIntegration,
  ExperimentTracker,
  ModelDatasetManager,
  ResearchToolIntegrations,
  CollaborationTools
};
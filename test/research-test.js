#!/usr/bin/env node
/**
 * Simple test for research features
 */

const { parseCommand, validateCommand } = require('../commandParser');
const { ArXivIntegration, ExperimentTracker, ModelDatasetManager } = require('../researchTools');

async function testResearchFeatures() {
  console.log('🧪 Testing RepoRelay Research Features...\n');
  
  // Test command parsing for research commands
  console.log('1. Testing research command parsing...');
  
  const testPayloads = [
    {
      issue: { body: '!share_experiment name:"Test Experiment" type:training status:running', user: { login: 'researcher' } }
    },
    {
      issue: { body: '!cite_paper arxiv_id:1706.03762 relevance:"Attention mechanism"', user: { login: 'researcher' } }
    },
    {
      issue: { body: '!search_papers query:"machine learning" limit:3', user: { login: 'researcher' } }
    },
    {
      issue: { body: '!peer_review type:request reviewer:colleague', user: { login: 'researcher' } }
    }
  ];
  
  for (const payload of testPayloads) {
    console.log(`Testing: ${payload.issue.body}`);
    const command = parseCommand(payload);
    if (command) {
      console.log(`Parsed command:`, command);
      const validation = validateCommand(command);
      console.log(`✅ ${command.type}: ${validation.valid ? 'Valid' : 'Invalid - ' + validation.error}`);
    } else {
      console.log(`❌ Failed to parse command from payload`);
    }
    console.log('---');
  }
  
  // Test ArXiv integration
  console.log('\n2. Testing ArXiv integration...');
  try {
    const papers = await ArXivIntegration.searchPapers('attention transformer', 2);
    console.log(`✅ ArXiv search returned ${papers.length} papers`);
    if (papers.length > 0) {
      console.log(`   First paper: "${papers[0].title.substring(0, 50)}..."`);
    }
  } catch (error) {
    console.log(`❌ ArXiv integration error: ${error.message}`);
  }
  
  // Test experiment tracker
  console.log('\n3. Testing experiment tracker...');
  try {
    const tracker = new ExperimentTracker();
    const experimentId = await tracker.trackExperiment({
      name: 'Test Experiment',
      description: 'Testing experiment tracking',
      type: 'test',
      status: 'running'
    });
    console.log(`✅ Experiment tracked with ID: ${experimentId}`);
    
    const experiment = await tracker.getExperiment(experimentId);
    console.log(`✅ Retrieved experiment: ${experiment.name}`);
    
    const experiments = await tracker.listExperiments();
    console.log(`✅ Listed ${experiments.length} experiments`);
  } catch (error) {
    console.log(`❌ Experiment tracker error: ${error.message}`);
  }
  
  // Test model/dataset formatting
  console.log('\n4. Testing model/dataset formatting...');
  const modelInfo = {
    name: 'Test Model',
    type: 'transformer',
    architecture: 'GPT-2',
    parameters: '1.5B',
    performance: { accuracy: 0.95, perplexity: 12.3 }
  };
  
  const formattedModel = ModelDatasetManager.formatModelInfo(modelInfo);
  console.log(`✅ Model info formatted (${formattedModel.length} characters)`);
  
  const datasetInfo = {
    name: 'Test Dataset',
    type: 'text',
    size: '1GB',
    format: 'jsonl'
  };
  
  const formattedDataset = ModelDatasetManager.formatDatasetInfo(datasetInfo);
  console.log(`✅ Dataset info formatted (${formattedDataset.length} characters)`);
  
  console.log('\n🎉 All research feature tests completed!');
}

// Run tests if called directly
if (require.main === module) {
  testResearchFeatures().catch(console.error);
}

module.exports = { testResearchFeatures };
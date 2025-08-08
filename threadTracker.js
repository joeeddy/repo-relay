const fs = require('fs').promises;
const path = require('path');

const THREAD_LINKS_FILE = process.env.THREAD_LINKS_FILE || 'threadLinks.json';

// In-memory cache for performance
let threadMap = new Map();
let isLoaded = false;

/**
 * Load thread links from persistent storage
 */
async function loadThreadLinks() {
  if (isLoaded) return;
  
  try {
    const filePath = path.resolve(THREAD_LINKS_FILE);
    const data = await fs.readFile(filePath, 'utf8');
    const links = JSON.parse(data);
    
    // Convert object back to Map
    threadMap = new Map(Object.entries(links));
    console.log(`Loaded ${threadMap.size} thread links from ${THREAD_LINKS_FILE}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Error loading thread links:', error);
    }
    // File doesn't exist yet, start with empty map
    threadMap = new Map();
  }
  
  isLoaded = true;
}

/**
 * Save thread links to persistent storage
 */
async function saveThreadLinks() {
  try {
    const filePath = path.resolve(THREAD_LINKS_FILE);
    // Convert Map to plain object for JSON storage
    const links = Object.fromEntries(threadMap);
    await fs.writeFile(filePath, JSON.stringify(links, null, 2));
  } catch (error) {
    console.error('Error saving thread links:', error);
    throw error;
  }
}

/**
 * Stores thread links between origin and target issues/comments
 */
async function linkThread(originRepo, originIssue, targetRepo, targetIssue, metadata = {}) {
  await loadThreadLinks();
  
  const key = `${originRepo}#${originIssue}`;
  const linkData = {
    target: `${targetRepo}#${targetIssue}`,
    timestamp: Date.now(),
    ...metadata
  };
  
  threadMap.set(key, linkData);
  await saveThreadLinks();
  
  console.log(`Linked thread: ${key} -> ${linkData.target}`);
  return linkData;
}

async function getLinkedThread(originRepo, originIssue) {
  await loadThreadLinks();
  const key = `${originRepo}#${originIssue}`;
  return threadMap.get(key);
}

/**
 * Get all thread links for dashboard
 */
async function getAllThreadLinks() {
  await loadThreadLinks();
  return Array.from(threadMap.entries()).map(([key, value]) => ({
    key,
    ...value
  }));
}

/**
 * Remove a thread link
 */
async function unlinkThread(originRepo, originIssue) {
  await loadThreadLinks();
  const key = `${originRepo}#${originIssue}`;
  const existed = threadMap.delete(key);
  
  if (existed) {
    await saveThreadLinks();
    console.log(`Unlinked thread: ${key}`);
  }
  
  return existed;
}

/**
 * Clean up old thread links (older than specified days)
 */
async function cleanupOldLinks(maxAgeInDays = 30) {
  await loadThreadLinks();
  const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
  let removed = 0;
  
  for (const [key, value] of threadMap.entries()) {
    if (value.timestamp < cutoffTime) {
      threadMap.delete(key);
      removed++;
    }
  }
  
  if (removed > 0) {
    await saveThreadLinks();
    console.log(`Cleaned up ${removed} old thread links`);
  }
  
  return removed;
}

module.exports = { 
  linkThread, 
  getLinkedThread, 
  getAllThreadLinks, 
  unlinkThread, 
  cleanupOldLinks,
  threadMap // Export for dashboard compatibility
};

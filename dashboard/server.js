// dashboard/server.js
const express = require("express");
const path = require("path");
const { getAllThreadLinks } = require("../threadTracker");
const { getEventLog } = require("../notifier");
const { getRelayHistory } = require("../spamPrevention");

const app = express();
const PORT = process.env.DASHBOARD_PORT || 3001;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Main dashboard page
app.get("/", (req, res) => {
  res.send(generateDashboardHTML());
});

// API endpoints
app.get("/api/threads", async (req, res) => {
  try {
    const threads = await getAllThreadLinks();
    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/events", (req, res) => {
  try {
    const { type, repo, limit } = req.query;
    const events = getEventLog({ type, repo, limit });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/relay-history", (req, res) => {
  try {
    const { limit } = req.query;
    const history = getRelayHistory(parseInt(limit) || 100);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const threads = await getAllThreadLinks();
    const events = getEventLog();
    const relayHistory = getRelayHistory();
    
    const stats = {
      totalThreads: threads.length,
      totalEvents: events.length,
      totalRelays: relayHistory.length,
      eventsByType: {},
      threadsByAge: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        older: 0
      }
    };
    
    // Count events by type
    events.forEach(event => {
      stats.eventsByType[event.type] = (stats.eventsByType[event.type] || 0) + 1;
    });
    
    // Count threads by age
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;
    
    threads.forEach(thread => {
      const age = now - thread.timestamp;
      if (age < day) stats.threadsByAge.today++;
      else if (age < week) stats.threadsByAge.thisWeek++;
      else if (age < month) stats.threadsByAge.thisMonth++;
      else stats.threadsByAge.older++;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function generateDashboardHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${process.env.DASHBOARD_TITLE || 'RepoRelay Dashboard'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f6f8fa;
            color: #24292e;
            line-height: 1.5;
        }
        
        .header {
            background: #24292e;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .header .subtitle {
            opacity: 0.8;
            font-size: 0.875rem;
            margin-top: 0.25rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e1e4e8;
        }
        
        .stat-card h3 {
            font-size: 0.875rem;
            color: #586069;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        
        .stat-card .value {
            font-size: 2rem;
            font-weight: 600;
            color: #0366d6;
        }
        
        .controls {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e1e4e8;
            margin-bottom: 2rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            align-items: center;
        }
        
        .control-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .control-group label {
            font-size: 0.75rem;
            color: #586069;
            font-weight: 600;
        }
        
        .control-group input, .control-group select {
            padding: 0.5rem;
            border: 1px solid #d0d7de;
            border-radius: 4px;
            font-size: 0.875rem;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            background: #0366d6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.875rem;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #0256cc;
        }
        
        .btn-secondary {
            background: #6c757d;
        }
        
        .btn-secondary:hover {
            background: #5a6268;
        }
        
        .section {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e1e4e8;
            margin-bottom: 2rem;
        }
        
        .section-header {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e1e4e8;
            font-weight: 600;
            background: #f6f8fa;
            border-radius: 8px 8px 0 0;
        }
        
        .section-content {
            padding: 1.5rem;
        }
        
        .thread-item {
            padding: 1rem;
            border: 1px solid #e1e4e8;
            border-radius: 4px;
            margin-bottom: 1rem;
            background: #f8f9fa;
        }
        
        .thread-item:last-child {
            margin-bottom: 0;
        }
        
        .thread-link {
            font-weight: 600;
            color: #0366d6;
            text-decoration: none;
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .thread-meta {
            font-size: 0.75rem;
            color: #586069;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .event-item {
            padding: 0.75rem;
            border-left: 3px solid #e1e4e8;
            margin-bottom: 0.5rem;
        }
        
        .event-item.success {
            border-left-color: #28a745;
        }
        
        .event-item.error {
            border-left-color: #dc3545;
        }
        
        .event-item.info {
            border-left-color: #0366d6;
        }
        
        .event-time {
            font-size: 0.75rem;
            color: #586069;
        }
        
        .loading {
            text-align: center;
            padding: 2rem;
            color: #586069;
        }
        
        .empty {
            text-align: center;
            padding: 2rem;
            color: #586069;
            background: #f8f9fa;
            border-radius: 4px;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .controls {
                flex-direction: column;
                align-items: stretch;
            }
            
            .control-group {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧵 RepoRelay Dashboard</h1>
        <div class="subtitle">Monitor cross-repository thread links and relay events</div>
    </div>
    
    <div class="container">
        <!-- Stats -->
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Active Threads</h3>
                <div class="value" id="total-threads">-</div>
            </div>
            <div class="stat-card">
                <h3>Total Events</h3>
                <div class="value" id="total-events">-</div>
            </div>
            <div class="stat-card">
                <h3>Relays Today</h3>
                <div class="value" id="relays-today">-</div>
            </div>
            <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="value" id="success-rate">-</div>
            </div>
        </div>
        
        <!-- Controls -->
        <div class="controls">
            <div class="control-group">
                <label>Filter by Type</label>
                <select id="event-type-filter">
                    <option value="">All Events</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                    <option value="info">Info</option>
                </select>
            </div>
            <div class="control-group">
                <label>Filter by Repository</label>
                <input type="text" id="repo-filter" placeholder="e.g., joeeddy/repo-relay">
            </div>
            <div class="control-group">
                <label>Limit</label>
                <select id="limit-filter">
                    <option value="50">50</option>
                    <option value="100" selected>100</option>
                    <option value="200">200</option>
                </select>
            </div>
            <button class="btn" onclick="refreshData()">🔄 Refresh</button>
            <button class="btn btn-secondary" onclick="exportData()">📁 Export</button>
        </div>
        
        <!-- Thread Links -->
        <div class="section">
            <div class="section-header">📡 Active Thread Links</div>
            <div class="section-content" id="threads-content">
                <div class="loading">Loading thread links...</div>
            </div>
        </div>
        
        <!-- Event Log -->
        <div class="section">
            <div class="section-header">📋 Event Log</div>
            <div class="section-content" id="events-content">
                <div class="loading">Loading events...</div>
            </div>
        </div>
    </div>
    
    <script>
        let currentData = {
            threads: [],
            events: [],
            stats: {}
        };
        
        async function fetchData() {
            try {
                const [threads, events, stats] = await Promise.all([
                    fetch('/api/threads').then(r => r.json()),
                    fetch('/api/events?' + new URLSearchParams({
                        type: document.getElementById('event-type-filter').value,
                        repo: document.getElementById('repo-filter').value,
                        limit: document.getElementById('limit-filter').value
                    })).then(r => r.json()),
                    fetch('/api/stats').then(r => r.json())
                ]);
                
                currentData = { threads, events, stats };
                updateDisplay();
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
        
        function updateDisplay() {
            updateStats();
            updateThreads();
            updateEvents();
        }
        
        function updateStats() {
            const { stats } = currentData;
            
            document.getElementById('total-threads').textContent = stats.totalThreads || 0;
            document.getElementById('total-events').textContent = stats.totalEvents || 0;
            document.getElementById('relays-today').textContent = stats.threadsByAge?.today || 0;
            
            const successCount = stats.eventsByType?.success || 0;
            const errorCount = stats.eventsByType?.error || 0;
            const successRate = successCount + errorCount > 0 
                ? Math.round((successCount / (successCount + errorCount)) * 100) 
                : 100;
            document.getElementById('success-rate').textContent = successRate + '%';
        }
        
        function updateThreads() {
            const { threads } = currentData;
            const container = document.getElementById('threads-content');
            
            if (threads.length === 0) {
                container.innerHTML = '<div class="empty">No active thread links found.</div>';
                return;
            }
            
            const html = threads.map(thread => {
                const age = Math.floor((Date.now() - thread.timestamp) / (1000 * 60 * 60 * 24));
                const [originRepo, originIssue] = thread.key.split('#');
                const [targetRepo, targetIssue] = thread.target.split('#');
                
                return '<div class="thread-item">' +
                    '<a href="https://github.com/' + originRepo + '/issues/' + originIssue + '" class="thread-link" target="_blank">' +
                        thread.key + ' → ' + thread.target +
                    '</a>' +
                    '<div class="thread-meta">' +
                        '<span>Age: ' + age + ' days</span>' +
                        '<span>Created: ' + new Date(thread.timestamp).toLocaleDateString() + '</span>' +
                        (thread.sender ? '<span>By: @' + thread.sender + '</span>' : '') +
                    '</div>' +
                '</div>';
            }).join('');
            
            container.innerHTML = html;
        }
        
        function updateEvents() {
            const { events } = currentData;
            const container = document.getElementById('events-content');
            
            if (events.length === 0) {
                container.innerHTML = '<div class="empty">No events found with current filters.</div>';
                return;
            }
            
            const html = events.map(event => 
                '<div class="event-item ' + event.type + '">' +
                    '<div>' + event.message + '</div>' +
                    '<div class="event-time">' + new Date(event.timestamp).toLocaleString() + '</div>' +
                '</div>'
            ).join('');
            
            container.innerHTML = html;
        }
        
        function refreshData() {
            fetchData();
        }
        
        function exportData() {
            const dataStr = JSON.stringify(currentData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'reporelay-data-' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
        }
        
        // Auto-refresh every 30 seconds
        setInterval(fetchData, 30000);
        
        // Event listeners for filters
        document.getElementById('event-type-filter').addEventListener('change', fetchData);
        document.getElementById('repo-filter').addEventListener('input', 
            debounce(() => fetchData(), 500)
        );
        document.getElementById('limit-filter').addEventListener('change', fetchData);
        
        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
        
        // Initial load
        fetchData();
    </script>
</body>
</html>
  `;
}

app.listen(PORT, () => {
  console.log(`📊 RepoRelay Dashboard running on http://localhost:${PORT}`);
});

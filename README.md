# 🧵 GitHub Thread Relay & Research Collaboration Platform

[![GitHub Sponsors](https://img.shields.io/github/sponsors/joeeddy?label=Sponsor%20me%20on%20GitHub&style=social)](https://github.com/sponsors/joeeddy)

This app enables seamless cross-repository communication by linking GitHub issues and comments between threads. **Now enhanced with powerful features specifically designed for AGI researchers and research teams.** It provides advanced features including persistent thread tracking, spam prevention, comprehensive error handling, an interactive dashboard, and comprehensive research workflow support.
## 🤝 Seeking AGI Collaborators & Co-Developers

I am developing repo-relay as a **solo developer** and am actively looking for collaborators, contributors, or research partners interested in AGI, agentic AI, and distributed research tooling.

If you work on AGI, multi-agent systems, or advanced AI research—and want to help shape and use open-source infrastructure for cross-repo collaboration—please reach out or open an issue/discussion.  Hippocrates-Edu@proton.me

## Example: Fractal Emergent AI Agent

Looking for a practical implementation?  
Check out [**teacher1**](https://github.com/joeeddy/teacher1) — a compressed demonstration of a fractal, emergent AI architecture designed for research and multi-agent integration using repo-relay.

## 🧠 **NEW: Research Features for AGI Teams**

### 🚀 Research-Specific Commands
- **🧪 Experiment Management**: Track, share, and analyze experiments across repositories
- **📊 Results Sharing**: Share research findings with structured metrics and visualizations  
- **📄 Literature Integration**: Cite papers, search ArXiv, and manage research citations
- **🤝 Peer Review Workflows**: Structured peer review and research proposal systems
- **🔗 Tool Integrations**: Direct integration with TensorBoard, Weights & Biases, MLflow
- **📂 Data & Model Sharing**: Structured sharing of datasets and trained models

### 🎯 Quick Research Examples
```bash
# Share your latest experiment with another research team
!share_experiment name:"GPT Fine-tuning" target:research-team/experiments-repo

# Cite a foundational paper
!cite_paper arxiv_id:1706.03762 relevance:"Attention mechanism basis for our approach"

# Share experimental results with metrics
!share_results findings:"95% accuracy achieved" metrics:'{"accuracy":0.95,"f1":0.94}'

# Request peer review from a colleague
!peer_review type:request reviewer:colleague scope:"Model architecture review"
```

📚 **[Complete Research Guide →](RESEARCH_GUIDE.md)**

## 🚀 Features

### Core Functionality
- 🔗 **Thread Linking**: Connect issues or comments across repositories with persistent storage
- 🔁 **Bi-Directional Relay**: Automatically mirror comments between linked threads
- 🛡️ **Spam Prevention**: Unique message signatures and relay history prevent loops and duplicates
- 👤 **User Permissions**: Restrict commands to authorized users only (configurable)

### Enhanced Command System
- 📝 **Rich Command Parsing**: Support multiple command formats with structured parameters
- ✅ **Command Validation**: Real-time validation with helpful error messages
- 🎯 **Flexible Targeting**: Smart routing based on labels, keywords, or explicit targets

### Error Handling & Notifications
- 🚨 **Comprehensive Error Handling**: Errors posted as GitHub comments and sent to Slack
- 📊 **Event Logging**: Complete audit trail of all relay operations
- 🔔 **Slack Integration**: Real-time notifications for errors and important events

### Interactive Dashboard
- 📈 **Real-time Monitoring**: Live view of active thread links and statistics
- 🔍 **Advanced Filtering**: Search and filter by repository, event type, and date ranges
- 📱 **Responsive Design**: Mobile-friendly interface with auto-refresh
- 📁 **Data Export**: Export thread and event data for analysis

### Data Persistence
- 💾 **JSON Storage**: Thread links survive bot restarts with `threadLinks.json`
- 🧹 **Automatic Cleanup**: Configurable cleanup of old links and relay history
- ⚡ **Performance Optimized**: In-memory caching with persistent backup

---

## 🛠️ Setup

### 1. Clone the Repository

```bash
git clone https://github.com/joeeddy/repo-relay.git
cd repo-relay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration. **Important**: For local testing, you can comment out `PRIVATE_KEY_PATH` if you don't have a GitHub App private key:

```env
# GitHub App Configuration (required for production)
GITHUB_TOKEN=your_github_personal_access_token_here
WEBHOOK_SECRET=your_webhook_secret_here
APP_ID=your_github_app_id_here
# PRIVATE_KEY_PATH=path_to_private_key.pem  # Comment out for local testing

# Server Configuration
PORT=3000
DASHBOARD_PORT=3001
NODE_ENV=development

# Notification Configuration
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK

# Bot Configuration
ALLOWED_USERS=your-username
REPO_RELAY_TOKEN=your_shared_token_here
THREAD_LINKS_FILE=threadLinks.json
MAX_RELAY_HISTORY=1000
ENABLE_SPAM_PROTECTION=true

# Dashboard Configuration
DASHBOARD_ENABLED=true
DASHBOARD_TITLE="Repo-Relay Dashboard"
```

### 4. Configure Repository Settings

Create `.dispatcherbot.yml` in your repository:

```yaml
enabled: true
role: commander
targets:
  - your-org/your-repo-target
  - your-org/your-analytics-repo
events:
  - issues
  - issue_comment
commands:
  - deploy_strategy
  - report_status
  - link
  - unlink
```

### 5. Start the Application

```bash
# Start the main relay bot
npm start

# Start the dashboard (in separate terminal)
npm run dashboard
```

---

## 📋 Commands

### Basic Commands

#### Link Threads
```bash
# Link current issue to another repository
!link target:owner/repo

# Example
!link target:your-org/your-target-repo
```

#### Thread Management
```bash
# Check current thread status
!status

# Remove thread links
!unlink

# Clean up old links (admin only)
!cleanup
```

#### Get Help
```bash
# Display available commands
!help
```

### Advanced Commands

#### Deploy Strategy
```bash
# Deploy a specific trading strategy (manual command)
!deploy_strategy strategy:arbitrage target:your-org/your-trading-repo

# Bot/automated command with token
!deploy_strategy strategy:arbitrage target:your-org/your-trading-repo token:your_token

# With additional parameters
!deploy_strategy strategy:market_making target:your-org/your-target-repo pair:BTC-USDT token:your_token
```

#### Report Status
```bash
# Request status report from target repositories (manual)
!report_status target:your-org/your-analytics-repo

# Bot command with token
!report_status target:your-org/your-analytics-repo token:your_token
```

### Command Formats

The bot supports multiple command formats:

#### Format 1: Exclamation Commands
```bash
!command target:owner/repo param1:value1 param2:value2
```

#### Format 2: Traditional Format
```
command: type
target: owner/repo
param1: value1
token: your_token
```

#### Format 3: Slash Commands
```bash
/command target owner/repo param1 value1 token your_token
```

---

## 🎛️ Dashboard

Access the interactive dashboard at `http://localhost:3001` (or your configured `DASHBOARD_PORT`).

### Features
- **Real-time Statistics**: Active threads, event counts, success rates
- **Thread Monitoring**: View all linked threads with age and participant information
- **Event Log**: Comprehensive log with filtering by type, repository, and date
- **Search & Filter**: Advanced filtering capabilities for both threads and events
- **Auto-refresh**: Live updates every 30 seconds
- **Data Export**: Export data as JSON for external analysis

### Dashboard Sections

1. **Statistics Overview**: Key metrics and performance indicators
2. **Active Thread Links**: All current repository connections
3. **Event Log**: Detailed history of all relay operations
4. **Controls**: Filtering, search, and refresh options

---

## 🚀 Minimal Setup for Multi-Environment Communication

This section provides a streamlined setup process for enabling repo-relay communication between two environments, such as Hippocrates-2.1 and Hippocrates-1.0.

### Prerequisites

#### 1. Install Node.js
Ensure Node.js (version 14 or higher) is installed on your system:
```bash
# Check if Node.js is installed
node --version

# If not installed, download from https://nodejs.org/ or use a package manager:
# On Ubuntu/Debian:
sudo apt update && sudo apt install nodejs npm

# On macOS with Homebrew:
brew install node

# On Windows, download from https://nodejs.org/
```

#### 2. Install repo-relay
Clone and install the repo-relay package locally:
```bash
# Clone the repository
git clone https://github.com/joeeddy/repo-relay.git
cd repo-relay

# Install dependencies
npm install

# Install globally for command-line access (optional)
npm link
```

After installation, the `repo-relay` command will be available globally.

#### 3. Set Up Git Authentication
Ensure Git is configured with proper authentication for accessing your repositories:

```bash
# Configure Git with your credentials
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Set up authentication (choose one method):

# Option A: Personal Access Token (recommended)
# Create a Personal Access Token at: https://github.com/settings/tokens
# Then configure Git to use it:
git config --global credential.helper store
# On next git operation, enter your username and the token as password

# Option B: SSH Keys (alternative)
# Generate SSH key pair:
ssh-keygen -t ed25519 -C "your.email@example.com"
# Add public key to GitHub: https://github.com/settings/ssh/new
```

### Configuration

#### 4. Create Configuration File
Create a `repo-relay.config.json` file in your project directory. Use the sample configuration provided in this repository as a starting point:

```bash
# Copy the sample configuration
cp repo-relay.config.json.sample repo-relay.config.json

# Edit the configuration file with your environment details
nano repo-relay.config.json  # or use your preferred editor
```

**Key Configuration Areas to Update:**
- Replace `"your-org"` with your actual GitHub organization/username
- Update repository names from `"hippocrates-2.1"` and `"hippocrates-1.0"` to your actual repo names
- Set your webhook URLs and secrets
- Configure GitHub tokens and app credentials
- Adjust allowed users and commands as needed

#### 5. Configure Environment Variables
Set up the required environment variables:

```bash
# Create environment file
touch .env

# Add required variables (replace with your actual values):
echo "GITHUB_TOKEN=your_github_personal_access_token_here" >> .env
echo "REPO_RELAY_TOKEN=your_shared_token_here" >> .env
echo "PORT=3000" >> .env
```

### Running repo-relay

#### 6. Start the Relay Service
Once configured, start the repo-relay service:

```bash
# Start the main relay service
repo-relay start

# Or if running from source:
npm start
```

The service will:
- Listen for GitHub webhook events
- Process cross-repository communication commands
- Maintain persistent thread links between environments
- Provide real-time relay of comments and updates

#### 7. Verify Setup
Test the connection between your environments:

1. Create an issue in your Hippocrates-2.1 repository
2. Use the `!link target:owner/hippocrates-1.0` command
3. Add a comment to verify bi-directional communication
4. Check the dashboard at `http://localhost:3001` for monitoring

### Troubleshooting

#### Common Issues

##### "Private key does not exist" Error
If you see an error about `PRIVATE_KEY_PATH` when starting the application:

1. **For local testing**: Comment out the `PRIVATE_KEY_PATH` line in your `.env` file:
   ```bash
   # PRIVATE_KEY_PATH=path_to_private_key.pem
   ```

2. **For production**: You need to create a GitHub App and provide the private key path. See [GitHub's documentation](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) for details.

##### Module Not Found Errors
Make sure you've run `npm install` to install all dependencies.

##### Permission Errors
- Verify your GitHub token has the necessary permissions (repo, issues, comments)
- Ensure your webhook URL is accessible and the secret matches your configuration
- Check that repository names in configuration files are correct

##### Dashboard Not Loading
- Verify `DASHBOARD_PORT` is not in use by another service
- Check that `DASHBOARD_ENABLED=true` in your `.env` file
- Try accessing directly: `http://localhost:3001`

- **Authentication Issues**: Verify your GitHub token has the necessary permissions (repo, issues, comments)
- **Webhook Issues**: Ensure your webhook URL is accessible and the secret matches your configuration
- **Configuration Errors**: Check the `repo-relay.config.json` syntax and validate all required fields
- **Network Issues**: Verify firewall settings allow incoming webhook requests
- **Private Key Issues**: For local testing, comment out `PRIVATE_KEY_PATH` in `.env`. For production, set up a GitHub App with proper private key.

For detailed configuration options and advanced features, see the full setup section below.

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub personal access token | Required |
| `WEBHOOK_SECRET` | GitHub webhook secret | Required |
| `AUTHORIZED_USER` | Primary authorized user for repository ownership validation | `your-username` |
| `ALLOWED_USERS` | Comma-separated list of users who can run commands | `your-username` |
| `REPO_RELAY_TOKEN` | Shared token for bot/automated command authentication | Required for bot commands |
| `SLACK_WEBHOOK` | Slack webhook URL for notifications | Optional |
| `THREAD_LINKS_FILE` | File to store persistent thread links | `threadLinks.json` |
| `MAX_RELAY_HISTORY` | Maximum relay history entries to keep | `1000` |
| `DASHBOARD_PORT` | Port for dashboard server | `3001` |
| `ENABLE_SPAM_PROTECTION` | Enable duplicate relay prevention | `true` |

### Repository Configuration

Each repository needs a `.dispatcherbot.yml` file:

```yaml
enabled: true              # Enable relay for this repo
role: commander           # Role: commander, relay, or monitor
targets:                  # Default target repositories
  - owner/repo1
  - owner/repo2
events:                   # GitHub events to listen for
  - issues
  - issue_comment
commands:                 # Allowed commands
  - deploy_strategy
  - report_status
  - link
  - unlink
```

---

## 🛡️ Security & Permissions

### Enhanced Authorization System
- **User Authorization**: Only the authorized user (configurable via `AUTHORIZED_USER` env var) can execute commands
- **Repository Restrictions**: Commands are only accepted from private repositories owned by the authorized user
- **Bot Command Security**: Bot/automated commands require a valid shared token
- **Token Validation**: All bot commands must include `token:your_token` parameter

### User Restrictions
- Only users listed in `ALLOWED_USERS` can execute manual commands
- Bot accounts require valid tokens for all commands
- Commands from public repositories are automatically blocked
- Commands from unauthorized repository owners are rejected

### Token-Based Authentication
The system uses a shared token (`REPO_RELAY_TOKEN`) for bot/automated commands:

```bash
# Manual command (no token required for authorized user)
!link target:your-org/your-target-repo

# Bot command (token required)
!deploy_strategy strategy:arbitrage target:your-org/your-trading-repo token:abc123

# Traditional format with token
command: deploy_strategy
target: your-org/your-trading-repo
strategy: arbitrage
token: abc123
```

### Error Handling & Security Responses
- **Unauthorized Users**: Clear rejection messages for non-authorized users
- **Public Repositories**: Commands from public repos are blocked with explanatory messages
- **Invalid Tokens**: Bot commands with missing/invalid tokens are rejected
- **Repository Access**: Dynamic verification of repository ownership and privacy status

### Spam Prevention
- Unique message signatures prevent duplicate relays
- Relay history tracking prevents infinite loops
- Automatic detection of bot-generated messages
- Configurable history size limits

### Error Handling
- Comprehensive error logging and reporting
- GitHub issue comments for user-facing errors
- Slack notifications for system administrators
- Graceful degradation when external services fail

---

## 🏗️ Architecture

### Core Components

```
├── index.js              # Main Probot application
├── threadTracker.js      # Persistent thread link management
├── commandParser.js      # Enhanced command parsing with validation
├── relayEngine.js        # Message relay with spam prevention
├── spamPrevention.js     # Anti-loop and duplicate detection
├── notifier.js           # Error handling and notifications
├── dashboard/            # Interactive web dashboard
│   └── server.js         # Dashboard server with API endpoints
└── configLoader.js       # Repository configuration loading
```

### Data Flow

1. **GitHub Event** → Webhook triggers Probot
2. **Command Parsing** → Extract and validate commands
3. **Permission Check** → Verify user authorization
4. **Spam Prevention** → Check for duplicates/loops
5. **Relay Creation** → Generate relay issue in target repo
6. **Thread Linking** → Store persistent connection
7. **Notification** → Send success/error notifications
8. **Dashboard Update** → Real-time data refresh

---

## 🧪 Development

### Running Tests
```bash
npm test
```

**Tests included**:
- CLI command validation tests
- Basic functionality verification

To test the full application functionality, start the service with `npm start` and test the webhook endpoints manually.

### Development Mode
```bash
# Auto-reload on changes
npm run dev
```

### Debugging
- Enable debug logging with `NODE_ENV=development`
- Check dashboard event log for detailed operation history
- Monitor Slack notifications for real-time error alerts

---

## 📊 Monitoring

### Dashboard Metrics
- **Active Threads**: Current repository connections
- **Event Counts**: Total operations performed
- **Success Rate**: Percentage of successful relays
- **Error Tracking**: Failed operations with details

### Log Analysis
- Filter events by type (success, error, info)
- Search by repository or issue number
- Export data for external analysis
- Real-time updates with auto-refresh

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes following the existing code style
4. Test your changes thoroughly
5. Submit a pull request with a detailed description

---

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

**Note**: This project is not yet published to npm. For installation, clone the repository and use `npm link` for global access to the `repo-relay` command.

---

## 🆘 Support

- 📚 **Documentation**: Check this README and inline code comments
- 🐛 **Issues**: Report bugs via GitHub Issues
- 💬 **Discussions**: Use GitHub Discussions for questions
- 📧 **Contact**: Use GitHub Issues or Discussions for support

---

## 🔗 Related Projects

- [Probot](https://probot.github.io/) - GitHub Apps framework
- [GitHub REST API](https://docs.github.com/en/rest) - GitHub API documentation
- [Slack Webhooks](https://api.slack.com/messaging/webhooks) - Slack integration guide

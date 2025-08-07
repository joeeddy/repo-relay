 # 🧵 GitHub Thread Relay & Dashboard

This app enables seamless cross-repository communication by linking GitHub issues and comments between threads. It also provides a live dashboard to monitor active thread connections.

## 🚀 Features

- 🔗 **Thread Linking**: Connect issues or comments across repositories.
- 🔁 **Bi-Directional Relay**: Automatically mirror comments between linked threads.
- 📊 **Live Dashboard**: View active thread links and metadata in real time.
- ⚡ **Webhook Integration**: Respond to GitHub events instantly.
- 🧠 **In-Memory Tracking**: Fast and lightweight thread mapping.

---

## 🛠️ Setup

### 1. Clone the Repo

```bash
git clone https://github.com/your-username/thread-relay-app.git
cd thread-relay-app

 
 
 
 npm install

 
 
 
 GITHUB_TOKEN=your_github_token
WEBHOOK_SECRET=your_webhook_secret
PORT=3000

 
 
 
 npm start

 
 
 
 linkThread('origin/repo', 123, 'target/repo', 456);

 
 
 
 http://your-server.com/webhook

 
 
 http://localhost:3000


├── dashboard/
│   └── server.js         # Dashboard server
├── relay/
│   └── relay.js          # Comment relay logic
├── tracker/
│   └── threadTracker.js  # Thread linking and retrieval
├── webhook/
│   └── webhookHandler.js # GitHub webhook handler
├── .env
├── README.md
└── package.json




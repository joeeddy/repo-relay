# 🧠 RepoRelay

RepoRelay is a Probot App that enables intelligent, two-way communication between repositories in your GitHub account. Designed for AI-driven workflows, it allows agents like Hippocrates-2.1 to issue commands and receive feedback from operator repos like Hummingbot-2.0.

## Features
- Two-way issue and comment relaying
- Configurable repo mappings via `.dispatcherbot.yml`
- Thread tracking for linked conversations
- Command parsing for structured AI instructions

## Setup
1. Install RepoRelay on your GitHub account
2. Add `.dispatcherbot.yml` to each participating repo
3. Start communicating across your AI portfolio

repo-relay/
├── .github/
│   └── workflows/
│       └── ci.yml
├── src/
│   ├── configLoader.js
│   ├── commandParser.js
│   ├── relayEngine.js
│   ├── threadTracker.js
│   └── index.js
├── .env.example
├── .dispatcherbot.yml
├── README.md
├── LICENSE
└── package.json

MIT License. Built by joeeddy.

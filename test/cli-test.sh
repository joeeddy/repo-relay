#!/bin/bash
# Basic integration test for repo-relay CLI

set -e

echo "🧪 Testing repo-relay CLI commands..."

# Test help command
echo "Testing help command..."
repo-relay help > /dev/null
echo "✅ Help command works"

# Test unknown command handling
echo "Testing unknown command handling..."
if repo-relay unknown-command 2>/dev/null; then
  echo "❌ Should have failed on unknown command"
  exit 1
else
  echo "✅ Unknown command properly rejected"
fi

# Test no command handling
echo "Testing no command handling..."
if repo-relay 2>/dev/null; then
  echo "❌ Should have failed with no command"
  exit 1
else
  echo "✅ No command properly rejected"
fi

echo "🎉 All CLI tests passed!"
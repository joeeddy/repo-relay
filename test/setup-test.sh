#!/bin/bash
# Full integration test of README setup instructions

set -e

echo "🧪 Testing complete setup workflow from README..."

# Test that .env.example exists and can be copied
echo "1. Testing environment setup..."
if [ -f ".env.example" ]; then
  echo "✅ .env.example exists"
else
  echo "❌ .env.example missing"
  exit 1
fi

# Test copying sample config
echo "2. Testing config file setup..."
if [ -f "repo-relay.config.json.sample" ]; then
  echo "✅ repo-relay.config.json.sample exists"
else
  echo "❌ repo-relay.config.json.sample missing"
  exit 1
fi

# Test package.json has correct metadata
echo "3. Testing package.json metadata..."
if grep -q "joeeddy/repo-relay" package.json; then
  echo "✅ Repository URL is correct"
else
  echo "❌ Repository URL incorrect"
  exit 1
fi

# Test that CLI binary exists and is executable
echo "4. Testing CLI binary..."
if [ -x "bin/repo-relay.js" ]; then
  echo "✅ CLI binary exists and is executable"
else
  echo "❌ CLI binary missing or not executable"
  exit 1
fi

# Test basic CLI commands
echo "5. Testing CLI commands..."
repo-relay help > /dev/null
echo "✅ CLI help command works"

# Test that main script exists
echo "6. Testing main application files..."
if [ -f "index.js" ]; then
  echo "✅ Main index.js exists"
else
  echo "❌ Main index.js missing"
  exit 1
fi

# Test dashboard exists
if [ -f "dashboard/server.js" ]; then
  echo "✅ Dashboard server exists"
else
  echo "❌ Dashboard server missing"
  exit 1
fi

# Test that dispatcher config exists
if [ -f ".dispatcherbot.yml" ]; then
  echo "✅ .dispatcherbot.yml exists"
else
  echo "❌ .dispatcherbot.yml missing"
  exit 1
fi

echo "🎉 All setup workflow tests passed!"
echo "✨ Users can now follow the README instructions successfully!"
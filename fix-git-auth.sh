#!/bin/bash

# Script to fix GitHub authentication and push changes
# Run this script in your terminal: bash fix-git-auth.sh

echo "🔧 Fixing GitHub authentication..."

# Step 1: Clear old credentials from keychain
echo "📝 Step 1: Clearing old GitHub credentials..."
printf "host=github.com\nprotocol=https\n\n" | git credential-osxkeychain erase 2>&1 || echo "Note: Some credentials may need manual clearing"

# Step 2: Update remote URL with username
echo "📝 Step 2: Updating remote URL..."
git remote set-url origin https://huttleai@github.com/huttleai/huttle-ai.git

# Step 3: Show current status
echo ""
echo "✅ Configuration updated!"
echo ""
echo "📋 Next steps:"
echo "   1. You'll need a GitHub Personal Access Token (PAT)"
echo "   2. Get one here: https://github.com/settings/tokens"
echo "   3. Click 'Generate new token (classic)'"
echo "   4. Select 'repo' scope and generate"
echo "   5. Copy the token"
echo ""
echo "🚀 Then run: git push"
echo "   When prompted:"
echo "   - Username: huttleai"
echo "   - Password: [paste your PAT token]"
echo ""
echo "Attempting push now (will prompt for credentials)..."
echo ""

# Try to push (will prompt for credentials)
git push

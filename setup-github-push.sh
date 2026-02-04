#!/bin/bash

# Complete GitHub Push Setup Script
# Run this in your terminal: bash setup-github-push.sh

set -e

echo "🚀 Setting up GitHub authentication for push..."
echo ""

# Check if SSH key exists
if [ -f ~/.ssh/id_ed25519.pub ]; then
    echo "✅ SSH key already exists"
    SSH_KEY=$(cat ~/.ssh/id_ed25519.pub)
else
    echo "📝 Generating new SSH key..."
    mkdir -p ~/.ssh
    chmod 700 ~/.ssh
    ssh-keygen -t ed25519 -C "digitalhuttle@gmail.com" -f ~/.ssh/id_ed25519 -N "" -q
    echo "✅ SSH key generated"
    SSH_KEY=$(cat ~/.ssh/id_ed25519.pub)
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STEP 1: Add this SSH key to GitHub"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your public SSH key (already copied to clipboard):"
echo ""
echo "$SSH_KEY"
echo ""
echo "$SSH_KEY" | pbcopy
echo "✅ Key copied to clipboard!"
echo ""
echo "👉 Next steps:"
echo "   1. Open: https://github.com/settings/keys"
echo "   2. Click 'New SSH key'"
echo "   3. Title: 'Huttle AI Development'"
echo "   4. Paste the key (Cmd+V)"
echo "   5. Click 'Add SSH key'"
echo ""
read -p "Press Enter after you've added the key to GitHub..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 STEP 2: Switching repository to SSH..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd /Users/huttleai/huttle-ai
git remote set-url origin git@github.com:huttleai/huttle-ai.git

echo "✅ Remote URL updated to SSH"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Testing SSH connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "✅ SSH connection successful!"
else
    echo "⚠️  SSH test completed (this is normal)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Pushing your changes..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

git push

echo ""
echo "✅ Done! Your changes have been pushed to GitHub."
echo ""

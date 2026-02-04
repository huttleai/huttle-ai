# Quick Fix for GitHub Push Authentication

## The Problem
GitHub no longer accepts passwords for Git operations. You need a Personal Access Token (PAT).

## The Solution (2 minutes)

### Step 1: Get Your Token
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Name it: `Huttle AI Repo`
4. Check the **`repo`** checkbox (gives full repository access)
5. Click **"Generate token"** at the bottom
6. **COPY THE TOKEN** (you won't see it again!)

### Step 2: Push Your Changes
Run this in your terminal:

```bash
cd /Users/huttleai/huttle-ai
git push
```

When prompted:
- **Username:** `huttleai`
- **Password:** [paste your token here - NOT your GitHub password]

That's it! Your changes will push successfully.

---

## Alternative: Use SSH (One-time setup)

If you prefer SSH (no token needed after setup):

```bash
# Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "digitalhuttle@gmail.com"
# Press Enter to accept default location
# Press Enter twice for no passphrase (or set one)

# Copy your public key
cat ~/.ssh/id_ed25519.pub | pbcopy

# Add to GitHub:
# 1. Go to https://github.com/settings/keys
# 2. Click "New SSH key"
# 3. Paste and save

# Switch to SSH
cd /Users/huttleai/huttle-ai
git remote set-url origin git@github.com:huttleai/huttle-ai.git
git push
```

---

**Your commit is ready to push:**
- ✅ Commit: "Update waitlist and spots left counts, and adjust launch date in components"
- ✅ Files updated: LandingPage.jsx, FoundersPage.jsx, CountdownTimer.jsx

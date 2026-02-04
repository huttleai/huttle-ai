# ⚡ Quick Push Fix - Run This Now

## Option 1: Automated Script (Recommended)

Just run this in your terminal:

```bash
cd /Users/huttleai/huttle-ai
bash setup-github-push.sh
```

The script will:
1. Generate an SSH key (if needed)
2. Copy it to your clipboard
3. Guide you to add it to GitHub (one-time)
4. Switch your repo to SSH
5. Push your changes

**Total time: ~2 minutes**

---

## Option 2: Manual Token Method (Faster if you already have a token)

1. Get token: https://github.com/settings/tokens → Generate new token (classic) → Check `repo` → Generate
2. Copy the token
3. Run:
   ```bash
   cd /Users/huttleai/huttle-ai
   git push
   ```
4. When prompted:
   - Username: `huttleai`
   - Password: [paste your token]

---

**Your commit is ready:**
- ✅ "Update waitlist and spots left counts, and adjust launch date in components"
- ✅ All files committed locally

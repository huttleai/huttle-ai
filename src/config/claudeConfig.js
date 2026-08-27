/**
 * Claude (Anthropic) Model Configuration — Single Source of Truth
 * ---------------------------------------------------------------
 * Every Claude call site (client services and Vercel serverless proxies)
 * imports the model id and alias resolution from this file. No production
 * Claude model string may be defined anywhere else in the repo.
 *
 * IMPORTANT: This module is shared between the Vite client bundle and Vercel
 * Node serverless functions. Keep it a leaf module — no import.meta.env, no
 * Vite-only APIs, no imports beyond plain JS.
 *
 * To upgrade the production Claude model: change CLAUDE_MODEL (and aliases if
 * the previous id should keep resolving). Then follow docs/MODEL_UPGRADE_CHECKLIST.md
 * for n8n nodes that cannot be changed from this repo.
 */

export const CLAUDE_MODEL = 'claude-sonnet-5';

/**
 * Client / legacy snapshot ids that must resolve to CLAUDE_MODEL upstream.
 * Collected from api/ai/claude.js and api/ai/content-remix.js (the two tables
 * were identical). Unknown or empty requests also fall back to CLAUDE_MODEL.
 */
export const CLAUDE_LEGACY_ALIASES = {
  'claude-sonnet-4-6-20250514': CLAUDE_MODEL,
  'claude-sonnet-4-6': CLAUDE_MODEL,
  'claude-sonnet-5': CLAUDE_MODEL,
};

/**
 * Default max_tokens per known Claude caller.
 * Relocated only — do not change these values when upgrading models.
 */
export const CLAUDE_MAX_TOKENS = Object.freeze({
  default: 4096,
  humanize: 8192,
  contentRemix: 2200,
  algorithmChecker: 700,
});

/**
 * Normalize a client-supplied model id to the current upstream Messages API id.
 * Logic moved from api/ai/claude.js (resolveUpstreamClaudeModel).
 * @param {string} [clientModel]
 * @returns {string}
 */
export function resolveClaudeModel(clientModel) {
  const r = typeof clientModel === 'string' ? clientModel.trim() : '';
  if (r && CLAUDE_LEGACY_ALIASES[r]) return CLAUDE_LEGACY_ALIASES[r];
  if (r === CLAUDE_MODEL) return CLAUDE_MODEL;
  return CLAUDE_MODEL;
}

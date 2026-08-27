# Model upgrade checklist

When Anthropic or xAI ships a new production model, change the repo constants first, then log into n8n and update the workflow nodes that cannot be driven from this repository.

Repo changes take **one edit each**. The two n8n workflows require logging into n8n and changing the model dropdown on each named node individually, because n8n's model-selector fields do not support the expression/variable syntax needed to centralize them.

## Repo (one line each)

| Provider | File | Constant | How to upgrade |
|----------|------|----------|----------------|
| xAI Grok | `src/config/grokConfig.js` | `GROK_MODEL` | Change this one line. Every Grok call site already imports `getGrokParams(featureKey)` / `GROK_MODEL`. Do not scatter a new Grok model string elsewhere. |
| Anthropic Claude | `src/config/claudeConfig.js` | `CLAUDE_MODEL` | Change this one line. Every production Claude call site imports `CLAUDE_MODEL` and/or `resolveClaudeModel()`. If the previous id must keep working, add it to `CLAUDE_LEGACY_ALIASES` in the same file. |

Do not re-introduce a local `'claude-sonnet-5'` (or successor) constant in `api/ai/claude.js`, `api/ai/humanize.js`, `api/ai/content-remix.js`, or `src/services/claudeAPI.js`. Those files must keep importing from `claudeConfig.js`.

## n8n (manual UI change required)

n8n stores the model on each node's **model dropdown**. Those fields are not expressions, so they cannot read `CLAUDE_MODEL` or `GROK_MODEL` from this repo. Changing the constants above does **not** update n8n.

| Workflow | Workflow ID | Node(s) to change by hand |
|----------|-------------|---------------------------|
| AI Plan Builder | `iEs1WLZ3FDhONdqj` | **Anthropic Chat Model** — open the node, change the model dropdown, save the workflow. |
| Ignite Engine | `4RBACXirZhUR2v31` | **Anthropic Chat Model** *and* **Grok Model** — open each node, change its model dropdown, save the workflow. |

Steps:

1. Log into n8n (`huttleai.app.n8n.cloud`).
2. Open the workflow by ID.
3. Open each named node above.
4. Pick the new model from that node's dropdown. Do not try to wire it to a repo constant or an n8n expression; the selector does not support that.
5. Save (and publish, if the instance requires it) the workflow.

## After the repo + n8n edits

- Confirm `CLAUDE_LEGACY_ALIASES` still maps every previous production id to the new `CLAUDE_MODEL` if old clients or cached requests may send them.
- `max_tokens` lives in `CLAUDE_MAX_TOKENS` (`default` 4096, `humanize` 8192, `contentRemix` 2200, `algorithmChecker` 700). Model upgrades should not change those values unless a separate decision is made.
- Grok `reasoning_effort` lives in `GROK_EFFORT` inside `grokConfig.js`. Leave it alone unless the upgrade specifically requires it.

## Not a production source of truth (leave or update separately)

These still mention a model string but are not the upgrade path:

| Location | Why it is separate |
|----------|--------------------|
| `scripts/dev-test-claude.mjs` | Dev-only probe; has its own `DEFAULT_MODEL`. |
| `scripts/audit-claude-probe.mjs` | Dev-only probe; does not send a model id (proxy default applies). |
| `tests/e2e/helpers/mock-api.ts` | E2E mock payload. Update if a test asserts on the client-sent model id. |
| `api/ai/perplexity.js` / `api/ai/deep-dive.js` | Perplexity models, not Claude/Grok. |
| `CLAUDE.md`, `docs/internal/ai-model-map.md` | Documentation. Update wording after a bump so examples match `CLAUDE_MODEL` / `GROK_MODEL`. |

See `docs/internal/ai-model-map.md` for which feature uses which provider.

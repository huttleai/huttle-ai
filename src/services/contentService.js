/**
 * CONTENT VAULT SAVE AUDIT (March 2026)
 * -------------------------------------
 * 1) src/pages/ContentLibrary.jsx — "Save" in Create Post modal → was saveContentLibraryItem with
 *    invalid top-level keys (platform, topic, tool_source); now saveToVault (sanitized).
 * 2) src/pages/AITools.jsx — Save to vault per tool → buildContentVaultPayload + saveToVault.
 * 3) src/pages/ContentRemix.jsx — Save variation → buildContentVaultPayload + saveToVault.
 * 4) src/pages/IgniteEngine.jsx — Save brief → buildContentVaultPayload + saveToVault.
 * 5) src/pages/FullPostBuilder.jsx — Full save + per-part saves → buildContentVaultPayload + saveToVault;
 *    fixed silent failure when result.success is false.
 * 6) src/pages/AIPlanBuilder.jsx — Save plan / per-post → buildContentVaultPayload + saveToVault;
 *    failures now logged.
 * 7) src/pages/NicheIntel.jsx — Save idea → buildContentVaultPayload + saveToVault.
 * 8) src/pages/ContentRepurposer.jsx — Save → buildContentVaultPayload + saveToVault.
 * 9) src/components/TrendDiscoveryHub.jsx — Add to library / deep dive → plain row + saveToVault.
 * 10) src/context/ContentContext.jsx — saveToLibrary + autoSaveToLibrary → saveToVault (source folded into metadata).
 *
 * Payload / user_id: All paths use authenticated user.id as user_id (RLS: auth.uid() = user_id).
 * Errors: saveToVault logs Supabase errors; callers keep toasts and console.error where present.
 * Vault UI refresh: dispatch CONTENT_VAULT_UPDATED_EVENT on success; ContentLibrary listens and refetches.
 */

import { supabase, TABLES } from '../config/supabase';

/** Matches public.content_library insertable columns (see docs/setup/supabase-content-library-schema.sql). */
const CONTENT_LIBRARY_ROW_KEYS = new Set([
  'name',
  'type',
  'storage_path',
  'url',
  'content',
  'size_bytes',
  'project_id',
  'description',
  'metadata',
]);

/**
 * Top-level keys sometimes passed by mistake; fold into metadata instead of sending to Postgres.
 */
const TOP_LEVEL_METADATA_KEYS = new Set([
  'platform',
  'topic',
  'tool_source',
  'tool_label',
  'source',
]);

export const CONTENT_VAULT_UPDATED_EVENT = 'huttle:content-vault-updated';

function buildSanitizedInsertRow(userId, itemData) {
  const baseMeta =
    itemData && typeof itemData.metadata === 'object' && itemData.metadata !== null
      ? { ...itemData.metadata }
      : {};

  const row = {
    user_id: userId,
    metadata: baseMeta,
  };

  for (const key of CONTENT_LIBRARY_ROW_KEYS) {
    if (key === 'metadata') continue;
    if (itemData[key] !== undefined) {
      row[key] = itemData[key];
    }
  }

  for (const key of TOP_LEVEL_METADATA_KEYS) {
    if (itemData[key] !== undefined && itemData[key] !== null && itemData[key] !== '') {
      if (row.metadata[key] === undefined) {
        row.metadata[key] = itemData[key];
      }
    }
  }

  if (!row.name) {
    row.name = `Content - ${new Date().toLocaleDateString()}`;
  }
  if (!row.type) {
    row.type = 'text';
  }
  if (row.size_bytes === undefined || row.size_bytes === null) {
    row.size_bytes = 0;
  }
  if (row.description === undefined) {
    row.description = '';
  }

  return row;
}

/**
 * Single entry point for inserting rows into content_library.
 * Strips unknown columns (prevents PostgREST "column does not exist" failures).
 *
 * @param {string} userId - Must match auth.uid() for RLS.
 * @param {object} itemData - Row fields; extras like platform/topic/source merge into metadata.
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function saveToVault(userId, itemData = {}) {
  if (!userId) {
    console.error('[saveToVault] No userId — user may not be authenticated');
    return { success: false, error: 'Not authenticated' };
  }

  const row = buildSanitizedInsertRow(userId, itemData);

  try {
    const { data, error } = await supabase
      .from(TABLES.CONTENT_LIBRARY)
      .insert({
        ...row,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[saveToVault] Supabase insert failed:', error.code, error.message, error.details || '', error.hint || '');

      let errorMessage = error.message;
      if (error.message?.includes('foreign key') || error.message?.includes('violates')) {
        errorMessage = 'Database setup error: user record may be missing. Please contact support.';
      } else if (error.code === '42P01') {
        errorMessage = 'Content library table not found. Please run the database migration.';
      } else if (error.message?.includes('policy') || error.code === '42501') {
        errorMessage = 'Permission denied. Please check database RLS policies.';
      }

      return { success: false, error: errorMessage };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(CONTENT_VAULT_UPDATED_EVENT, { detail: { userId } })
      );
    }

    return { success: true, data };
  } catch (error) {
    console.error('[saveToVault] Unexpected error:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

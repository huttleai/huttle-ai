import { supabase } from '../config/supabase';

const KITS_TABLE = 'post_kits';
const SLOTS_TABLE = 'post_kit_slots';

/** Pending kit creation from FAB, Vault, or Full Post Builder — `{ platform, topic, prefill?: { caption, hashtags } }` */
export const POSTKIT_PENDING_STORAGE_KEY = 'huttle_postkit_pending';

export const POSTKIT_CANONICAL_SLOT_KEYS = ['caption', 'hook', 'hashtags', 'cta', 'visuals'];

function isNonEmptyContent(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function countFilledCanonicalSlots(kitSlots) {
  if (!kitSlots || typeof kitSlots !== 'object') return 0;
  return POSTKIT_CANONICAL_SLOT_KEYS.filter((k) => isNonEmptyContent(kitSlots[k]?.content)).length;
}

/**
 * Read merged canonical slots from kit row (JSONB) with optional legacy post_kit_slots rows.
 * @param {object} kit
 * @returns {Record<string, { content: string, savedAt?: string }>}
 */
export function normalizeKitCanonicalSlots(kit) {
  const out = {};
  const json = kit?.kit_slots && typeof kit.kit_slots === 'object' ? kit.kit_slots : {};
  for (const key of POSTKIT_CANONICAL_SLOT_KEYS) {
    const entry = json[key];
    if (entry && typeof entry.content === 'string' && entry.content.trim()) {
      out[key] = {
        content: entry.content,
        savedAt: typeof entry.savedAt === 'string' ? entry.savedAt : undefined,
      };
    }
  }
  if (Object.keys(out).length > 0) return out;

  const rows = kit?.post_kit_slots;
  if (!Array.isArray(rows)) return out;

  const firstContent = (slotKeys) => {
    for (const sk of slotKeys) {
      const row = rows.find((r) => r?.slot_key === sk && isNonEmptyContent(r?.content));
      if (row) return row.content;
    }
    return '';
  };

  const cap = firstContent(['caption', 'post_text', 'description', 'post_body']);
  if (cap) out.caption = { content: cap };
  const hook = firstContent(['opening_line', 'title']);
  if (hook) out.hook = { content: hook };
  const tags = firstContent(['hashtags', 'tags']);
  if (tags) out.hashtags = { content: tags };
  const cta = firstContent(['cta']);
  if (cta) out.cta = { content: cta };
  const vis = firstContent(['image_description']);
  if (vis) out.visuals = { content: vis };

  return out;
}

/**
 * Insert a new post kit for the authenticated user.
 */
export async function createKit({ userId, title, platform, contentType }) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required.' };
    }

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Title is required.' };
    }

    if (!platform) {
      return { success: false, error: 'Platform is required.' };
    }

    const payload = {
      user_id: userId,
      title: trimmedTitle,
      platform,
      content_type: contentType ?? null,
    };

    const { data, error } = await supabase
      .from(KITS_TABLE)
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] createKit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * List all kits for a user (newest first) with per-kit count of non-empty slots.
 */
export async function getUserKits(userId) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required.', data: [] };
    }

    const { data: kits, error: kitsError } = await supabase
      .from(KITS_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (kitsError) throw kitsError;

    const list = Array.isArray(kits) ? kits : [];
    if (list.length === 0) {
      return { success: true, data: [] };
    }

    const kitIds = list.map((k) => k.id);

    const { data: slotRows, error: slotsError } = await supabase
      .from(SLOTS_TABLE)
      .select('kit_id, content')
      .eq('user_id', userId)
      .in('kit_id', kitIds);

    if (slotsError) throw slotsError;

    const filledCountByKitId = {};
    for (const row of slotRows || []) {
      if (row?.kit_id && isNonEmptyContent(row.content)) {
        filledCountByKitId[row.kit_id] = (filledCountByKitId[row.kit_id] || 0) + 1;
      }
    }

    const data = list.map((kit) => {
      const fromJson = countFilledCanonicalSlots(kit.kit_slots);
      const legacy = filledCountByKitId[kit.id] || 0;
      return {
        ...kit,
        filled_slot_count: fromJson > 0 ? fromJson : legacy,
      };
    });

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] getUserKits:', error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Load one kit and its slots (nested).
 */
export async function getKitWithSlots(kitId) {
  try {
    if (!kitId) {
      return { success: false, error: 'Kit ID is required.' };
    }

    const { data, error } = await supabase
      .from(KITS_TABLE)
      .select(`
        *,
        post_kit_slots (*)
      `)
      .eq('id', kitId)
      .maybeSingle();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] getKitWithSlots:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Merge one canonical slot into post_kits.kit_slots (JSONB).
 * @param {'caption'|'hook'|'hashtags'|'cta'|'visuals'} slotKey
 */
export async function mergeKitCanonicalSlot({ kitId, userId, slotKey, content }) {
  try {
    if (!kitId || !userId || !slotKey) {
      return { success: false, error: 'kitId, userId, and slotKey are required.' };
    }
    if (!POSTKIT_CANONICAL_SLOT_KEYS.includes(slotKey)) {
      return { success: false, error: 'Invalid slot key.' };
    }

    const { data: row, error: fetchError } = await supabase
      .from(KITS_TABLE)
      .select('kit_slots')
      .eq('id', kitId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const prev =
      row?.kit_slots && typeof row.kit_slots === 'object' && !Array.isArray(row.kit_slots)
        ? row.kit_slots
        : {};
    const next = {
      ...prev,
      [slotKey]: {
        content: typeof content === 'string' ? content : String(content ?? ''),
        savedAt: new Date().toISOString(),
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from(KITS_TABLE)
      .update({ kit_slots: next })
      .eq('id', kitId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return { success: true, data: updated };
  } catch (error) {
    console.error('[postKitService] mergeKitCanonicalSlot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove a canonical slot key from kit_slots JSONB.
 */
export async function removeKitCanonicalSlot({ kitId, userId, slotKey }) {
  try {
    if (!kitId || !userId || !slotKey) {
      return { success: false, error: 'kitId, userId, and slotKey are required.' };
    }
    if (!POSTKIT_CANONICAL_SLOT_KEYS.includes(slotKey)) {
      return { success: false, error: 'Invalid slot key.' };
    }

    const { data: row, error: fetchError } = await supabase
      .from(KITS_TABLE)
      .select('kit_slots')
      .eq('id', kitId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const prev =
      row?.kit_slots && typeof row.kit_slots === 'object' && !Array.isArray(row.kit_slots)
        ? { ...row.kit_slots }
        : {};
    delete prev[slotKey];

    const { data: updated, error: updateError } = await supabase
      .from(KITS_TABLE)
      .update({ kit_slots: prev })
      .eq('id', kitId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return { success: true, data: updated };
  } catch (error) {
    console.error('[postKitService] removeKitCanonicalSlot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Insert or update a slot row for (kit_id, slot_key).
 */
export async function upsertSlot({
  kitId,
  userId,
  slotKey,
  content,
  sourceTool,
  metadata,
}) {
  try {
    if (!kitId || !userId || !slotKey) {
      return { success: false, error: 'kitId, userId, and slotKey are required.' };
    }

    const row = {
      kit_id: kitId,
      user_id: userId,
      slot_key: slotKey,
      content: typeof content === 'string' ? content : '',
      source_tool: sourceTool ?? null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
    };

    const { data, error } = await supabase
      .from(SLOTS_TABLE)
      .upsert(row, { onConflict: 'kit_id,slot_key' })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] upsertSlot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a single slot by primary key.
 */
export async function deleteSlot(slotId) {
  try {
    if (!slotId) {
      return { success: false, error: 'Slot ID is required.' };
    }

    const { error } = await supabase.from(SLOTS_TABLE).delete().eq('id', slotId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[postKitService] deleteSlot:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a kit; related slots are removed by ON DELETE CASCADE.
 * @param {string} kitId
 * @param {string} userId — required so deletes are scoped to the owner row
 */
export async function deleteKit(kitId, userId) {
  try {
    if (!kitId) {
      return { success: false, error: 'Kit ID is required.' };
    }
    if (!userId) {
      return { success: false, error: 'User ID is required.' };
    }

    const { error } = await supabase
      .from(KITS_TABLE)
      .delete()
      .eq('id', kitId)
      .eq('user_id', userId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('[postKitService] deleteKit:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark whether a kit has been used; sets used_at when marking used.
 */
export async function toggleKitUsed(kitId, isUsed) {
  try {
    if (!kitId) {
      return { success: false, error: 'Kit ID is required.' };
    }

    const used = Boolean(isUsed);

    const { data, error } = await supabase
      .from(KITS_TABLE)
      .update({
        is_used: used,
        used_at: used ? new Date().toISOString() : null,
      })
      .eq('id', kitId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] toggleKitUsed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Rename a post kit.
 */
export async function updateKitTitle(kitId, title) {
  try {
    if (!kitId) {
      return { success: false, error: 'Kit ID is required.' };
    }

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) {
      return { success: false, error: 'Title is required.' };
    }

    const { data, error } = await supabase
      .from(KITS_TABLE)
      .update({ title: trimmedTitle })
      .eq('id', kitId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('[postKitService] updateKitTitle:', error);
    return { success: false, error: error.message };
  }
}

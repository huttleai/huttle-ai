import { supabase } from '../config/supabase';

const KITS_TABLE = 'post_kits';
const SLOTS_TABLE = 'post_kit_slots';

function isNonEmptyContent(value) {
  return typeof value === 'string' && value.trim() !== '';
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

    const data = list.map((kit) => ({
      ...kit,
      filled_slot_count: filledCountByKitId[kit.id] || 0,
    }));

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
 */
export async function deleteKit(kitId) {
  try {
    if (!kitId) {
      return { success: false, error: 'Kit ID is required.' };
    }

    const { error } = await supabase.from(KITS_TABLE).delete().eq('id', kitId);

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

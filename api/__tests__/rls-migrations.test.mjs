import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

test('get_user_tier migration requires the caller to match the subject', () => {
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260828000200_get_user_tier_caller_check.sql'),
    'utf8'
  );
  assert.match(sql, /caller_uid IS DISTINCT FROM user_uuid/);
  assert.match(sql, /RAISE EXCEPTION/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_user_tier\(uuid\) FROM PUBLIC/);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_user_tier\(uuid\) FROM anon/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_user_tier\(uuid\) TO authenticated/);
});

test('ai_analytics insert policy migration is own-row, not WITH CHECK (true)', () => {
  const sql = readFileSync(
    join(root, 'supabase/migrations/20260828000300_ai_analytics_insert_own_row.sql'),
    'utf8'
  );
  assert.match(sql, /DROP POLICY IF EXISTS "Service role can insert analytics"/);
  assert.match(sql, /WITH CHECK \(\(select auth\.uid\(\)\) = user_id\)/);
  const createPolicy = sql.slice(sql.indexOf('CREATE POLICY'));
  assert.doesNotMatch(createPolicy, /WITH CHECK \(true\)/);
});

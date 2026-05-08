import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveAuthenticatedUserId } from '../../api/_utils/billing.js';

function createRequest(authorization) {
  return {
    headers: authorization ? { authorization } : {},
  };
}

function createSupabaseMock({ user = null, error = null } = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error,
      }),
    },
  };
}

test('resolveAuthenticatedUserId rejects missing bearer token', async () => {
  const result = await resolveAuthenticatedUserId({
    req: createRequest(null),
    supabase: createSupabaseMock({ user: { id: 'user-1' } }),
  });

  assert.equal(result.statusCode, 401);
  assert.equal(result.userId, null);
});

test('resolveAuthenticatedUserId rejects mismatched requested user id', async () => {
  const result = await resolveAuthenticatedUserId({
    req: createRequest('Bearer test-token'),
    supabase: createSupabaseMock({ user: { id: 'user-1' } }),
    requestedUserId: 'user-2',
  });

  assert.equal(result.statusCode, 403);
  assert.equal(result.userId, null);
});

test('resolveAuthenticatedUserId returns authenticated user id when request is bound', async () => {
  const result = await resolveAuthenticatedUserId({
    req: createRequest('Bearer test-token'),
    supabase: createSupabaseMock({ user: { id: 'user-1' } }),
    requestedUserId: 'user-1',
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.userId, 'user-1');
});

test('resolveAuthenticatedUserId allows callers to omit a redundant user id', async () => {
  const result = await resolveAuthenticatedUserId({
    req: createRequest('Bearer test-token'),
    supabase: createSupabaseMock({ user: { id: 'user-1' } }),
  });

  assert.equal(result.statusCode, 200);
  assert.equal(result.userId, 'user-1');
});

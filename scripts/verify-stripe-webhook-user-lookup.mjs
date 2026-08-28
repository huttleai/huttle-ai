import assert from 'node:assert/strict';

import { findAuthUserByEmail } from '../api/_utils/authUsers.js';

function createSupabaseMock(pages, callsOut) {
  return {
    auth: {
      admin: {
        listUsers: async ({ page, perPage }) => {
          callsOut.push({ page, perPage });
          const key = String(page);
          const entry = pages[key];

          if (!entry) {
            return { data: { users: [] }, error: null };
          }

          if (entry.error) {
            return { data: { users: [] }, error: entry.error };
          }

          return {
            data: {
              users: entry.users || [],
              nextPage: entry.nextPage ?? null,
            },
            error: null,
          };
        },
      },
    },
  };
}

async function run() {
  {
    const calls = [];
    const supabase = createSupabaseMock(
      {
        1: {
          users: [{ id: 'u_1', email: 'first@example.com' }],
        },
      },
      calls
    );

    const result = await findAuthUserByEmail({
      supabase,
      email: 'first@example.com',
      perPage: 200,
      maxPages: 20,
    });

    assert.equal(result.userId, 'u_1');
    assert.equal(result.error, null);
    assert.equal(result.exhausted, false);
    assert.deepEqual(calls, [{ page: 1, perPage: 200 }]);
  }

  {
    const calls = [];
    const supabase = createSupabaseMock(
      {
        1: {
          users: [{ id: 'u_1', email: 'first@example.com' }],
          nextPage: 2,
        },
        2: {
          users: [{ id: 'u_2', email: 'target@example.com' }],
        },
      },
      calls
    );

    const result = await findAuthUserByEmail({
      supabase,
      email: 'target@example.com',
      perPage: 1,
      maxPages: 20,
    });

    assert.equal(result.userId, 'u_2');
    assert.equal(result.error, null);
    assert.equal(result.exhausted, false);
    assert.deepEqual(calls, [
      { page: 1, perPage: 1 },
      { page: 2, perPage: 1 },
    ]);
  }

  {
    const calls = [];
    const supabase = createSupabaseMock(
      {
        1: {
          users: [{ id: 'u_1', email: 'other@example.com' }],
          nextPage: 2,
        },
        2: {
          users: [{ id: 'u_2', email: 'still-not-target@example.com' }],
          nextPage: 3,
        },
      },
      calls
    );

    const result = await findAuthUserByEmail({
      supabase,
      email: 'target@example.com',
      perPage: 1,
      maxPages: 2,
    });

    assert.equal(result.userId, null);
    assert.equal(result.error, null);
    assert.equal(result.exhausted, true);
    assert.deepEqual(calls, [
      { page: 1, perPage: 1 },
      { page: 2, perPage: 1 },
    ]);
  }

  {
    const calls = [];
    const expectedError = { message: 'service unavailable', code: '500' };
    const supabase = createSupabaseMock(
      {
        1: {
          error: expectedError,
        },
      },
      calls
    );

    const result = await findAuthUserByEmail({
      supabase,
      email: 'target@example.com',
    });

    assert.equal(result.userId, null);
    assert.equal(result.error, expectedError);
    assert.equal(result.exhausted, false);
    assert.deepEqual(calls, [{ page: 1, perPage: 200 }]);
  }

  console.log('verify-stripe-webhook-user-lookup: all checks passed');
}

run().catch((error) => {
  console.error('verify-stripe-webhook-user-lookup: failed');
  console.error(error);
  process.exit(1);
});

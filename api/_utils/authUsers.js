function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/**
 * Find an auth user by exact email match.
 * Supabase Admin listUsers currently supports pagination but not server-side email filtering.
 * We scan pages and require an exact email match to avoid assigning billing to the wrong user.
 */
export async function findAuthUserByEmail({
  supabase,
  email,
  perPage = 200,
  maxPages = 20,
}) {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail || !supabase?.auth?.admin) {
    return { userId: null, error: null, exhausted: false };
  }

  let page = 1;

  while (page <= maxPages) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { userId: null, error, exhausted: false };
    }

    const users = Array.isArray(data?.users) ? data.users : [];
    const matchedUser = users.find((user) => normalizeEmail(user?.email) === targetEmail);
    if (matchedUser?.id) {
      return { userId: matchedUser.id, error: null, exhausted: false };
    }

    if (users.length < perPage) {
      return { userId: null, error: null, exhausted: false };
    }

    page = typeof data?.nextPage === 'number' && data.nextPage > page ? data.nextPage : page + 1;
  }

  return { userId: null, error: null, exhausted: true };
}

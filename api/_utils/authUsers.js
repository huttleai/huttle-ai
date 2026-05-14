export async function findAuthUserByEmail({ supabase, email, perPage = 100, maxPages = 10 }) {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!supabase?.auth?.admin || !normalizedEmail) {
    return { user: null, exhausted: false };
  }

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { user: null, error };
    }

    const users = data?.users ?? [];
    const user = users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail);
    if (user) {
      return { user, exhausted: false };
    }

    if (users.length < perPage) {
      return { user: null, exhausted: false };
    }
  }

  return { user: null, exhausted: true };
}

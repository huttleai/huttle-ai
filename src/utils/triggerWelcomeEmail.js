const inFlightUserIds = new Set();

function storageKey(userId) {
  return `huttle_welcome_email:${userId}`;
}

/**
 * Fire-and-forget Welcome email trigger. The server enforces once-per-account
 * and only sends around signup / email verification.
 */
export function triggerWelcomeEmail(session) {
  const userId = session?.user?.id;
  const accessToken = session?.access_token;
  if (!userId || !accessToken) return;

  if (inFlightUserIds.has(userId)) return;

  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey(userId)) === 'done') {
      return;
    }
  } catch {
    // Private mode / quota — still attempt the server call.
  }

  inFlightUserIds.add(userId);

  fetch('/api/emails/send-welcome-trigger', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({}),
  })
    .then((response) => {
      if (!response.ok) return;
      try {
        localStorage.setItem(storageKey(userId), 'done');
      } catch {
        // ignore
      }
    })
    .catch(() => {
      // Welcome delivery is best-effort and must not block auth.
    })
    .finally(() => {
      inFlightUserIds.delete(userId);
    });
}

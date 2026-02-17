function safeMeta(meta = {}) {
  try {
    return JSON.parse(JSON.stringify(meta));
  } catch {
    return { message: 'metadata_unserializable' };
  }
}

function log(level, event, meta = {}) {
  const payload = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...safeMeta(meta),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event, meta = {}) {
  log('info', event, meta);
}

export function logWarn(event, meta = {}) {
  log('warn', event, meta);
}

export function logError(event, meta = {}) {
  log('error', event, meta);
}

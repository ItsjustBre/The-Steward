import { db } from '../../utils/database/wrapper.js';

const SESSION_KEY = 'temp:continental-wire:session';

export async function getAnnouncedSession() {
  const status = db.getStatus();

  if (!status.isAvailable || status.isDegraded) {
    throw new Error(
      'Continental Wire requires a working PostgreSQL connection'
    );
  }

  return await db.get(SESSION_KEY, null);
}

export async function saveAnnouncedSession(stream) {
  const status = db.getStatus();

  if (!status.isAvailable || status.isDegraded) {
    throw new Error(
      'Cannot save livestream session without PostgreSQL'
    );
  }

  const record = {
    streamId: String(stream.id),
    title: stream.title || 'Live with Don Bre',
    startedAt: stream.startedAt || null,
    announcedAt: new Date().toISOString()
  };

  const saved = await db.set(SESSION_KEY, record);

  if (saved === false) {
    throw new Error('Failed to save Continental Wire session');
  }

  return record;
}

export async function shouldAnnounce(stream) {
  if (!stream?.isLive || !stream.id) {
    return false;
  }

  const previous = await getAnnouncedSession();

  return previous?.streamId !== String(stream.id);
}

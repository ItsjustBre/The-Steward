import { db } from '../../utils/database/wrapper.js';

const SESSION_KEY = 'temp:continental-wire:unified:v1';

function ensureDatabase() {
  const status = db.getStatus();

  if (!status.isAvailable || status.isDegraded) {
    throw new Error(
      'Continental Wire requires healthy PostgreSQL'
    );
  }
}

export async function getWireSession() {
  ensureDatabase();
  return db.get(SESSION_KEY, null);
}

export async function saveWireSession(session) {
  ensureDatabase();

  const saved = await db.set(SESSION_KEY, session);

  if (saved === false) {
    throw new Error(
      'Could not persist Continental Wire session'
    );
  }

  return session;
}

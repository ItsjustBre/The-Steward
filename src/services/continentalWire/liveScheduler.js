import cron from 'node-cron';
import { checkTwitchLive } from './twitchMonitor.js';
import { announceLive } from './announcementService.js';
import {
  shouldAnnounce,
  saveAnnouncedSession
} from './sessionTracker.js';

let checking = false;
let task = null;

export function startContinentalWire(client) {
  if (task) return task;

  if (
    !process.env.TWITCH_CLIENT_ID ||
    !process.env.TWITCH_CLIENT_SECRET
  ) {
    console.warn('[Continental Wire] Twitch credentials missing');
    return null;
  }

  console.log('[Continental Wire] Starting Twitch monitor');

  task = cron.schedule('*/2 * * * *', async () => {
    if (checking || !client.isReady()) return;

    checking = true;

    try {
      const stream = await checkTwitchLive();

      if (!stream.isLive) return;

      const needsAnnouncement = await shouldAnnounce(stream);

      if (!needsAnnouncement) return;

      // Record the session before sending to reduce duplicate pings
      // if the bot restarts during the announcement.
      await saveAnnouncedSession(stream);

      await announceLive(client, stream);

      console.log(
        `[Continental Wire] Announced Twitch stream ${stream.id}`
      );
    } catch (error) {
      console.error('[Continental Wire] Monitor error:', error);
    } finally {
      checking = false;
    }
  });

  return task;
}

export function stopContinentalWire() {
  task?.stop();
  task = null;
}

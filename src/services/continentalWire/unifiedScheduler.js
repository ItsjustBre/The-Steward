import cron from 'node-cron';

import { checkTwitchLive } from './twitchMonitor.js';
import { checkKickLive } from './kickMonitor.js';
import { checkYouTubeLive } from './youtubeMonitor.js';

import {
  getWireSession,
  saveWireSession
} from './sessionTracker.js';

import {
  sendLiveDispatch,
  editLiveDispatch
} from './announcementService.js';

const YOUTUBE_INTERVAL_MS = 30 * 60 * 1000;
const YOUTUBE_STALE_MS = 40 * 60 * 1000;
const OFFLINE_GRACE_MS = 10 * 60 * 1000;

const PLATFORM_NAMES = ['twitch', 'kick', 'youtube'];

let task = null;
let checking = false;

let lastYoutubeCheck = 0;
let youtubeSnapshot = { isLive: false };
let youtubeCheckedAt = 0;
let lastSnapshots = {};

function normalize(name, stream) {
  if (!stream?.isLive) {
    return { isLive: false };
  }

  const urls = {
    twitch: `https://www.twitch.tv/${process.env.TWITCH_CHANNEL || 'xobreyana'}`,
    kick: `https://kick.com/${process.env.KICK_CHANNEL || 'xobreyana'}`,
    youtube: 'https://www.youtube.com/channel/UCmDdXrIka9D0pY28HXc5urQ'
  };

  return {
    isLive: true,
    id: String(stream.id || ''),
    title: stream.title || 'Live with Don Bre',
    url: stream.url || urls[name],
    thumbnailUrl: stream.thumbnailUrl || null,
    startedAt: stream.startedAt || null
  };
}

function sameBroadcasts(a, b) {
  return PLATFORM_NAMES.every(name =>
    Boolean(a?.[name]?.isLive) === Boolean(b?.[name]?.isLive) &&
    (
      !a?.[name]?.isLive ||
      (
        a[name].id === b[name].id &&
        a[name].url === b[name].url &&
        a[name].title === b[name].title
      )
    )
  );
}

async function poll(name, fn) {
  try {
    const result = normalize(name, await fn());
    lastSnapshots[name] = result;
    return result;
  } catch (error) {
    console.error(
      `[Continental Wire] ${name} check failed:`,
      error
    );

    // API failures must not be treated as offline.
    return lastSnapshots[name] || { isLive: false };
  }
}

async function getSnapshots() {
  const now = Date.now();

  const [twitch, kick] = await Promise.all([
    poll('twitch', checkTwitchLive),
    poll('kick', checkKickLive)
  ]);

  if (
    !lastYoutubeCheck ||
    now - lastYoutubeCheck >= YOUTUBE_INTERVAL_MS
  ) {
    lastYoutubeCheck = now;

    try {
      youtubeSnapshot = normalize(
        'youtube',
        await checkYouTubeLive()
      );

      youtubeCheckedAt = now;
      lastSnapshots.youtube = youtubeSnapshot;
    } catch (error) {
      console.error(
        '[Continental Wire] youtube check failed:',
        error
      );
    }
  }

  // Expired YouTube data cannot keep a session alive.
  const youtube =
    now - youtubeCheckedAt <= YOUTUBE_STALE_MS
      ? youtubeSnapshot
      : { isLive: false };

  return { twitch, kick, youtube };
}

function isLive(platforms) {
  return PLATFORM_NAMES.some(
    name => platforms[name]?.isLive
  );
}

function anyNewStreamIds(current, previous) {
  return PLATFORM_NAMES.some(name =>
    current[name]?.isLive &&
    previous?.[name]?.isLive &&
    current[name].id &&
    previous[name].id &&
    current[name].id !== previous[name].id
  );
}

async function check(client) {
  if (checking || !client.isReady()) {
    return;
  }

  checking = true;

  try {
    const current = await getSnapshots();
    const now = Date.now();
    const existing = await getWireSession();

    // No platforms are live.
    if (!isLive(current)) {
      if (existing?.active && !existing.offlineSince) {
        await saveWireSession({
          ...existing,
          offlineSince: now
        });
      } else if (
        existing?.active &&
        now - existing.offlineSince >= OFFLINE_GRACE_MS
      ) {
        await saveWireSession({
          ...existing,
          active: false,
          endedAt: now
        });

        console.log(
          '[Continental Wire] Session ended'
        );
      }

      return;
    }

    const previous = existing?.platforms || {};

    const expired =
      existing?.offlineSince &&
      now - existing.offlineSince >= OFFLINE_GRACE_MS;

    const newSession =
      !existing?.active ||
      expired ||
      anyNewStreamIds(current, previous);

    if (newSession) {
      // Persist before sending to reduce duplicate pings.
      const pending = {
        active: true,
        status: 'pending',
        startedAt: now,
        offlineSince: null,
        messageId: null,
        platforms: current
      };

      await saveWireSession(pending);

      const message = await sendLiveDispatch(
        client,
        current
      );

      await saveWireSession({
        ...pending,
        status: 'sent',
        messageId: message.id
      });

      console.log(
        `[Continental Wire] Unified dispatch posted: ${message.id}`
      );

      return;
    }

    if (existing.status === 'pending') {
      // Do not retry an uncertain send automatically.
      console.error(
        '[Continental Wire] Pending dispatch detected. ' +
        'Manual reconciliation required before posting again.'
      );

      return;
    }

    if (!sameBroadcasts(current, previous)) {
      try {
        await editLiveDispatch(
          client,
          existing.messageId,
          current
        );

        console.log(
          '[Continental Wire] Unified dispatch updated'
        );
      } catch (error) {
        console.error(
          '[Continental Wire] Could not edit dispatch:',
          error
        );

        return;
      }
    }

    if (
      existing.offlineSince ||
      !sameBroadcasts(current, previous)
    ) {
      await saveWireSession({
        ...existing,
        offlineSince: null,
        platforms: current
      });
    }
  } catch (error) {
    console.error(
      '[Continental Wire] Unified scheduler error:',
      error
    );
  } finally {
    checking = false;
  }
}

export function startUnifiedContinentalWire(client) {
  if (task) {
    return task;
  }

  console.log(
    '[Continental Wire] Unified Twitch + Kick + YouTube monitor started'
  );

  task = cron.schedule(
    '*/2 * * * *',
    () => void check(client)
  );

  void check(client);

  return task;
}

export function stopUnifiedContinentalWire() {
  task?.stop();
  task = null;
}

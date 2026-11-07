import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { checkYouTubeLive } from './youtubeMonitor.js';

let task = null;
let checking = false;
let lastVideoId = null;

export function startYouTubeMonitor(client) {
  if (task) return;

  console.log('[Continental Wire] YouTube monitor started');

  async function check() {
    if (checking) return;
    checking = true;

    try {
      const stream = await checkYouTubeLive();

      if (!stream.isLive) {
        console.log('[Continental Wire] YouTube is offline');
        lastVideoId = null;
        return;
      }

      if (stream.id === lastVideoId) return;

      const channelId =
        process.env.CONTINENTAL_WIRE_CHANNEL_ID;

      const channel = await client.channels.fetch(channelId);

      if (!channel?.isTextBased()) {
        throw new Error('Invalid Discord announcement channel');
      }

      const embed = new EmbedBuilder()
        .setColor('#FF69B4')
        .setTitle('🔴 DON BRE IS LIVE ON YOUTUBE!')
        .setURL(stream.url)
        .setDescription(
          `🎮 **${stream.title}**\n\n` +
          `🏨 The Continental Wire has a new broadcast!\n\n` +
          `▶️ [Watch on YouTube](${stream.url})\n` +
          `🟣 [Twitch](https://twitch.tv/xobreyana)\n` +
          `🟢 [Kick](https://kick.com/xobreyana)\n` +
          `🎵 [TikTok](https://www.tiktok.com/@xobreyana/live)`
        )
        .setFooter({ text: 'The B Continental • The Syndicate' })
        .setTimestamp();

      if (stream.thumbnailUrl) {
        embed.setImage(stream.thumbnailUrl);
      }

      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

      lastVideoId = stream.id;

      console.log(
        `[Continental Wire] YouTube announcement sent: ${stream.id}`
      );
    } catch (error) {
      console.error(
        '[Continental Wire] YouTube monitor error:',
        error
      );
    } finally {
      checking = false;
    }
  }

  // YouTube search costs 100 quota units per request.
  // Every 30 minutes uses approximately 4,800 units/day.
  task = cron.schedule('*/30 * * * *', check);

  // Run the first check immediately.
  void check();
}

export function stopYouTubeMonitor() {
  task?.stop();
  task = null;
}

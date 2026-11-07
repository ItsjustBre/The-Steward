import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { checkKickLive } from './kickMonitor.js';

let task = null;
let checking = false;
let lastStreamId = null;

export function startKickMonitor(client) {
  if (task) return;

  console.log('[Continental Wire] Kick monitor started');

  async function check() {
    if (checking) return;
    checking = true;

    try {
      const stream = await checkKickLive();

      if (!stream.isLive) {
        console.log('[Continental Wire] Kick is offline');
        lastStreamId = null;
        return;
      }

      if (stream.id === lastStreamId) return;

      const channelId =
        process.env.CONTINENTAL_WIRE_CHANNEL_ID;

      if (!channelId) {
        throw new Error('Missing Continental Wire channel ID');
      }

      const channel = await client.channels.fetch(channelId);

      if (!channel?.isTextBased() ||
          typeof channel.send !== 'function') {
        throw new Error('Invalid Discord announcement channel');
      }

      const embed = new EmbedBuilder()
        .setColor('#53FC18')
        .setTitle('🔴 DON BRE IS LIVE ON KICK!')
        .setURL(stream.url)
        .setDescription(
          `🎮 **${stream.title}**\n\n` +
          `🏨 The Continental Wire has a new broadcast!\n\n` +
          `💚 [Watch on Kick](${stream.url})\n` +
          `🟣 [Twitch](https://twitch.tv/xobreyana)\n` +
          `▶️ [YouTube](https://www.youtube.com/channel/UCmDdXrIka9D0pY28HXc5urQ)\n` +
          `🎵 [TikTok](https://www.tiktok.com/@xobreyana/live)`
        )
        .setFooter({
          text: 'The B Continental • The Syndicate'
        })
        .setTimestamp();

      if (stream.thumbnailUrl) {
        embed.setImage(stream.thumbnailUrl);
      }

      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }
      });

      lastStreamId = stream.id;

      console.log(
        `[Continental Wire] Kick announcement sent: ${stream.id}`
      );
    } catch (error) {
      console.error(
        '[Continental Wire] Kick monitor error:',
        error
      );
    } finally {
      checking = false;
    }
  }

  task = cron.schedule('*/2 * * * *', check);

  void check();
}

export function stopKickMonitor() {
  task?.stop();
  task = null;
}

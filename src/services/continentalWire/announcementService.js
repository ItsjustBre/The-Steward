import { EmbedBuilder } from 'discord.js';

const CHANNEL_ID = process.env.CONTINENTAL_WIRE_CHANNEL_ID;
const ROLE_ID = process.env.CONTINENTAL_WIRE_ROLE_ID;

const STREAM_LINKS = {
  twitch: 'https://www.twitch.tv/xobreyana',
  kick: 'https://kick.com/xobreyana',
  youtube: process.env.CONTINENTAL_YOUTUBE_LIVE_URL,
  tiktok: 'https://www.tiktok.com/@xobreyana/live'
};

export async function announceLive(client, stream) {
  if (!CHANNEL_ID || !ROLE_ID) {
    throw new Error('Continental Wire Discord configuration missing');
  }

  const channel = await client.channels.fetch(CHANNEL_ID);

  if (!channel?.isTextBased() || !channel.send) {
    throw new Error('Continental Wire announcement channel unavailable');
  }

  const links = Object.entries(STREAM_LINKS)
    .filter(([, url]) => Boolean(url))
    .map(([platform, url]) => {
      const name = platform[0].toUpperCase() + platform.slice(1);
      return `[${name}](${url})`;
    })
    .join(' • ');

  const embed = new EmbedBuilder()
    .setColor(0xE91E63)
    .setTitle('🔴 THE DON IS LIVE!')
    .setDescription(
      '🏨 **Attention, Syndicate!**\n\n' +
      'Don Bre has officially entered the building.\n' +
      'The Continental is open for business!\n\n' +
      `🎮 **${stream.title || 'Live with Don Bre'}**\n\n` +
      `**Choose your destination:**\n${links}`
    )
    .setFooter({
      text: 'THE B CONTINENTAL • OFFICIAL LIVE DISPATCH 🗝️'
    })
    .setTimestamp();

  if (stream.thumbnailUrl) {
    embed.setImage(stream.thumbnailUrl);
  }

  return channel.send({
    content: `<@&${ROLE_ID}>`,
    allowedMentions: { roles: [ROLE_ID] },
    embeds: [embed]
  });
}

import { EmbedBuilder } from 'discord.js';

const CHANNEL_ID = () => process.env.CONTINENTAL_WIRE_CHANNEL_ID;
const ROLE_ID = () => process.env.CONTINENTAL_WIRE_ROLE_ID;

const FALLBACK_LINKS = {
  twitch: 'https://www.twitch.tv/xobreyana',
  kick: 'https://kick.com/xobreyana',
  youtube: 'https://www.youtube.com/channel/UCmDdXrIka9D0pY28HXc5urQ'
};

const NAMES = {
  twitch: '🟣 Twitch',
  kick: '🟢 Kick',
  youtube: '▶️ YouTube'
};

export function buildLiveEmbed(platforms) {
  const active = Object.entries(platforms).filter(
    ([, stream]) => stream?.isLive
  );

  const preferred = platforms.twitch?.isLive
    ? platforms.twitch
    : platforms.kick?.isLive
      ? platforms.kick
      : platforms.youtube;

  const links = active.map(([name, stream]) =>
    `[${NAMES[name]}](${stream.url || FALLBACK_LINKS[name]})`
  ).join(' • ');

  const embed = new EmbedBuilder()
    .setColor(0xE91E63)
    .setTitle('🔴 THE DON IS LIVE!')
    .setDescription(
      '🏨 **Attention, Syndicate!**\n\n' +
      'Don Bre has officially entered the building.\n' +
      'The Continental is open for business!\n\n' +
      `🎮 **${preferred?.title || 'Live with Don Bre'}**\n\n` +
      `**Watch live on:**\n${links}`
    )
    .setFooter({
      text: 'THE B CONTINENTAL • OFFICIAL LIVE DISPATCH 🗝️'
    })
    .setTimestamp();

  if (preferred?.thumbnailUrl) {
    embed.setImage(preferred.thumbnailUrl);
  }

  return embed;
}

async function getChannel(client) {
  const id = CHANNEL_ID();

  if (!id) {
    throw new Error('CONTINENTAL_WIRE_CHANNEL_ID missing');
  }

  const channel = await client.channels.fetch(id);

  if (!channel?.isTextBased() ||
      typeof channel.send !== 'function') {
    throw new Error('Continental Wire channel unavailable');
  }

  return channel;
}

export async function sendLiveDispatch(client, platforms) {
  const role = ROLE_ID();

  if (!role) {
    throw new Error('CONTINENTAL_WIRE_ROLE_ID missing');
  }

  const channel = await getChannel(client);

  return channel.send({
    content: `<@&${role}>`,
    embeds: [buildLiveEmbed(platforms)],
    allowedMentions: {
      parse: [],
      roles: [role]
    }
  });
}

export async function editLiveDispatch(
  client,
  messageId,
  platforms
) {
  const channel = await getChannel(client);
  const message = await channel.messages.fetch(messageId);

  return message.edit({
    embeds: [buildLiveEmbed(platforms)],
    allowedMentions: { parse: [] }
  });
}

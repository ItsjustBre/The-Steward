import { EmbedBuilder } from 'discord.js';

export async function testContinentalWire(client) {
  const channelId = process.env.CONTINENTAL_WIRE_CHANNEL_ID;

  if (!channelId) {
    console.error('[Continental Wire] Missing channel ID');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel?.isTextBased()) {
      throw new Error('Announcement channel is not text-based');
    }

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🏨 THE CONTINENTAL WIRE — TEST')
      .setDescription(
        '🗝️ **A message from The Steward**\n\n' +
        'The Continental Wire is being tested.\n\n' +
        '**Don Bre is currently offline.**\n\n' +
        '🎮 **Streaming Platforms**\n' +
        '🟣 [Twitch](https://www.twitch.tv/xobreyana)\n' +
        '🔴 [YouTube](https://www.youtube.com/@BreyanaPlaysGames/live)\n' +
        '🟢 [Kick](https://kick.com/xobreyana)\n' +
        '🎵 [TikTok](https://www.tiktok.com/@xobreyana/live)'
      )
      .setFooter({
        text: 'The B Continental • System Test • No notifications sent'
      })
      .setTimestamp();

    await channel.send({
      embeds: [embed],
      allowedMentions: { parse: [] }
    });

    console.log(
      '[Continental Wire] Test announcement sent successfully'
    );
  } catch (error) {
    console.error(
      '[Continental Wire] Test announcement failed:',
      error
    );
  }
}

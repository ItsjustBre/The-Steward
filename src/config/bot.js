// The Continental Concierge: a gracious host for The Syndicate.

mee6.settings({
  lobby: {
    type: 'channel',
    label: 'Welcome and check-in lounge',
    channelType: 'text',
    required: true,
    sample: 'general',
  },
  loyalty_step: {
    type: 'integer',
    label: 'Loyalty points between recognition tiers',
    default: 5,
    sample: 3,
  },
});

mee6.modal('hotel_checkin', {
  title: 'The Continental — Guest Check-in',
  fields: [
    {
      name: 'visit',
      type: 'radio',
      label: 'What brings you to The Syndicate?',
      options: ['Gaming', 'Beauty', 'Lifestyle', 'Good company'],
    },
    {
      name: 'request',
      label: 'A note for the concierge',
      description: 'Optional — tell us what you are looking forward to.',
      style: 'short',
      required: false,
      maxLength: 120,
    },
  ],
});

function loyaltyTier(points: number, step: number): string {
  const safeStep = Math.max(1, step || 5);
  const tier = Math.floor(Math.max(0, points) / safeStep);
  if (tier >= 3) return 'Esteemed Regular';
  if (tier === 2) return 'Valued Guest';
  if (tier === 1) return 'Known to the House';
  return 'New Arrival';
}

mee6.command(
  'hotel check-in',
  { description: 'Check in at The Continental', opens: 'hotel_checkin' }
);

mee6.command(
  'hotel concierge',
  {
    description: 'Ask the concierge for a community recommendation',
    options: [
      {
        name: 'interest',
        type: 'string',
        description: 'Choose your kind of evening',
        required: true,
        choices: [
          { name: 'Gaming', value: 'gaming' },
          { name: 'Beauty', value: 'beauty' },
          { name: 'Lifestyle', value: 'lifestyle' },
          { name: 'Meet the Syndicate', value: 'social' },
        ],
      },
    ],
  },
  async (ctx) => {
    const interest = ctx.option<string>('interest');
    const recommendations: Record<string, string> = {
      gaming: 'The gaming lounge is open. Bring your best strategy; the house appreciates good company.',
      beauty: 'The beauty suite is at your service. Trade a favorite find with the Syndicate; discretion is charming, but a good recommendation is better.',
      lifestyle: 'A little inspiration is in order. The lifestyle salon is where the Syndicate shares its finer discoveries.',
      social: 'The Syndicate is in good company tonight. Introduce yourself; the concierge assures you, the welcome is warmer than the handshake.',
    };
    await ctx.reply(recommendations[interest] ?? 'The concierge will be with you shortly.');
  }
);

mee6.command('hotel game', { description: 'Take on the concierge’s quick riddle' }, async (ctx) => {
  await ctx.reply({
    content: 'A guest arrives with no reservation, yet the house knows their name. What earned them entry?',
    buttons: [
      { label: 'A favor', customId: 'hotel_game:favor', style: 'primary' },
      { label: 'A coin', customId: 'hotel_game:coin', style: 'secondary' },
      { label: 'A good reputation', customId: 'hotel_game:reputation', style: 'success' },
      { label: 'A lucky guess', customId: 'hotel_game:guess', style: 'secondary' },
    ],
  });
});

mee6.command('hotel status', { description: 'See your standing with the house', ephemeral: true }, async (ctx) => {
  const points = await mee6.store.member(ctx.author.id).get<number>('hotel_loyalty', 0);
  const step = ctx.settings.loyalty_step ?? 5;
  await ctx.reply({
    embed: {
      title: 'The Continental — Guest Ledger',
      description: `${ctx.author.displayName}, the house remembers its friends.`,
      color: '#C8A96A',
      fields: [
        { name: 'Standing', value: loyaltyTier(points, step), inline: true },
        { name: 'Loyalty', value: `${points} point${points === 1 ? '' : 's'}`, inline: true },
        { name: 'Next recognition', value: `${step - (points % Math.max(1, step))} point(s)`, inline: true },
      ],
      footer: { text: 'The Syndicate • The Continental Concierge' },
    },
  });
});

mee6.on('member_join', async (ctx) => {
  const lobby = ctx.settings.lobby;
  if (!lobby) return;
  await ctx.send(lobby, {
    embed: {
      title: 'A new guest has arrived',
      description: `Welcome to The B Continental, ${ctx.author.mention}. The Syndicate is pleased to have you. Make yourself at home — the concierge is always at your service.`,
      color: '#C8A96A',
      footer: { text: 'The Continental Concierge' },
    },
  });
});

mee6.on('modal', async (ctx) => {
  if (ctx.customId !== 'hotel_checkin') return;
  const visit = String(ctx.fields.visit ?? 'Good company');
  const request = String(ctx.fields.request ?? '').trim();
  const member = mee6.store.member(ctx.author.id);
  const now = Date.now();
  const lastCheckin = await member.get<number>('hotel_checkin_at', 0);
  const day = 24 * 60 * 60 * 1000;

  if (now - lastCheckin < day) {
    const readyAt = lastCheckin + day;
    await ctx.reply({
      content: `You are already checked in, ${ctx.author.displayName}. The house will be delighted to welcome you again <t:${Math.floor(readyAt / 1000)}:R>.`,
      ephemeral: true,
    });
    return;
  }

  await member.set('hotel_checkin_at', now, { ttl: 86400 });
  await member.set('hotel_interest', visit);
  const points = await member.incr('hotel_loyalty', 1);
  const tier = loyaltyTier(points, ctx.settings.loyalty_step ?? 5);
  const note = request ? ` Your note is safely with the concierge: “${request}”` : '';
  await ctx.reply({
    content: `Welcome in, ${ctx.author.displayName}. Your check-in is complete — ${visit} it is. You have ${points} loyalty point${points === 1 ? '' : 's'} and are recognized as **${tier}**.${note}`,
    ephemeral: true,
  });
  if (ctx.settings.lobby) {
    await ctx.send(ctx.settings.lobby, `${ctx.author.mention} has checked in for **${visit}**. Please make them feel at home.`);
  }
});

mee6.on('button', async (ctx) => {
  if (!ctx.customId.startsWith('hotel_game:')) return;
  const choice = ctx.customId.slice('hotel_game:'.length);
  const claimed = await mee6.store.compareAndSet(
    `hotel_round_${ctx.message.id}`,
    null,
    ctx.author.id,
    { ttl: 3600 }
  );
  if (!claimed) {
    await ctx.reply({ content: 'This riddle has already been settled. The house keeps its word.', ephemeral: true });
    return;
  }

  if (choice === 'reputation') {
    const points = await mee6.store.member(ctx.author.id).incr('hotel_loyalty', 1);
    const tier = loyaltyTier(points, ctx.settings.loyalty_step ?? 5);
    await ctx.editOriginal({
      content: `Correct, ${ctx.author.displayName}. A good reputation opens doors before one even knocks. The house awards you 1 loyalty point — **${points}** total, ${tier}.`,
      buttons: [],
    });
  } else {
    await ctx.editOriginal({
      content: `Not this time, ${ctx.author.displayName}. At The Continental, a good reputation opens doors before one even knocks. The house appreciates your attempt.`,
      buttons: [],
    });
  }
});
The AI writes this code for you — review it here and ask for chang

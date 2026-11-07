const KICK_API = 'https://api.kick.com/public/v1';
const KICK_TOKEN_URL = 'https://id.kick.com/oauth/token';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getKickToken() {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      '[Continental Wire] Missing Kick client credentials'
    );
  }

  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await fetch(KICK_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!response.ok) {
    throw new Error(
      `Kick authentication failed: ${response.status} ` +
      (await response.text()).slice(0, 300)
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Kick did not return an access token');
  }

  cachedToken = data.access_token;
  tokenExpiresAt =
    Date.now() + (Number(data.expires_in) || 3600) * 1000;

  return cachedToken;
}

async function kickRequest(path, retry = true) {
  const token = await getKickToken();

  const response = await fetch(`${KICK_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  if (response.status === 401 && retry) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return kickRequest(path, false);
  }

  if (!response.ok) {
    throw new Error(
      `Kick API error ${response.status}: ` +
      (await response.text()).slice(0, 300)
    );
  }

  return response.json();
}

export async function checkKickLive() {
  const slug = process.env.KICK_CHANNEL || 'xobreyana';

  const channelResponse = await kickRequest(
    `/channels?slug=${encodeURIComponent(slug)}`
  );

  const channel = channelResponse.data?.find(
    item => item.slug?.toLowerCase() === slug.toLowerCase()
  );

  if (!channel) {
    throw new Error(`Kick channel not found: ${slug}`);
  }

  const livestream = channel.stream;

  if (!livestream?.is_live) {
    return { isLive: false };
  }

  return {
    isLive: true,
    id: String(livestream.id || channel.broadcaster_user_id),
    title: channel.stream_title || livestream.title ||
      `${slug} is live on Kick!`,
    url: `https://kick.com/${slug}`,
    thumbnailUrl: livestream.thumbnail?.url || null,
    startedAt: livestream.start_time || null
  };
}

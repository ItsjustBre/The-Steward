const TWITCH_API = 'https://api.twitch.tv/helix';
const TWITCH_AUTH = 'https://id.twitch.tv/oauth2/token';

let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Twitch API credentials are missing');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  });

  const response = await fetch(
    `${TWITCH_AUTH}?${params.toString()}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error(`Twitch authentication failed: ${response.status}`);
  }

  const data = await response.json();

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return accessToken;
}

export async function checkTwitchLive() {
  const token = await getAccessToken();
  const channel = process.env.TWITCH_CHANNEL || 'xobreyana';

  const response = await fetch(
    `${TWITCH_API}/streams?${new URLSearchParams({
      user_login: channel
    })}`,
    {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Twitch live check failed: ${response.status}`);
  }

  const data = await response.json();
  const stream = data.data?.[0];

  if (!stream) {
    return { isLive: false };
  }

  return {
    isLive: true,
    id: stream.id,
    title: stream.title,
    game: stream.game_name,
    startedAt: stream.started_at,
    thumbnailUrl: stream.thumbnail_url
      ?.replace('{width}', '1280')
      .replace('{height}', '720')
  };
}

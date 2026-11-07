const API_BASE = 'https://www.googleapis.com/youtube/v3';

export async function checkYouTubeLive() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = process.env.YOUTUBE_CHANNEL_ID;

  if (!apiKey || !channelId) {
    throw new Error(
      '[Continental Wire] Missing YouTube API credentials'
    );
  }

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    eventType: 'live',
    type: 'video',
    maxResults: '5',
    key: apiKey
  });

  const response = await fetch(
    `${API_BASE}/search?${params}`
  );

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `YouTube API error ${response.status}: ${details.slice(0, 300)}`
    );
  }

  const data = await response.json();
  const video = data.items?.find(
    item => item.id?.videoId
  );

  if (!video) {
    return { isLive: false };
  }

  return {
    isLive: true,
    id: video.id.videoId,
    title: video.snippet.title,
    channelTitle: video.snippet.channelTitle,
    thumbnailUrl: video.snippet.thumbnails?.high?.url,
    url: `https://www.youtube.com/watch?v=${video.id.videoId}`
  };
}

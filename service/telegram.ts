import fetch from 'node-fetch';

export async function broadcastArticleToChannel(text: string, linkPreviewUrl?: string) {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!telegramBotToken || !telegramChannelId) {
    throw new Error('Missing environment variable');
  }

  return fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: 'post',
    body: JSON.stringify({
      chat_id: telegramChannelId,
      ...(linkPreviewUrl ? {
        link_preview_options: {
          prefer_small_media: true,
          show_above_text: true,
          url: linkPreviewUrl,
        },
      } : {}),
      parse_mode: 'html',
      text,
    }),
    headers: {'Content-Type': 'application/json'}
  });
}

import { CloudTasksClient } from '@google-cloud/tasks';
import { ACTIONS } from '../constants';

const client = new CloudTasksClient({
  keyFilename: '/secret/service-account.json',
  projectId: process.env.GCP_PROJECT_ID,
});

export async function enqueueFetchArticleContentTask(articleLink: string, delay?: number) {
  const project = process.env.GCP_PROJECT_ID;
  const queue = process.env.GCP_CLOUDTASKS_QUEUE_NAME;
  const location = process.env.GCP_REGION;
  if (!project || !queue || !location) {
    throw new Error('Missing environment variable');
  }

  const url = `https://${location}-${project}.cloudfunctions.net/fetchArticleContent?action=${ACTIONS.FETCH_ARTICLE_CONTENT_AND_BROADCAST}&articleLink=${encodeURIComponent(articleLink)}`;
  const parent = client.queuePath(project, location, queue);

  return client.createTask({
    parent: parent,
    task: {
      httpRequest: {
        httpMethod: 'GET',
        url,
      },
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + (delay || 0),
      }
    },
  });
}

export async function enqueueBroadcastTask(text: string, linkPreviewUrl: string, delay?: number) {
  const project = process.env.GCP_PROJECT_ID;
  const queue = process.env.GCP_CLOUDTASKS_QUEUE_NAME;
  const location = process.env.GCP_REGION;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!project || !queue || !location || !telegramBotToken || !telegramChannelId) {
    throw new Error('Missing environment variable');
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const payload = JSON.stringify({
    chat_id: telegramChannelId,
    ...(linkPreviewUrl ? {
      link_preview_options: {
        prefer_small_media: true,
        show_above_text: true,
        url: linkPreviewUrl,
      },
    } : {}),
    parse_mode: 'html',
    text: text,
  });
  const parent = client.queuePath(project, location, queue);

  return client.createTask({
    parent: parent,
    task: {
      httpRequest: {
        body: Buffer.from(payload).toString('base64'),
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        url,
      },
      scheduleTime: {
        seconds: Math.floor(Date.now() / 1000) + (delay || 0),
      }
    },
  });
}
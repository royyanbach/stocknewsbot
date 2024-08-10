import { CloudTasksClient } from '@google-cloud/tasks';

const client = new CloudTasksClient({
  keyFilename: '/secret/service-account.json',
  projectId: process.env.GCP_PROJECT_ID,
});

export default async function enqueueBroadcastTask() {
  const project = process.env.GCP_PROJECT_ID;
  const queue = process.env.GCP_CLOUDTASKS_QUEUE_NAME;
  const location = process.env.GCP_REGION;
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!telegramBotToken) {
    throw new Error(' Missing TELEGRAM_BOT_TOKEN');
  }
  if (!project) {
    throw new Error(' Missing GCP_PROJECT_ID');
  }
  if (!queue) {
    throw new Error(' Missing GCP_CLOUDTASKS_QUEUE_NAME');
  }
  if (!location) {
    throw new Error(' Missing GCP_REGION');
  }

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const payload = JSON.stringify({
    chat_id: "-1002230742449",
    link_preview_options: {
      prefer_small_media: true,
      show_above_text: true,
      url: 'https://investor.id/market/369100/mengenal-berbagai-jenis-surat-utang-dan-sukuk',
    },
    parse_mode: 'html',
    text: "Isi berita\n\nSaran dll dll",
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
        seconds: Math.floor(Date.now() / 1000) + 0,
      }
    },
  });
}
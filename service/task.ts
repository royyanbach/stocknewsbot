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

  const url = `https://${location}-${project}.cloudfunctions.net/getAllStockNews?action=${ACTIONS.FETCH_ARTICLE_CONTENT_AND_BROADCAST}&articleLink=${encodeURIComponent(articleLink)}`;
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

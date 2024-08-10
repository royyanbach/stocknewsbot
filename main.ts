import * as functions from '@google-cloud/functions-framework';
import mongoDBClient, { saveArticles } from './service/mongodb';
import { fetchAllNewsByDateWithDetail } from './adapters/kontan';
import enqueueBroadcastTask from './service/task';

functions.http('getAllStockNews', async (req, res) => {
  try {
    const currentDate = new Date();
    const articles = await fetchAllNewsByDateWithDetail({
      date: currentDate.getDate(),
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
    });

    if (articles.newArticles.length) {
      await saveArticles(articles.newArticles);
      await Promise.all(articles.newArticles.map((article, index) => enqueueBroadcastTask(
        `<u>Ringkasan</u>\n\n${article.summary}\n\n<u>Insight</u>\n\n${article.insight}`,
        article.link,
        index,
      )));
    }

    res.send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Enable graceful stop
process.once('SIGINT', () => mongoDBClient.close());
process.once('SIGTERM', () => mongoDBClient.close());

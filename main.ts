import * as functions from '@google-cloud/functions-framework';
import pLimit from 'p-limit';
import { fetchAllTodayArticles, fetchArticleContent, fetchArticleContents } from './adapters';
import { ACTIONS, FETCH_CONTENT_CONCURRENCY } from './constants';
import { getNewsSummaryAndInsight } from './service/chatgpt';
import mongoDBClient, { getArticlesByLinks, saveArticles } from './service/mongodb';
import { enqueueBroadcastTask, enqueueFetchArticleContentTask } from './service/task';

const limit = pLimit(FETCH_CONTENT_CONCURRENCY);

async function fetchArticleContentAndBroadcast(articleLink?: string) {
  console.log('fetchArticleContentAndBroadcast', articleLink);
  if (!articleLink) {
    return;
  }

  const content = await fetchArticleContent(articleLink);

  if (!content) {
    return;
  }

  const summaryAndInsight = await getNewsSummaryAndInsight(content);

  if (!summaryAndInsight) {
    return;
  }

  console.log('summaryAndInsight', summaryAndInsight.insight.length);
  // await enqueueBroadcastTask(
  //   `<u>Ringkasan</u>\n\n${summaryAndInsight.summary}\n\n<u>Insight</u>\n\n${summaryAndInsight.insight}`,
  //   articleLink,
  // );
}


functions.http('getAllStockNews', async (req, res) => {
  const action = req.query.action || ACTIONS.FETCH_ALL_AND_BROADCAST;
  try {
    if (action === ACTIONS.FETCH_ALL_AND_BROADCAST) {
      const articles = await fetchAllTodayArticles();

      const foundArticles = await getArticlesByLinks(articles.map(article => article.link));
      const foundLinks = foundArticles.map(doc => doc.link);
      const newArticles = articles.filter(article => !foundLinks.includes(article.link));

      if (newArticles.length) {
        await Promise.all(
          newArticles.map(
            (article, index) => limit(
              async () => enqueueFetchArticleContentTask(article.link, index * 60)
            )
          )
        );

        await saveArticles(newArticles);
      }
      res.send('OK');
    }
    if (action === ACTIONS.FETCH_ARTICLE_CONTENT_AND_BROADCAST) {
      const articleLink = req.query.link as string | undefined;
      await fetchArticleContentAndBroadcast(articleLink);
      res.send('OK');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Enable graceful stop
process.once('SIGINT', () => mongoDBClient.close());
process.once('SIGTERM', () => mongoDBClient.close());

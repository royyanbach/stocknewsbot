import * as functions from '@google-cloud/functions-framework';
import pLimit from 'p-limit';
import { fetchAllTodayArticles, fetchArticleContents } from './adapters';
import { FETCH_CONTENT_CONCURRENCY } from './constants';
import { getNewsSummaryAndInsight } from './service/chatgpt';
import mongoDBClient, { getArticlesByLinks, saveArticles } from './service/mongodb';
import enqueueBroadcastTask from './service/task';

const limit = pLimit(FETCH_CONTENT_CONCURRENCY);

functions.http('getAllStockNews', async (req, res) => {
  try {
    const articles = await fetchAllTodayArticles();

    const foundArticles = await getArticlesByLinks(articles.map(article => article.link));
    const foundLinks = foundArticles.map(doc => doc.link);
    const newArticles = articles.filter(article => !foundLinks.includes(article.link));

    if (newArticles.length) {
      const articleContents = await fetchArticleContents(newArticles);

      const articleSummaries = await Promise.all(
        articleContents.map(
          (content) => limit(
            async () => getNewsSummaryAndInsight(content)
          )
        )
      );

      await Promise.all(articleSummaries.map((article, index) => {
        if (!article) {
          return;
        }

        return enqueueBroadcastTask(
          `<u>Ringkasan</u>\n\n${article.summary}\n\n<u>Insight</u>\n\n${article.insight}`,
          newArticles[index].link,
          index,
        )
      }));

      await saveArticles(newArticles);
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

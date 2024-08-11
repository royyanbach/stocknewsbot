import * as functions from '@google-cloud/functions-framework';
import mongoDBClient, { getArticlesByLinks, saveArticles } from './service/mongodb';
import {
  fetchNewsContent as fetchKontanNewsContent,
  fetchNewsList as fetchKontanNewsList,
} from './adapters/kontan';
import {
  fetchNewsContent as fetchInvestorNewsContent,
  fetchNewsList as fetchInvestorNewsList
} from './adapters/investor';
import enqueueBroadcastTask from './service/task';
import { getNewsSummaryAndInsight } from './service/chatgpt';
import { FETCH_CONTENT_CONCURRENCY, SOURCE } from './constants';
import pLimit from 'p-limit';

const limit = pLimit(FETCH_CONTENT_CONCURRENCY);

functions.http('getAllStockNews', async (req, res) => {
  try {
    const currentDate = new Date();
    const articles = await Object.keys(SOURCE).map((source) => limit(async () => {
        if (source === SOURCE.kontan) {
          return await fetchKontanNewsList({
            date: currentDate.getDate(),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear() });
        }
        if (source === SOURCE.investor) {
          return await fetchInvestorNewsList({
            date: currentDate.getDate(),
            month: currentDate.getMonth() + 1,
            year: currentDate.getFullYear() });
        }
        return [];
      })).reduce(async (acc, promise) => {
        return [...(await acc), ...(await promise)];
      }, Promise.resolve([]));

    const foundArticles = await getArticlesByLinks(articles.map(article => article.link));
    const foundLinks = foundArticles.map(doc => doc.link);
    const newArticles = articles.filter(article => !foundLinks.includes(article.link));

    if (newArticles.length) {
      const articleContents = await Promise.all(newArticles.map((article) => limit(async () => {
        if (article.source === 'kontan') {
          return fetchKontanNewsContent(article.link);
        }
        if (article.source === 'investor') {
          return fetchInvestorNewsContent(article.link);
        }
        return '';
      })));

      const articleSummaries = await Promise.all(articleContents.map((content) => limit(async () => getNewsSummaryAndInsight(content))));

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

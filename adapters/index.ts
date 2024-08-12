import pLimit from 'p-limit';
import {
  fetchNewsContent as fetchBisnisNewsContent,
  fetchNewsList as fetchBisnisNewsList,
} from './bisnis';
import {
  fetchNewsContent as fetchKontanNewsContent,
  fetchNewsList as fetchKontanNewsList,
} from './kontan';
import {
  fetchNewsContent as fetchInvestorNewsContent,
  fetchNewsList as fetchInvestorNewsList,
} from './investor';
import { FETCH_CONTENT_CONCURRENCY, SOURCE } from '../constants';
import { NewsItem } from '../constants/type';

const limit = pLimit(FETCH_CONTENT_CONCURRENCY);

export async function fetchAllTodayArticles() {
  const currentDate = new Date();
  const dateArgs = {
    date: currentDate.getDate(),
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear()
  };
  return Object.keys(SOURCE).map((source) => limit(async () => {
    if (source === SOURCE.bisnis) {
      return fetchBisnisNewsList(dateArgs);
    }
    if (source === SOURCE.investor) {
      return fetchInvestorNewsList(dateArgs);
    }
    if (source === SOURCE.kontan) {
      return fetchKontanNewsList(dateArgs);
    }
    return [];
  })).reduce(async (acc, promise) => {
    return [...(await acc), ...(await promise)];
  }, Promise.resolve([]));
}

export async function fetchArticleContent(link?: string) {
  if (!link) {
    return '';
  }

  if (link.includes('www.bisnis.com/')) {
    return fetchBisnisNewsContent(link);
  }
  if (link.includes('investor.id/')) {
    return fetchInvestorNewsContent(link);
  }
  if (link.includes('.kontan.co.id/')) {
    return fetchKontanNewsContent(link);
  }
  return '';
}

export async function fetchArticleContents(articles: NewsItem[]) {
  return Promise.all(articles.map((article) => limit(async () => {
    if (article.source === SOURCE.bisnis) {
      return fetchBisnisNewsContent(article.link);
    }
    if (article.source === SOURCE.investor) {
      return fetchInvestorNewsContent(article.link);
    }
    if (article.source === SOURCE.kontan) {
      return fetchKontanNewsContent(article.link);
    }
    return '';
  })));
}
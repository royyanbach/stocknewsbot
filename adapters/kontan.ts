import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import pLimit from 'p-limit';
import { getArticlesByLinks, saveArticles } from '../service/mongodb';
import { getNewsSummaryAndInsight } from '../service/chatgpt';
import { padNumberToString } from '../utils';

const ITEMS_PER_PAGE = 20;
const CONCURRENCY = 5;
const SOURCE = 'kontan';

const limit = pLimit(CONCURRENCY);

export async function fetchNewsContent(link: string) {
  try {
    const response = await fetch(link);
    const body = await response.text();
    const root = parse(body);
    const articleBody = root.querySelectorAll('[itemprop="articleBody"] p');

    if (!articleBody.length) {
      throw new Error('No data found');
    }

    return articleBody.filter((item) => {
      if (!item.text.trim()) return false;
      if (item.querySelector('.track-selanjutnya')) return false;
      if (item.querySelector('.track-menarikdibaca')) return false;
      if (item.querySelector('.track-gnews')) return false;
      return true;
    }).map((item) => item.text.trim()).join(' ');
  } catch (error) {
    console.error(error);
    return '';
  }
}

type NewsItem = {
  crawledAt: Date;
  link: string;
  source: string;
  totalPage: number;
  title: string;
};

export async function fetchNewsList({
  date: _date,
  month: _month,
  year,
  page,
}: {
  date: number;
  month: number;
  year: number;
  page: number;
}): Promise<NewsItem[]> {
  let list: NewsItem[] = [];
  try {
    const date = padNumberToString(_date);
    const month = padNumberToString(_month);
    const offset = (page - 1) * ITEMS_PER_PAGE;
    const offsetParam = offset ? `&per_page=${offset}` : '';
    const response = await fetch(`https://www.kontan.co.id/search/indeks?kanal=investasi&tanggal=${date}&bulan=${month}&tahun=${year}&pos=indeks${offsetParam}`);

    const body = await response.text();
    const root = parse(body);
    const articles = root.querySelectorAll('.list-berita ul li h1 a');

    if (!articles.length) {
      throw new Error('No data found');
    }

    const navigations = root.querySelectorAll('.cd-pagination li a');
    const numberedNavigations = navigations.filter((item) => !isNaN(parseInt(item.text, 10)));

    return articles.map((item) => ({
      crawledAt: new Date(),
      link: item.getAttribute('href') || '',
      source: SOURCE,
      totalPage: numberedNavigations.length || 1,
      title: item.text,
    }));
  } catch (error) {
    console.error(error);
    return list;
  }
}

export async function fetchAllNewsByDate({
  date,
  month,
  year,
}: {
  date: number;
  month: number;
  year: number;
}): Promise<NewsItem[]> {
  let list: NewsItem[] = [];
  try {
    const response = await fetchNewsList({
      date,
      month,
      year,
      page: 1,
    });

    list = response;
    const totalPage = response[0].totalPage;

    for (let i = 2; i <= totalPage; i += 1) {
      const response = await fetchNewsList({
        date,
        month,
        year,
        page: i,
      });

      list = list.concat(response);
    }

    return list;
  } catch (error) {
    console.error(error);
    return list;
  }
}

type NewsItemWithDetail = Omit<NewsItem & {
  insight: string;
  summary: string;
}, 'title' | 'totalPage'>;

export async function fetchAllNewsByDateWithDetail({
  date,
  month,
  year,
}: {
  date: number;
  month: number;
  year: number;
}) {
  let list: NewsItemWithDetail[] = [];
  try {
    const response = await fetchAllNewsByDate({
      date,
      month,
      year,
    });

    const itemLinks = response.map((item) => item.link);
    const foundArticles = await getArticlesByLinks(itemLinks);
    const foundLinks = foundArticles.map(doc => doc.link);
    const nonExistingResponse = response.filter(_res => !foundLinks.includes(_res.link));

    const nonExistingNewsDetails = await Promise.all(
      nonExistingResponse.map((item) => limit(async () => {
        const url = new URL(item.link);
        const page = 'all';
        url.searchParams.set('page', page);
        const newsContent = await fetchNewsContent(`${url.toString()}`);
        const summaryAndInsight = await getNewsSummaryAndInsight(newsContent);
        return summaryAndInsight;
      }))
    );

    const nonExistingNewsResponseWithDetails = nonExistingNewsDetails.reduce((acc, newsDetails, index) => {
      if (!newsDetails) {
        return acc;
      }

      // Omit totalPage from response
      const { title, totalPage, ...responseItem } = nonExistingResponse[index];
      return [
        ...acc,
        {
          ...responseItem,
          insight: newsDetails.insight,
          summary: newsDetails.summary,
        },
      ];
    }, [] as NewsItemWithDetail[]);

    saveArticles(nonExistingNewsResponseWithDetails);

    return [
      ...foundArticles.map(({ _id, ...doc }) => ({ ...doc })),
      ...nonExistingNewsResponseWithDetails,
    ];
  } catch (error) {
    console.error(error);
    return list;
  }
}

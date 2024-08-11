import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import { SOURCE } from '../constants';
import type { NewsItem } from '../constants/type';
import { padNumberToString } from '../utils';

const ITEMS_PER_PAGE = 20;

export async function fetchNewsContent(link?: string): Promise<string> {
  if (!link) {
    return '';
  }

  try {
    const url = new URL(link);
    const page = 'all';
    url.searchParams.set('page', page);
    const response = await fetch(url);
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

export async function fetchNewsList({
  date: _date,
  month: _month,
  year,
  page = 1,
  previousArticles = [],
}: {
  date: number;
  month: number;
  year: number;
  page?: number;
  previousArticles?: NewsItem[];
}): Promise<NewsItem[]> {
  let articles: NewsItem[] = [];
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
    const totalPage = numberedNavigations.length || 1;

    const newArticles = [
      ...previousArticles,
      ...articles.map((item) => ({
        crawledAt: new Date(),
        link: item.getAttribute('href') || '',
        source: SOURCE.kontan,
      })),
    ];

    if (page < totalPage) {
      return fetchNewsList({
        date: _date,
        month: _month,
        year,
        page: page + 1,
        previousArticles: newArticles,
      });
    } else {
      return newArticles;
    }
  } catch (error) {
    console.error(error);
    return articles;
  }
}

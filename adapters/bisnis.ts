import fetch, { FormData } from 'node-fetch';
import { parse } from 'node-html-parser';
import { SOURCE } from '../constants';
import { MONTHS } from '../constants/date';
import type { NewsItem } from '../constants/type';
import { padNumberToString } from '../utils';

export async function fetchNewsContent(link?: string): Promise<string> {
  if (!link) {
    return '';
  }

  console.log('fetching', link);
  try {
    const response = await fetch(link);
    const body = await response.text();
    const root = parse(body);
    const articleBody = root.querySelectorAll('.detailsContent:first-of-type p');

    if (!articleBody.length) {
      throw new Error('No data found');
    }

    return articleBody.filter((item) => {
      const text = item.text.trim();
      if (!text) return false;
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
}) {
  try {
    const date = padNumberToString(_date);
    const month = padNumberToString(_month);
    const formData = new FormData();
    formData.append('idxmenu', '/market/indeks');
    formData.append('date', `${year}-${month}-${date}`);
    formData.append('tanggal', `${date} ${MONTHS[_month]} ${year}`);
    const response = await fetch(`https://www.bisnis.com/index?c=194&d=${year}-${month}-${date}&per_page=${page}`, { method: 'GET' });
    const body = await response.text();
    const root = parse(body);
    const articles = root.querySelectorAll('.list-news li a .img-responsive').map((img) => {
      const parentLink = img.parentNode;
      return parentLink.querySelector('.label-premium') ? '' : (parentLink.getAttribute('href') || '');
    });
    const shouldContinueToNextPage = !!root.querySelector('.page-indeks li a[rel="next"]');

    const newArticles = [
      ...previousArticles,
      ...articles.map((link) => ({
        crawledAt: new Date(),
        link,
        source: SOURCE.bisnis,
      })),
    ].filter((article) => article.link);

    if (shouldContinueToNextPage) {
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
    return [];
  }
}
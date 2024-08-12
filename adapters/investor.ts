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
    const articleBody = root.querySelectorAll('.body-content p');

    if (!articleBody.length) {
      throw new Error('No data found');
    }

    return articleBody.filter((item) => {
      const text = item.text.trim();
      if (!text) return false;
      if (text.includes('Editor:') && item.querySelector('a')) return false;
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
    const response = await fetch(`https://investor.id/market/indeks/${page}`, { method: 'POST', body: formData });
    const body = await response.text();
    const root = parse(body);
    const articles = root.querySelectorAll('main .col:first-child .stretched-link').map((item) => {
      const href = item.getAttribute('href');
      if (href) {
        return `https://investor.id/${href}/all`;
      }
      return '';
    });
    const totalPage = root.querySelectorAll('ul.pagination .page-item:not(.disabled)').length;

    const newArticles = [
      ...previousArticles,
      ...articles.map((link) => ({
        crawledAt: new Date(),
        link,
        source: SOURCE.investor,
      })),
    ].filter((article) => article.link);

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
    return [];
  }
}
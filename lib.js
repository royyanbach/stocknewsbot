import fetch from 'node-fetch';
import { parse } from 'node-html-parser';
import pLimit from 'p-limit';
import { padNumberToString } from './utils.js';

const ITEMS_PER_PAGE = 20;
const CONCURRENCY = 5;

const limit = pLimit(CONCURRENCY);

export async function fetchNewsDetail(link) {
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
    return {
      title: '',
      content: '',
    };
  }
}

export async function fetchNewsList({
  date: _date,
  month: _month,
  year,
  page,
}) {
  let list = [];
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
      link: item.getAttribute('href'),
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
}) {
  let list = [];
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

export async function fetchAllNewsByDateWithDetail({
  date,
  month,
  year,
}) {
  let list = [];
  try {
    const response = await fetchAllNewsByDate({
      date,
      month,
      year,
    });

    list = await Promise.all(
      response.map((item) => limit(() => {
        const url = new URL(item.link);
        const page = 'all';
        url.searchParams.set('page', page);
        return fetchNewsDetail(`${url.toString()}`)
      }))
    );

    return list.map((item, index) => ({
      ...response[index],
      content: item,
    }));
  } catch (error) {
    console.error(error);
    return list;
  }
}

import { subDays } from "date-fns";
import { MongoClient, ServerApiVersion } from 'mongodb';
import { NewsItem } from '../constants/type';

const URI = process.env.MONGODB_ADDRESS as string;
const DB = 'stock-news';
const COLLECTIONS = {
  ARTICLES: 'articles',
} as const;

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function deletePastArticles() {
  const db = client.db(DB);
  const collection = db.collection(COLLECTIONS.ARTICLES);
  const resp = await collection.deleteMany({
    crawledAt: {
      $lt: subDays(new Date(), 1),
    },
  });
  console.log('Deleted', resp.deletedCount, 'articles');
}

export async function getArticlesByLinks(links: string[]) {
  const db = client.db(DB);
  const collection = db.collection(COLLECTIONS.ARTICLES);
  const articles = await collection.find({ link: { $in: links } }).toArray();
  return articles;
}

export async function saveArticles(articles: NewsItem[]) {
  if (articles.length) {
    const db = client.db(DB);
    const collection = db.collection(COLLECTIONS.ARTICLES);
    await collection.insertMany(articles);
  }
}

export default client;

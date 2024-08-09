import { MongoClient, ServerApiVersion } from 'mongodb';

const URI = process.env.MONGODB_ADDRESS as string;
const DB = 'stock-news';
const COLLECTIONS = {
  ARTICLES: 'articles',
};

const client = new MongoClient(URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

export async function getArticlesByLinks(links: string[]) {
  const db = client.db(DB);
  const collection = db.collection(COLLECTIONS.ARTICLES);
  const articles = await collection.find({ link: { $in: links } }).toArray();
  return articles;
}

type article = {
  crawledAt: Date;
  link: string;
  insight: string;
  source: string;
  summary: string;
};

export async function saveArticles(articles: article[]) {
  if (articles.length) {
    const db = client.db(DB);
    const collection = db.collection(COLLECTIONS.ARTICLES);
    await collection.insertMany(articles);
  }
}

export default client;

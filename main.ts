import * as functions from '@google-cloud/functions-framework';
import mongoDBClient from './service/mongodb';
import { fetchAllNewsByDateWithDetail } from './adapters/kontan';

functions.http('getAllStockNews', async (req, res) => {
  try {
    const currentDate = new Date();
    const news = await fetchAllNewsByDateWithDetail({
      // date: currentDate.getDate(),
      date: 4,
      month: currentDate.getMonth() + 1,
      year: currentDate.getFullYear(),
    });

    // res.send(`Hello ${req.query.name || req.body.name || 'World'}!`);
    res.send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Enable graceful stop
process.once('SIGINT', () => mongoDBClient.close());
process.once('SIGTERM', () => mongoDBClient.close());

import { SOURCE } from './';

export type NewsItem = {
  crawledAt: Date;
  link: string;
  source: typeof SOURCE[keyof typeof SOURCE];
};

export const FETCH_CONTENT_CONCURRENCY = 1;

export const SOURCE = {
  bisnis: 'bisnis',
  investor: 'investor',
  kontan: 'kontan',
  // okezone: 'okezone',
  // reuters: 'reuters',
  // yahoo: 'yahoo',
} as const;

export const ACTIONS = {
  FETCH_ALL_AND_BROADCAST: 'FETCH_ALL_AND_BROADCAST',
  FETCH_ARTICLE_CONTENT_AND_BROADCAST: 'FETCH_ARTICLE_CONTENT_AND_BROADCAST',
} as const;

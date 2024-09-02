import OpenAI from 'openai';

const openai = new OpenAI();

export async function getNewsSummaryAndInsight(newsContent: string): Promise<{
  summary: string;
  insight: string;
} | undefined> {
  if (!newsContent) {
    return;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert financial analyst specializing in stock markets. First, determine if the given news is directly related to stock investing. If it's about non-stock topics like gold, cryptocurrencies, or other unrelated subjects, return empty strings for both summary and insight.

For stock-related news only, provide:
1. A concise summary in Indonesian, focusing on key points relevant to stock investors.
2. An insightful analysis in English of potential stock market impacts, considering:
   - Short-term and long-term effects on relevant stocks or sectors
   - Possible ripple effects on related industries
   - Implications for broader stock market trends
3. Strategic recommendations for stock investors, such as:
   - Potential stock investment opportunities or risks
   - Suggested stock portfolio adjustments
   - Areas in the stock market to monitor for further developments

Format your response as a JSON object: { "summary": "<Indonesian summary or empty string>", "insight": "<English analysis and recommendations or empty string>" }`,
      },
      {
        role: 'user',
        content: newsContent,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const responseMessage = response?.choices?.[0]?.message?.content;

  return responseMessage ? JSON.parse(responseMessage) : undefined;
}
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
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `As a useful investor advisor, summarize this news for me in Indonesian language. Do it in one paragrah only. Then, give me suggestion or insight about the effect to me as an investor. Then, format it into the following JSON structure: { 'summary': <string>, 'insight': <string> };`,
      },
      {
        role: 'user',
        content: newsContent,
      },
    ],
    response_format: {
      'type': 'json_object'
    },
  });

  const responseMessage = response?.choices?.[0]?.message?.content;

  return responseMessage ? JSON.parse(responseMessage) : undefined;
}
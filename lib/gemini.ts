import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('GEMINI_API_KEY is not set. AI summaries will be disabled.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateSummary(
  title: string,
  context?: string
): Promise<string | null> {
  if (!genAI) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
다음 트렌드 키워드/주제에 대해 왜 화제인지 한 줄로 요약해주세요.
- 30자 이내로 간결하게
- 핵심 포인트만 전달
- 이모지 사용 가능 (1개 이하)
- 한국어로 작성

키워드: ${title}
${context ? `추가 정보: ${context}` : ''}

요약:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    return text || null;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

export async function generateBatchSummaries(
  items: { title: string; context?: string }[]
): Promise<(string | null)[]> {
  // 병렬 처리 (최대 5개씩)
  const results: (string | null)[] = [];
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item) => generateSummary(item.title, item.context))
    );
    results.push(...batchResults);
  }

  return results;
}

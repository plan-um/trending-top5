import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TrendingKeyword {
  rank: number;
  title: string;
  link: string;
  traffic?: string;
  relatedQueries?: string[];
  description?: string;
}

const parser = new Parser();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Google News RSS (한국)
const GOOGLE_NEWS_RSS = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

// 추가 뉴스 소스
const NEWS_SOURCES = [
  GOOGLE_NEWS_RSS,
  'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko', // 헤드라인
];

export async function fetchTrendingKeywords(limit: number = 10): Promise<TrendingKeyword[]> {
  try {
    // 1. 뉴스 헤드라인 수집
    const headlines = await fetchNewsHeadlines(30);

    if (headlines.length === 0) {
      console.log('No headlines fetched, using fallback');
      return getFallbackKeywords();
    }

    // 2. Gemini로 주요 토픽 추출
    const topics = await extractTopicsWithGemini(headlines);

    if (topics.length === 0) {
      console.log('No topics extracted, using headline-based fallback');
      return extractTopicsFromHeadlines(headlines, limit);
    }

    return topics.slice(0, limit);
  } catch (error) {
    console.error('Error fetching trending keywords:', error);
    return getFallbackKeywords();
  }
}

// 뉴스 헤드라인 수집
async function fetchNewsHeadlines(count: number): Promise<{ title: string; link: string; snippet: string }[]> {
  const headlines: { title: string; link: string; snippet: string }[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      const feed = await parser.parseURL(source);
      for (const item of feed.items) {
        if (item.title && headlines.length < count) {
          headlines.push({
            title: cleanTitle(item.title),
            link: item.link || '',
            snippet: item.contentSnippet || item.content || '',
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch from ${source}:`, error);
    }
  }

  return headlines;
}

// Gemini AI로 주요 토픽 추출 - 원본 링크와 본문 스니펫 사용
async function extractTopicsWithGemini(
  headlines: { title: string; link: string; snippet: string }[]
): Promise<TrendingKeyword[]> {
  if (!genAI) {
    console.log('Gemini API not available');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const headlineText = headlines.map((h, i) => `${i}. ${h.title}`).join('\n');

    const prompt = `
다음은 현재 한국 뉴스 헤드라인들입니다. 이 중에서 가장 화제가 되고 있는 핵심 토픽 10개를 선정해주세요.
각 토픽에 대해 관련된 헤드라인의 인덱스 번호를 정확히 매칭해주세요.

규칙:
1. 구체적인 인물명, 사건명, 현상으로 추출
2. 같은 주제의 뉴스가 여러 개면 가장 대표적인 것 하나 선택
3. 인덱스는 정확히 해당 뉴스의 번호를 사용

헤드라인:
${headlineText}

JSON 형식으로만 응답:
[
  {"topic": "토픽명", "headlineIndex": 0},
  ...
]
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Failed to parse Gemini response:', text);
      return [];
    }

    const topics = JSON.parse(jsonMatch[0]) as {
      topic: string;
      headlineIndex: number;
    }[];

    return topics.map((t, index) => {
      // 원본 헤드라인에서 링크와 스니펫 가져오기
      const headline = headlines[t.headlineIndex] || headlines[0];

      return {
        rank: index + 1,
        title: t.topic,
        link: headline.link, // 원본 링크 사용
        traffic: '화제',
        description: cleanSnippet(headline.snippet), // 원본 스니펫 사용
        relatedQueries: [],
      };
    });
  } catch (error) {
    console.error('Gemini topic extraction error:', error);
    return [];
  }
}

// 스니펫 정리
function cleanSnippet(snippet: string): string {
  if (!snippet) return '';
  return snippet
    .replace(/<[^>]*>/g, '') // HTML 태그 제거
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .slice(0, 100) // 100자로 제한
    .trim();
}

// Gemini 없을 때 헤드라인 기반 추출 (개선된 버전)
function extractTopicsFromHeadlines(
  headlines: { title: string; link: string }[],
  limit: number
): TrendingKeyword[] {
  // 헤드라인 그대로 사용하되, 중복 제거 및 정리
  const seen = new Set<string>();
  const results: TrendingKeyword[] = [];

  for (const headline of headlines) {
    // 핵심 키워드 추출 (따옴표 안의 내용 또는 첫 번째 주요 구문)
    const topic = extractCoreTopic(headline.title);

    if (topic && !seen.has(topic.toLowerCase()) && results.length < limit) {
      seen.add(topic.toLowerCase());
      results.push({
        rank: results.length + 1,
        title: topic,
        link: headline.link,
        traffic: '뉴스',
      });
    }
  }

  return results;
}

// 헤드라인에서 핵심 토픽 추출
function extractCoreTopic(title: string): string {
  // 따옴표 안의 내용 우선
  const quoted = title.match(/['""]([^'""]+)['""]|'([^']+)'/);
  if (quoted) {
    return quoted[1] || quoted[2];
  }

  // "..." 형태의 인용구
  const ellipsis = title.match(/["']?([^…]+)…/);
  if (ellipsis && ellipsis[1].length > 5) {
    return ellipsis[1].trim();
  }

  // 첫 번째 구문 (쉼표나 마침표 전)
  const firstPart = title.split(/[,\.…·\|]/)[0].trim();
  if (firstPart.length > 3 && firstPart.length < 30) {
    return firstPart;
  }

  return title.slice(0, 25);
}

// 제목 정리
function cleanTitle(title: string): string {
  return title
    .split(' - ')[0] // 언론사 제거
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '') // [속보] 등 제거
    .replace(/\(.*?\)/g, '') // (종합) 등 제거
    .trim();
}

// 폴백 데이터
function getFallbackKeywords(): TrendingKeyword[] {
  return [
    {
      rank: 1,
      title: '트렌드 데이터 로딩 중',
      link: 'https://trends.google.com/trends/?geo=KR',
      traffic: '-',
      description: '잠시 후 다시 시도해주세요',
    },
  ];
}

// 기존 함수 호환성 유지
export async function fetchTrendingKeywordsWithDetails(
  limit: number = 5
): Promise<TrendingKeyword[]> {
  return fetchTrendingKeywords(limit);
}

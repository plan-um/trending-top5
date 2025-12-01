import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface ShoppingItem {
  rank: number;
  title: string;
  link: string;
  price?: string;
  thumbnail?: string;
  sourceName: string;
  description?: string;
}

const parser = new Parser();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 쇼핑 관련 뉴스/트렌드 RSS - 구체적인 상품명이 나오는 검색어로 변경
const SHOPPING_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=%ED%92%88%EC%A0%88%EB%8C%80%EB%9E%80+OR+%EC%99%84%ED%8C%90+OR+%EB%A7%A4%EC%A7%84+OR+%ED%95%AB%ED%95%9C&hl=ko&gl=KR&ceid=KR:ko',
    name: '품절대란',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EC%95%84%EC%9D%B4%ED%8F%B0+OR+%EA%B0%A4%EB%9F%AD%EC%8B%9C+OR+%EB%A7%A5%EB%B6%81+OR+%EC%97%90%EC%96%B4%ED%8C%9F+%ED%95%A0%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko',
    name: '전자기기',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EB%AC%B4%EC%8B%A0%EC%82%AC+%EB%9E%AD%ED%82%B9+OR+%EC%98%AC%EB%A6%AC%EB%B8%8C%EC%98%81+OR+%EB%82%98%EC%9D%B4%ED%82%A4+OR+%EC%95%84%EB%94%94%EB%8B%A4%EC%8A%A4+%EC%9D%B8%EA%B8%B0&hl=ko&gl=KR&ceid=KR:ko',
    name: '패션',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EB%8B%A4%EC%9D%B4%EC%86%90+%EC%97%90%EC%96%B4%EB%9E%A9+OR+%EC%82%BC%EC%84%B1+%EA%B0%80%EC%A0%84+OR+LG+%EA%B0%80%EC%A0%84+%ED%95%A0%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko',
    name: '가전',
  },
];

export async function fetchShoppingTrends(limit: number = 10): Promise<ShoppingItem[]> {
  try {
    // 1. 여러 소스에서 쇼핑 관련 뉴스 수집
    const allItems = await fetchFromSources();

    if (allItems.length === 0) {
      console.log('No shopping items fetched');
      return getMockShoppingTrends();
    }

    // 2. Gemini로 인기 상품/트렌드 추출
    const shoppingTrends = await extractShoppingTrendsWithGemini(allItems);

    if (shoppingTrends.length > 0) {
      return shoppingTrends.slice(0, limit);
    }

    // 3. Gemini 실패시 기본 추출
    return extractBestItems(allItems, limit);
  } catch (error) {
    console.error('Error fetching shopping trends:', error);
    return getMockShoppingTrends();
  }
}

async function fetchFromSources(): Promise<{ title: string; link: string; source: string; snippet: string }[]> {
  const items: { title: string; link: string; source: string; snippet: string }[] = [];

  for (const source of SHOPPING_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items.slice(0, 20)) {
        if (item.title) {
          items.push({
            title: cleanTitle(item.title),
            link: item.link || '',
            source: source.name,
            snippet: item.contentSnippet || item.content || '',
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error);
    }
  }

  return items;
}

async function extractShoppingTrendsWithGemini(
  items: { title: string; link: string; source: string; snippet: string }[]
): Promise<ShoppingItem[]> {
  if (!genAI) {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const itemsText = items.map((item, i) => `${i}. ${item.title}`).join('\n');

    const prompt = `
다음은 한국의 쇼핑/상품 관련 뉴스입니다.
화제가 되고 있는 상품 10개를 선정하고, 각 상품의 뉴스 인덱스를 정확히 매칭해주세요.

규칙:
1. 구체적인 상품명 포함 (브랜드 + 제품명)
2. 인덱스는 정확히 해당 뉴스의 번호를 사용

뉴스 목록:
${itemsText}

JSON 형식으로만 응답:
[
  {"product": "상품명", "itemIndex": 0, "price": "가격(있으면)", "store": "판매처"},
  ...
]
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text().trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const products = JSON.parse(jsonMatch[0]) as {
      product: string;
      itemIndex: number;
      price?: string;
      store: string;
    }[];

    return products.map((p, index) => {
      // 원본 아이템에서 링크와 스니펫 가져오기
      const item = items[p.itemIndex] || items[0];

      return {
        rank: index + 1,
        title: p.product,
        link: item.link, // 원본 링크 사용
        price: p.price,
        description: cleanSnippet(item.snippet), // 원본 스니펫 사용
        sourceName: p.store || item.source,
      };
    });
  } catch (error) {
    console.error('Gemini shopping extraction error:', error);
    return [];
  }
}

// 스니펫 정리
function cleanSnippet(snippet: string): string {
  if (!snippet) return '';
  return snippet
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .slice(0, 80)
    .trim();
}

function extractBestItems(
  items: { title: string; link: string; source: string }[],
  limit: number
): ShoppingItem[] {
  const shoppingKeywords = ['쿠팡', '네이버', '베스트', '인기', '품절', '핫딜', '할인', '세일', '최저가'];

  const scored = items.map(item => {
    let score = 0;
    for (const keyword of shoppingKeywords) {
      if (item.title.includes(keyword)) score += 2;
    }
    return { ...item, score };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: ShoppingItem[] = [];

  for (const item of sorted) {
    const key = item.title.slice(0, 15).toLowerCase();
    if (!seen.has(key) && results.length < limit) {
      seen.add(key);

      // 제목에서 상품명 추출
      const productName = extractProductName(item.title);
      const searchLink = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(productName)}`;

      results.push({
        rank: results.length + 1,
        title: productName,
        link: searchLink,
        sourceName: '쇼핑',
      });
    }
  }

  return results;
}

function extractProductName(title: string): string {
  // 따옴표 안의 내용 우선
  const quoted = title.match(/['""]([^'""]+)['""]|'([^']+)'/);
  if (quoted) {
    return quoted[1] || quoted[2];
  }

  // 브랜드명 추출 시도
  const cleaned = title
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .split(/[,\.…·\|]/)[0]
    .trim();

  return cleaned.slice(0, 30);
}

function cleanTitle(title: string): string {
  return title
    .split(' - ')[0]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getMockShoppingTrends(): ShoppingItem[] {
  return [
    {
      rank: 1,
      title: '쇼핑 트렌드 로딩 중',
      link: 'https://shopping.naver.com',
      description: '잠시 후 다시 시도해주세요',
      sourceName: 'System',
    },
  ];
}

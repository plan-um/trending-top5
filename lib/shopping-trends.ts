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

// 쇼핑몰별 검색 링크 생성 함수들 (네이버 쇼핑 제외 - 봇 차단됨)
const SHOPPING_LINKS = {
  // 쿠팡 - 가장 안정적 (기본값)
  coupang: (keyword: string) =>
    `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}&channel=user`,

  // 11번가
  st11: (keyword: string) =>
    `https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(keyword)}`,

  // G마켓
  gmarket: (keyword: string) =>
    `https://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(keyword)}`,

  // SSG (신세계)
  ssg: (keyword: string) =>
    `https://www.ssg.com/search.ssg?target=all&query=${encodeURIComponent(keyword)}`,

  // 롯데ON
  lotteon: (keyword: string) =>
    `https://www.lotteon.com/search/search/search.ecn?render=search&platform=pc&q=${encodeURIComponent(keyword)}`,

  // 무신사 (패션)
  musinsa: (keyword: string) =>
    `https://www.musinsa.com/search/musinsa/goods?q=${encodeURIComponent(keyword)}`,

  // 올리브영 (뷰티)
  oliveyoung: (keyword: string) =>
    `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(keyword)}`,

  // 다나와 (전자기기 가격비교)
  danawa: (keyword: string) =>
    `https://search.danawa.com/dsearch.php?query=${encodeURIComponent(keyword)}`,
};

// 상품 카테고리별 최적 쇼핑몰 매핑
function getBestShoppingLink(productName: string, category?: string): { link: string; storeName: string } {
  const lowerName = productName.toLowerCase();
  const lowerCat = (category || '').toLowerCase();

  // 전자기기 -> 다나와 (가격비교)
  if (
    lowerCat.includes('전자') ||
    lowerName.includes('아이폰') ||
    lowerName.includes('iphone') ||
    lowerName.includes('갤럭시') ||
    lowerName.includes('galaxy') ||
    lowerName.includes('맥북') ||
    lowerName.includes('macbook') ||
    lowerName.includes('에어팟') ||
    lowerName.includes('airpods') ||
    lowerName.includes('다이슨') ||
    lowerName.includes('dyson') ||
    lowerName.includes('삼성') ||
    lowerName.includes('lg ') ||
    lowerName.includes('tv') ||
    lowerName.includes('노트북') ||
    lowerName.includes('태블릿')
  ) {
    return { link: SHOPPING_LINKS.danawa(productName), storeName: '다나와' };
  }

  // 패션/의류 -> 무신사
  if (
    lowerCat.includes('패션') ||
    lowerName.includes('나이키') ||
    lowerName.includes('nike') ||
    lowerName.includes('아디다스') ||
    lowerName.includes('adidas') ||
    lowerName.includes('뉴발란스') ||
    lowerName.includes('운동화') ||
    lowerName.includes('스니커즈') ||
    lowerName.includes('후드') ||
    lowerName.includes('패딩')
  ) {
    return { link: SHOPPING_LINKS.musinsa(productName), storeName: '무신사' };
  }

  // 뷰티/화장품 -> 올리브영
  if (
    lowerCat.includes('뷰티') ||
    lowerName.includes('올리브영') ||
    lowerName.includes('화장품') ||
    lowerName.includes('스킨케어') ||
    lowerName.includes('선크림') ||
    lowerName.includes('립스틱') ||
    lowerName.includes('마스크팩') ||
    lowerName.includes('토너') ||
    lowerName.includes('세럼')
  ) {
    return { link: SHOPPING_LINKS.oliveyoung(productName), storeName: '올리브영' };
  }

  // 기본: 쿠팡 (가장 안정적)
  return { link: SHOPPING_LINKS.coupang(productName), storeName: '쿠팡' };
}

// 여러 쇼핑몰 링크 생성 (대안 제공)
function getAlternativeShoppingLinks(productName: string): { link: string; storeName: string }[] {
  return [
    { link: SHOPPING_LINKS.coupang(productName), storeName: '쿠팡' },
    { link: SHOPPING_LINKS.st11(productName), storeName: '11번가' },
    { link: SHOPPING_LINKS.gmarket(productName), storeName: 'G마켓' },
  ];
}

// 쇼핑 관련 뉴스/트렌드 RSS
const SHOPPING_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=%ED%92%88%EC%A0%88%EB%8C%80%EB%9E%80+OR+%EC%99%84%ED%8C%90+OR+%EB%A7%A4%EC%A7%84+OR+%ED%95%AB%ED%95%9C&hl=ko&gl=KR&ceid=KR:ko',
    name: '품절대란',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EC%95%84%EC%9D%B4%ED%8F%B0+OR+%EA%B0%A4%EB%9F%AD%EC%8B%9C+OR+%EB%A7%A5%EB%B6%81+%ED%95%A0%EC%9D%B8&hl=ko&gl=KR&ceid=KR:ko',
    name: '전자기기',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EC%98%AC%EB%A6%AC%EB%B8%8C%EC%98%81+OR+%EB%82%98%EC%9D%B4%ED%82%A4+OR+%EC%95%84%EB%94%94%EB%8B%A4%EC%8A%A4+%EC%9D%B8%EA%B8%B0&hl=ko&gl=KR&ceid=KR:ko',
    name: '패션',
  },
  {
    url: 'https://news.google.com/rss/search?q=%EB%8B%A4%EC%9D%B4%EC%86%90+OR+%EC%82%BC%EC%84%B1+%EA%B0%80%EC%A0%84+OR+LG+%EA%B0%80%EC%A0%84&hl=ko&gl=KR&ceid=KR:ko',
    name: '가전',
  },
];

export async function fetchShoppingTrends(limit: number = 10): Promise<ShoppingItem[]> {
  try {
    console.log('Fetching shopping trends with real product links...');

    // 뉴스 RSS에서 화제 상품 수집
    const allItems = await fetchFromSources();

    if (allItems.length === 0) {
      console.log('No shopping items fetched');
      return getMockShoppingTrends();
    }

    // Gemini로 인기 상품 추출 후 실제 상품 링크 연결
    const shoppingTrends = await extractShoppingTrendsWithGemini(allItems);

    if (shoppingTrends.length > 0) {
      return shoppingTrends.slice(0, limit);
    }

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

    const itemsText = items.map((item, i) => `${i}. ${item.title}\n   내용: ${item.snippet.slice(0, 150)}`).join('\n');

    const prompt = `
다음은 한국의 쇼핑/상품 관련 뉴스입니다.
화제가 되고 있는 상품 10개를 선정해주세요.

규칙:
1. 구체적인 상품명 포함 (브랜드 + 제품명)
2. 검색 가능한 간결한 상품명으로 제공
3. 카테고리를 정확히 분류 (전자기기/패션/뷰티/식품/생활용품/기타)

뉴스 목록:
${itemsText}

JSON 형식으로만 응답:
[
  {
    "product": "상품명",
    "itemIndex": 0,
    "searchKeyword": "검색용 키워드",
    "category": "전자기기/패션/뷰티/식품/생활용품/기타 중 하나",
    "brand": "브랜드명 (알 수 있으면)"
  }
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
      searchKeyword?: string;
      category?: string;
      brand?: string;
    }[];

    // 각 상품에 대해 최적의 쇼핑몰 링크 생성
    const results: ShoppingItem[] = [];

    for (let i = 0; i < products.length && i < 10; i++) {
      const p = products[i];
      const item = items[p.itemIndex] || items[0];
      const searchTerm = p.searchKeyword || p.product;

      // 카테고리 기반으로 최적의 쇼핑몰 선택
      const { link, storeName } = getBestShoppingLink(searchTerm, p.category);

      results.push({
        rank: i + 1,
        title: p.product,
        link: link,
        description: cleanSnippet(item.snippet),
        sourceName: storeName,
      });
    }

    return results;
  } catch (error) {
    console.error('Gemini shopping extraction error:', error);
    return [];
  }
}

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
    if (results.length >= limit) break;

    const key = item.title.slice(0, 15).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const productName = extractProductName(item.title);

    // 카테고리 기반 최적 쇼핑몰 선택
    const { link, storeName } = getBestShoppingLink(productName, item.source);

    results.push({
      rank: results.length + 1,
      title: productName,
      link: link,
      sourceName: storeName,
    });
  }

  return results;
}

function extractProductName(title: string): string {
  const quoted = title.match(/['""]([^'""]+)['""]|'([^']+)'/);
  if (quoted) {
    return quoted[1] || quoted[2];
  }

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
      link: 'https://www.coupang.com',
      description: '잠시 후 다시 시도해주세요',
      sourceName: 'System',
    },
  ];
}

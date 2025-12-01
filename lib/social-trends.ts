import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const parser = new Parser({
    customFields: {
        item: ['description'],
    },
});

export interface SocialItem {
    rank: number;
    title: string;
    link: string;
    description?: string;
    sourceName: string;
}

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 다양한 소스에서 바이럴/소셜 트렌드 수집
const SOCIAL_RSS_SOURCES = [
    // 연예/엔터테인먼트 뉴스
    {
        url: 'https://news.google.com/rss/topics/CAAqJQgKIh9DQkFTRVFvSUwyMHZNRE55YXpBU0JXVnVMVWRDS0FBUAE?hl=ko&gl=KR&ceid=KR:ko',
        name: 'Entertainment',
    },
    // 바이럴 키워드 검색 (화제, 논란)
    {
        url: 'https://news.google.com/rss/search?q=%ED%99%94%EC%A0%9C+OR+%EB%85%BC%EB%9E%80+OR+%ED%95%AB%EC%9D%B4%EC%8A%88&hl=ko&gl=KR&ceid=KR:ko',
        name: 'Viral',
    },
    // SNS 관련 뉴스
    {
        url: 'https://news.google.com/rss/search?q=%EC%9D%B8%EC%8A%A4%ED%83%80%EA%B7%B8%EB%9E%A8+OR+%ED%8A%B8%EC%9C%84%ED%84%B0+OR+%EC%9C%A0%ED%8A%9C%EB%B8%8C+OR+%ED%8B%B1%ED%86%A1&hl=ko&gl=KR&ceid=KR:ko',
        name: 'SNS',
    },
];

export async function fetchSocialTrends(limit: number = 10): Promise<SocialItem[]> {
    try {
        // 1. 여러 소스에서 뉴스 수집
        const allItems = await fetchFromMultipleSources();

        if (allItems.length === 0) {
            console.log('No social items fetched');
            return getMockSocialTrends();
        }

        // 2. Gemini로 소셜/바이럴 트렌드 추출
        const socialTrends = await extractSocialTrendsWithGemini(allItems);

        if (socialTrends.length > 0) {
            return socialTrends.slice(0, limit);
        }

        // 3. Gemini 실패시 기본 추출
        return extractBestItems(allItems, limit);
    } catch (error) {
        console.error('Error fetching social trends:', error);
        return getMockSocialTrends();
    }
}

// 여러 소스에서 뉴스 수집
async function fetchFromMultipleSources(): Promise<{ title: string; link: string; source: string; snippet: string }[]> {
    const items: { title: string; link: string; source: string; snippet: string }[] = [];

    for (const source of SOCIAL_RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items.slice(0, 15)) {
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

// Gemini로 소셜/바이럴 트렌드 추출 - 원본 링크와 스니펫 사용
async function extractSocialTrendsWithGemini(
    items: { title: string; link: string; source: string; snippet: string }[]
): Promise<SocialItem[]> {
    if (!genAI) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const itemsText = items.map((item, i) => `${i}. [${item.source}] ${item.title}`).join('\n');

        const prompt = `
다음은 한국의 연예/바이럴/SNS 관련 뉴스입니다.
현재 SNS에서 가장 화제가 되고 있을 것 같은 토픽 10개를 선정해주세요.
각 토픽에 대해 관련된 뉴스의 인덱스 번호를 정확히 매칭해주세요.

선정 기준:
1. SNS에서 공유될 만한 흥미로운 주제
2. 연예인, 인플루언서 관련
3. 일반 정치/경제 뉴스 제외

뉴스 목록:
${itemsText}

JSON 형식으로만 응답:
[
  {"topic": "화제 토픽", "itemIndex": 0, "platform": "Twitter/Instagram/커뮤니티"},
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

        const topics = JSON.parse(jsonMatch[0]) as {
            topic: string;
            itemIndex: number;
            platform: string;
        }[];

        return topics.map((t, index) => {
            // 원본 아이템에서 링크와 스니펫 가져오기
            const item = items[t.itemIndex] || items[0];

            return {
                rank: index + 1,
                title: t.topic,
                link: item.link, // 원본 링크 사용
                description: cleanSnippet(item.snippet), // 원본 스니펫 사용
                sourceName: t.platform || item.source,
            };
        });
    } catch (error) {
        console.error('Gemini social extraction error:', error);
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
        .slice(0, 100)
        .trim();
}

// 기본 추출 (Gemini 없을 때)
function extractBestItems(
    items: { title: string; link: string; source: string }[],
    limit: number
): SocialItem[] {
    // 바이럴 키워드 포함 우선
    const viralKeywords = ['화제', '논란', '충격', '대박', '실검', '급상승', '인기', '핫'];

    const scored = items.map(item => {
        let score = 0;
        for (const keyword of viralKeywords) {
            if (item.title.includes(keyword)) score += 2;
        }
        if (item.source === 'Viral') score += 1;
        if (item.source === 'SNS') score += 1;
        return { ...item, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    const seen = new Set<string>();
    const results: SocialItem[] = [];

    for (const item of sorted) {
        const key = item.title.slice(0, 20).toLowerCase();
        if (!seen.has(key) && results.length < limit) {
            seen.add(key);
            results.push({
                rank: results.length + 1,
                title: item.title.slice(0, 50),
                link: item.link,
                sourceName: item.source,
            });
        }
    }

    return results;
}

function cleanTitle(title: string): string {
    const cleaned = title.split(' - ')[0];
    return cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
}

function getMockSocialTrends(): SocialItem[] {
    return [
        {
            rank: 1,
            title: '소셜 트렌드 로딩 중',
            link: 'https://twitter.com/explore',
            description: '잠시 후 다시 시도해주세요',
            sourceName: 'System',
        },
    ];
}

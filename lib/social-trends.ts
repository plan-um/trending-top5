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
    thumbnail?: string;
}

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// SNS 플랫폼별 트렌드 RSS 소스 (Twitter, Threads, Instagram, Facebook)
const SOCIAL_RSS_SOURCES = [
    // 트위터/X 관련 화제
    {
        url: 'https://news.google.com/rss/search?q=%ED%8A%B8%EC%9C%84%ED%84%B0+%ED%99%94%EC%A0%9C+OR+%ED%8A%B8%EC%9C%97+%EC%8B%A4%EA%B2%80+OR+X+%ED%8A%B8%EB%A0%8C%EB%93%9C&hl=ko&gl=KR&ceid=KR:ko',
        name: '트위터/X',
        platform: 'twitter',
    },
    // 인스타그램 트렌드
    {
        url: 'https://news.google.com/rss/search?q=%EC%9D%B8%EC%8A%A4%ED%83%80%EA%B7%B8%EB%9E%A8+%ED%99%94%EC%A0%9C+OR+%EC%9D%B8%EC%8A%A4%ED%83%80+%EC%9D%B8%EA%B8%B0+OR+%EB%A6%B4%EC%8A%A4&hl=ko&gl=KR&ceid=KR:ko',
        name: '인스타그램',
        platform: 'instagram',
    },
    // 스레드 트렌드
    {
        url: 'https://news.google.com/rss/search?q=%EC%8A%A4%EB%A0%88%EB%93%9C+%ED%99%94%EC%A0%9C+OR+Threads+%EC%9D%B8%EA%B8%B0+OR+%EB%A9%94%ED%83%80+%EC%8A%A4%EB%A0%88%EB%93%9C&hl=ko&gl=KR&ceid=KR:ko',
        name: '스레드',
        platform: 'threads',
    },
    // 페이스북 트렌드
    {
        url: 'https://news.google.com/rss/search?q=%ED%8E%98%EC%9D%B4%EC%8A%A4%EB%B6%81+%ED%99%94%EC%A0%9C+OR+%ED%8E%98%EB%B6%81+%EC%9D%B8%EA%B8%B0+OR+%ED%8E%98%EC%9D%B4%EC%8A%A4%EB%B6%81+%EB%B0%94%EC%9D%B4%EB%9F%B4&hl=ko&gl=KR&ceid=KR:ko',
        name: '페이스북',
        platform: 'facebook',
    },
    // SNS 전반 바이럴
    {
        url: 'https://news.google.com/rss/search?q=SNS+%ED%99%94%EC%A0%9C+OR+%EB%B0%94%EC%9D%B4%EB%9F%B4+OR+%EB%B0%88+%ED%99%94%EC%A0%9C&hl=ko&gl=KR&ceid=KR:ko',
        name: 'SNS',
        platform: 'sns',
    },
    // 인플루언서/셀럽 SNS
    {
        url: 'https://news.google.com/rss/search?q=%EC%9D%B8%ED%94%8C%EB%A3%A8%EC%96%B8%EC%84%9C+SNS+OR+%EC%85%80%EB%9F%BD+%EC%9D%B8%EC%8A%A4%ED%83%80+OR+%EC%97%B0%EC%98%88%EC%9D%B8+SNS&hl=ko&gl=KR&ceid=KR:ko',
        name: '셀럽SNS',
        platform: 'celeb',
    },
];

export async function fetchSocialTrends(limit: number = 10): Promise<SocialItem[]> {
    try {
        console.log('Fetching social media trends (Twitter, Instagram, Threads, Facebook)...');

        // SNS 플랫폼별 뉴스 수집
        const allItems = await fetchFromMultipleSources();

        if (allItems.length === 0) {
            console.log('No social items fetched');
            return getMockSocialTrends();
        }

        // Gemini로 SNS 트렌드 추출 및 분석
        const socialTrends = await extractSocialTrendsWithGemini(allItems);

        if (socialTrends.length > 0) {
            return socialTrends.slice(0, limit);
        }

        // Gemini 실패시 기본 추출
        return extractBestItems(allItems, limit);
    } catch (error) {
        console.error('Error fetching social trends:', error);
        return getMockSocialTrends();
    }
}

// 여러 소스에서 뉴스 수집
async function fetchFromMultipleSources(): Promise<{ title: string; link: string; source: string; platform: string; snippet: string }[]> {
    const items: { title: string; link: string; source: string; platform: string; snippet: string }[] = [];

    for (const source of SOCIAL_RSS_SOURCES) {
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items.slice(0, 10)) {
                if (item.title) {
                    items.push({
                        title: cleanTitle(item.title),
                        link: item.link || '',
                        source: source.name,
                        platform: source.platform,
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

// Gemini로 SNS 트렌드 추출 - 플랫폼 다양성 확보
async function extractSocialTrendsWithGemini(
    items: { title: string; link: string; source: string; platform: string; snippet: string }[]
): Promise<SocialItem[]> {
    if (!genAI) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const itemsText = items.map((item, i) => `${i}. [${item.source}] ${item.title}`).join('\n');

        const prompt = `
다음은 한국의 SNS(트위터/X, 인스타그램, 스레드, 페이스북) 관련 뉴스입니다.
현재 각 SNS 플랫폼에서 화제가 되고 있는 토픽 10개를 선정해주세요.

⚠️ 중요: 다양한 플랫폼에서 고르게 선정 (트위터 3개, 인스타 3개, 스레드 2개, 페이스북 2개 정도)
각 토픽에 대해 관련된 뉴스의 인덱스 번호를 정확히 매칭해주세요.

선정 기준:
1. 실제 SNS에서 화제인 내용
2. 연예인, 인플루언서, 바이럴 콘텐츠
3. 일반 정치/경제 뉴스 제외

뉴스 목록:
${itemsText}

JSON 형식으로만 응답:
[
  {"topic": "화제 토픽", "itemIndex": 0, "platform": "트위터/인스타그램/스레드/페이스북"},
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
            const item = items[t.itemIndex] || items[0];

            return {
                rank: index + 1,
                title: t.topic,
                link: item.link,
                description: cleanSnippet(item.snippet),
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
    items: { title: string; link: string; source: string; platform: string }[],
    limit: number
): SocialItem[] {
    // 플랫폼별로 균등하게 선택
    const platformGroups: Record<string, typeof items> = {};
    for (const item of items) {
        if (!platformGroups[item.platform]) {
            platformGroups[item.platform] = [];
        }
        platformGroups[item.platform].push(item);
    }

    const results: SocialItem[] = [];
    const platforms = Object.keys(platformGroups);
    let platformIndex = 0;

    while (results.length < limit && platforms.length > 0) {
        const platform = platforms[platformIndex % platforms.length];
        const group = platformGroups[platform];

        if (group.length > 0) {
            const item = group.shift()!;
            results.push({
                rank: results.length + 1,
                title: item.title.slice(0, 50),
                link: item.link,
                sourceName: item.source,
            });
        } else {
            platforms.splice(platformIndex % platforms.length, 1);
        }
        platformIndex++;
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
            title: 'SNS 트렌드 로딩 중',
            link: 'https://twitter.com/explore',
            description: '잠시 후 다시 시도해주세요',
            sourceName: 'System',
        },
    ];
}

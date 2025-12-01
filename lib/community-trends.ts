import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RisingTrend {
    rank: number;
    title: string;
    link: string;
    source: string;
    viralScore: number;      // 0-100 바이럴 가능성
    sentimentType: string;   // 논란/충격/감동/흥미/정보
    reason: string;          // 왜 뜰 것 같은지
    isNewToNews: boolean;    // 뉴스에 아직 없는지
}

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 커뮤니티 RSS/API 소스
const COMMUNITY_SOURCES = [
    // 더쿠 실시간 베스트 (Google 검색 우회)
    {
        name: 'theqoo',
        displayName: '더쿠',
        url: 'https://news.google.com/rss/search?q=site:theqoo.net&hl=ko&gl=KR&ceid=KR:ko',
    },
    // 에펨코리아 핫이슈
    {
        name: 'fmkorea',
        displayName: '에펨코리아',
        url: 'https://news.google.com/rss/search?q=site:fmkorea.com&hl=ko&gl=KR&ceid=KR:ko',
    },
    // 루리웹
    {
        name: 'ruliweb',
        displayName: '루리웹',
        url: 'https://news.google.com/rss/search?q=site:ruliweb.com&hl=ko&gl=KR&ceid=KR:ko',
    },
    // 인스티즈
    {
        name: 'instiz',
        displayName: '인스티즈',
        url: 'https://news.google.com/rss/search?q=site:instiz.net&hl=ko&gl=KR&ceid=KR:ko',
    },
    // 실시간 이슈/논란 키워드 검색
    {
        name: 'viral_community',
        displayName: '커뮤니티 이슈',
        url: 'https://news.google.com/rss/search?q=%EC%BB%A4%EB%AE%A4%EB%8B%88%ED%8B%B0+%ED%99%94%EC%A0%9C+OR+%EB%B0%98%EC%9D%91+OR+%EB%85%BC%EB%9E%80&hl=ko&gl=KR&ceid=KR:ko',
    },
];

// 뉴스에서 현재 다루는 토픽 (비교용)
const NEWS_CHECK_URL = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';

export async function fetchRisingTrends(limit: number = 10): Promise<RisingTrend[]> {
    try {
        // 1. 커뮤니티 소스에서 이슈 수집
        const communityItems = await fetchCommunityItems();

        if (communityItems.length === 0) {
            console.log('No community items fetched');
            return getPlaceholderTrends();
        }

        // 2. 현재 뉴스 토픽 수집 (비교용)
        const newsTopics = await fetchCurrentNewsTopics();

        // 3. Gemini로 감정 분석 + 바이럴 예측
        const analyzedTrends = await analyzeViralPotential(communityItems, newsTopics);

        // 4. 바이럴 점수순 정렬
        return analyzedTrends
            .sort((a, b) => b.viralScore - a.viralScore)
            .slice(0, limit);

    } catch (error) {
        console.error('Error fetching rising trends:', error);
        return getPlaceholderTrends();
    }
}

// 커뮤니티 소스에서 아이템 수집
async function fetchCommunityItems(): Promise<{ title: string; link: string; source: string; snippet: string }[]> {
    const Parser = (await import('rss-parser')).default;
    const parser = new Parser();
    const items: { title: string; link: string; source: string; snippet: string }[] = [];

    for (const source of COMMUNITY_SOURCES) {
        try {
            const feed = await parser.parseURL(source.url);
            for (const item of feed.items.slice(0, 10)) {
                if (item.title) {
                    items.push({
                        title: cleanTitle(item.title),
                        link: item.link || '',
                        source: source.displayName,
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

// 현재 뉴스 토픽 수집
async function fetchCurrentNewsTopics(): Promise<string[]> {
    try {
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser();
        const feed = await parser.parseURL(NEWS_CHECK_URL);

        return feed.items.slice(0, 20).map(item =>
            cleanTitle(item.title || '').toLowerCase()
        );
    } catch {
        return [];
    }
}

// Gemini로 바이럴 가능성 분석 - 원본 링크와 스니펫 사용
async function analyzeViralPotential(
    items: { title: string; link: string; source: string; snippet: string }[],
    newsTopics: string[]
): Promise<RisingTrend[]> {
    if (!genAI || items.length === 0) {
        return items.slice(0, 10).map((item, i) => ({
            rank: i + 1,
            title: item.title,
            link: item.link, // 원본 링크 사용
            source: item.source,
            viralScore: 50,
            sentimentType: '흥미',
            reason: cleanSnippet(item.snippet) || '커뮤니티에서 화제',
            isNewToNews: true,
        }));
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const itemsText = items.map((item, i) =>
            `${i}. [${item.source}] ${item.title}`
        ).join('\n');

        const prompt = `
아래 커뮤니티 게시글/뉴스 중에서 화제가 될 것 같은 것 10개를 선정하고,
각 항목의 인덱스를 정확히 매칭해주세요.

커뮤니티 글 목록:
${itemsText}

JSON 형식으로만 응답:
[
  {"index": 0, "viralScore": 85, "sentimentType": "논란"},
  ...
]
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('Failed to parse response');
        }

        const analyses = JSON.parse(jsonMatch[0]) as {
            index: number;
            viralScore: number;
            sentimentType: string;
        }[];

        return analyses.map((analysis, rank) => {
            const item = items[analysis.index] || items[0];

            const titleLower = item.title.toLowerCase();
            const isNewToNews = !newsTopics.some(topic =>
                topic.includes(titleLower.slice(0, 10)) ||
                titleLower.includes(topic.slice(0, 10))
            );

            return {
                rank: rank + 1,
                title: item.title,
                link: item.link, // 원본 링크 사용
                source: item.source,
                viralScore: analysis.viralScore,
                sentimentType: analysis.sentimentType,
                reason: cleanSnippet(item.snippet) || item.title.slice(0, 50), // 스니펫 사용
                isNewToNews,
            };
        });

    } catch (error) {
        console.error('Gemini analysis error:', error);
        return items.slice(0, 10).map((item, i) => ({
            rank: i + 1,
            title: item.title,
            link: item.link,
            source: item.source,
            viralScore: 50,
            sentimentType: '흥미',
            reason: cleanSnippet(item.snippet) || '커뮤니티에서 화제',
            isNewToNews: true,
        }));
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

function cleanTitle(title: string): string {
    return title
        .split(' - ')[0]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim();
}

function getPlaceholderTrends(): RisingTrend[] {
    return [{
        rank: 1,
        title: '떡상 예감 데이터 로딩 중',
        link: '#',
        source: 'System',
        viralScore: 0,
        sentimentType: '정보',
        reason: '잠시 후 다시 시도',
        isNewToNews: false,
    }];
}

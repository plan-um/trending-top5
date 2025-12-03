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

// SNS 플랫폼별 트렌드 RSS 소스 - 실제 포스트 URL이 포함된 기사 우선
const SOCIAL_RSS_SOURCES = [
    {
        url: 'https://news.google.com/rss/search?q=%ED%8A%B8%EC%9C%84%ED%84%B0+%ED%99%94%EC%A0%9C+OR+%ED%8A%B8%EC%9C%97+%EC%8B%A4%EA%B2%80+OR+X+%ED%8A%B8%EB%A0%8C%EB%93%9C&hl=ko&gl=KR&ceid=KR:ko',
        name: '트위터/X',
        platform: 'twitter',
    },
    {
        url: 'https://news.google.com/rss/search?q=%EC%9D%B8%EC%8A%A4%ED%83%80%EA%B7%B8%EB%9E%A8+%ED%99%94%EC%A0%9C+OR+%EC%9D%B8%EC%8A%A4%ED%83%80+%EC%9D%B8%EA%B8%B0+OR+%EB%A6%B4%EC%8A%A4&hl=ko&gl=KR&ceid=KR:ko',
        name: '인스타그램',
        platform: 'instagram',
    },
    {
        url: 'https://news.google.com/rss/search?q=%EC%8A%A4%EB%A0%88%EB%93%9C+%ED%99%94%EC%A0%9C+OR+Threads+%EC%9D%B8%EA%B8%B0&hl=ko&gl=KR&ceid=KR:ko',
        name: '스레드',
        platform: 'threads',
    },
    {
        url: 'https://news.google.com/rss/search?q=%ED%8E%98%EC%9D%B4%EC%8A%A4%EB%B6%81+%ED%99%94%EC%A0%9C+OR+%ED%8E%98%EB%B6%81+%EB%B0%94%EC%9D%B4%EB%9F%B4&hl=ko&gl=KR&ceid=KR:ko',
        name: '페이스북',
        platform: 'facebook',
    },
    {
        url: 'https://news.google.com/rss/search?q=SNS+%ED%99%94%EC%A0%9C+OR+%EB%B0%94%EC%9D%B4%EB%9F%B4&hl=ko&gl=KR&ceid=KR:ko',
        name: 'SNS',
        platform: 'sns',
    },
    {
        url: 'https://news.google.com/rss/search?q=%EC%9D%B8%ED%94%8C%EB%A3%A8%EC%96%B8%EC%84%9C+SNS+OR+%EC%85%80%EB%9F%BD+%EC%9D%B8%EC%8A%A4%ED%83%80&hl=ko&gl=KR&ceid=KR:ko',
        name: '셀럽SNS',
        platform: 'celeb',
    },
];

// 실제 SNS 포스트 URL 패턴 (정규식)
const SNS_URL_PATTERNS = {
    twitter: [
        /https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/status\/\d+/g,
        /https?:\/\/(twitter\.com|x\.com)\/[a-zA-Z0-9_]+/g,
    ],
    instagram: [
        /https?:\/\/(www\.)?instagram\.com\/p\/[a-zA-Z0-9_-]+/g,
        /https?:\/\/(www\.)?instagram\.com\/reel\/[a-zA-Z0-9_-]+/g,
        /https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+/g,
    ],
    threads: [
        /https?:\/\/(www\.)?threads\.net\/@[a-zA-Z0-9_.]+\/post\/[a-zA-Z0-9_-]+/g,
        /https?:\/\/(www\.)?threads\.net\/@[a-zA-Z0-9_.]+/g,
    ],
    facebook: [
        /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/posts\/\d+/g,
        /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+\/videos\/\d+/g,
        /https?:\/\/(www\.)?facebook\.com\/watch\/\?v=\d+/g,
        /https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9.]+/g,
    ],
};

// 텍스트에서 실제 SNS URL 추출
function extractSnsUrlFromText(text: string, platform: string): string | null {
    const patterns = SNS_URL_PATTERNS[platform as keyof typeof SNS_URL_PATTERNS];
    if (!patterns) return null;

    for (const pattern of patterns) {
        const matches = text.match(pattern);
        if (matches && matches.length > 0) {
            return matches[0];
        }
    }
    return null;
}

// 플랫폼별 프로필/검색 링크 생성 (실제 포스트 URL을 찾지 못한 경우 fallback)
function generatePlatformLink(topic: string, platform: string, username?: string): string {
    // 유저네임이 있으면 프로필 페이지로
    if (username) {
        const cleanUsername = username.replace(/^@/, '');
        switch (platform) {
            case 'twitter':
                return `https://x.com/${cleanUsername}`;
            case 'instagram':
                return `https://www.instagram.com/${cleanUsername}/`;
            case 'threads':
                return `https://www.threads.net/@${cleanUsername}`;
            case 'facebook':
                return `https://www.facebook.com/${cleanUsername}`;
        }
    }

    // 검색어에서 핵심 키워드 추출 (첫 2-3 단어)
    const keywords = topic
        .replace(/['""\[\]()]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 1)
        .slice(0, 3)
        .join(' ');

    const encodedKeyword = encodeURIComponent(keywords);

    switch (platform) {
        case 'twitter':
            // X(트위터) 최신 검색
            return `https://x.com/search?q=${encodedKeyword}&src=typed_query&f=live`;
        case 'instagram':
            // 인스타그램 해시태그 탐색 (공백 제거)
            const hashtag = keywords.replace(/\s+/g, '');
            return `https://www.instagram.com/explore/tags/${encodeURIComponent(hashtag)}/`;
        case 'threads':
            // 스레드 검색
            return `https://www.threads.net/search?q=${encodedKeyword}&serp_type=default`;
        case 'facebook':
            // 페이스북 검색
            return `https://www.facebook.com/search/posts/?q=${encodedKeyword}`;
        default:
            // 기본: X 검색
            return `https://x.com/search?q=${encodedKeyword}&src=typed_query&f=live`;
    }
}

export async function fetchSocialTrends(limit: number = 10): Promise<SocialItem[]> {
    try {
        console.log('Fetching social media trends...');

        const allItems = await fetchFromMultipleSources();

        if (allItems.length === 0) {
            console.log('No social items fetched');
            return getMockSocialTrends();
        }

        // Gemini로 SNS 트렌드 추출 및 실제 플랫폼 링크 생성
        const socialTrends = await extractSocialTrendsWithGemini(allItems);

        if (socialTrends.length > 0) {
            return socialTrends.slice(0, limit);
        }

        return extractBestItems(allItems, limit);
    } catch (error) {
        console.error('Error fetching social trends:', error);
        return getMockSocialTrends();
    }
}

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

async function extractSocialTrendsWithGemini(
    items: { title: string; link: string; source: string; platform: string; snippet: string }[]
): Promise<SocialItem[]> {
    if (!genAI) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 뉴스 제목과 내용을 함께 제공하여 실제 URL/유저네임 추출 가능하게
        const itemsText = items.map((item, i) =>
            `${i}. [${item.source}] ${item.title}\n   내용: ${item.snippet.slice(0, 200)}`
        ).join('\n');

        const prompt = `
다음은 한국의 SNS 관련 뉴스입니다.
현재 각 SNS 플랫폼에서 화제가 되고 있는 토픽 10개를 선정해주세요.

⚠️ 매우 중요 - 실제 SNS 링크 추출:
1. 뉴스 내용에서 실제 SNS 계정 이름(@username)이나 포스트 URL을 찾아 추출해주세요
2. 연예인, 인플루언서의 실제 SNS 계정명을 알고 있다면 제공해주세요
3. 포스트 URL 형식 예시:
   - X/트위터: https://x.com/username/status/123456
   - 인스타: https://instagram.com/p/ABC123 또는 https://instagram.com/username
   - 스레드: https://threads.net/@username/post/ABC123
   - 페이스북: https://facebook.com/username/posts/123456

4. 다양한 플랫폼에서 고르게 선정 (X 3개, 인스타 3개, 스레드 2개, 페이스북 2개)
5. 실제 URL을 찾을 수 없으면 username만이라도 제공

뉴스 목록:
${itemsText}

JSON 형식으로만 응답 (모든 필드 포함):
[
  {
    "topic": "화제 키워드/인물명",
    "itemIndex": 0,
    "platform": "twitter/instagram/threads/facebook",
    "postUrl": "실제 포스트 URL (없으면 null)",
    "username": "SNS 계정명 @없이 (없으면 null)",
    "searchKeyword": "검색용 키워드"
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

        const topics = JSON.parse(jsonMatch[0]) as {
            topic: string;
            itemIndex: number;
            platform: string;
            postUrl?: string | null;
            username?: string | null;
            searchKeyword?: string;
        }[];

        const platformNames: Record<string, string> = {
            'twitter': 'X',
            'instagram': '인스타그램',
            'threads': '스레드',
            'facebook': '페이스북',
        };

        return topics.map((t, index) => {
            const item = items[t.itemIndex] || items[0];
            const searchTerm = t.searchKeyword || t.topic;

            // 우선순위: 1. 실제 포스트 URL -> 2. 뉴스 본문에서 URL 추출 -> 3. 유저네임으로 프로필 -> 4. 검색 링크
            let finalLink: string;

            // 1. Gemini가 찾은 실제 포스트 URL
            if (t.postUrl && t.postUrl !== 'null' && isValidSnsUrl(t.postUrl, t.platform)) {
                finalLink = t.postUrl;
            }
            // 2. 뉴스 본문에서 URL 직접 추출
            else {
                const extractedUrl = extractSnsUrlFromText(item.snippet + ' ' + item.title, t.platform);
                if (extractedUrl) {
                    finalLink = extractedUrl;
                }
                // 3. 유저네임으로 프로필 페이지
                else if (t.username && t.username !== 'null') {
                    finalLink = generatePlatformLink(searchTerm, t.platform, t.username);
                }
                // 4. 검색 페이지 fallback
                else {
                    finalLink = generatePlatformLink(searchTerm, t.platform);
                }
            }

            return {
                rank: index + 1,
                title: t.topic,
                link: finalLink,
                description: cleanSnippet(item.snippet),
                sourceName: platformNames[t.platform] || t.platform,
            };
        });
    } catch (error) {
        console.error('Gemini social extraction error:', error);
        return [];
    }
}

// URL이 해당 플랫폼의 유효한 URL인지 확인
function isValidSnsUrl(url: string, platform: string): boolean {
    if (!url || url === 'null') return false;

    const platformDomains: Record<string, string[]> = {
        'twitter': ['twitter.com', 'x.com'],
        'instagram': ['instagram.com'],
        'threads': ['threads.net'],
        'facebook': ['facebook.com', 'fb.com'],
    };

    const domains = platformDomains[platform] || [];
    return domains.some(domain => url.includes(domain));
}

function cleanSnippet(snippet: string): string {
    if (!snippet) return '';
    return snippet
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .slice(0, 100)
        .trim();
}

function extractBestItems(
    items: { title: string; link: string; source: string; platform: string }[],
    limit: number
): SocialItem[] {
    const platformGroups: Record<string, typeof items> = {};
    for (const item of items) {
        if (!platformGroups[item.platform]) {
            platformGroups[item.platform] = [];
        }
        platformGroups[item.platform].push(item);
    }

    const results: SocialItem[] = [];
    const platforms = ['twitter', 'instagram', 'threads', 'facebook'];
    let platformIndex = 0;

    const platformNames: Record<string, string> = {
        'twitter': '트위터/X',
        'instagram': '인스타그램',
        'threads': '스레드',
        'facebook': '페이스북',
    };

    while (results.length < limit && platformIndex < 100) {
        const platform = platforms[platformIndex % platforms.length];
        const group = platformGroups[platform] || [];

        if (group.length > 0) {
            const item = group.shift()!;
            const platformLink = generatePlatformLink(item.title, platform);

            results.push({
                rank: results.length + 1,
                title: item.title.slice(0, 50),
                link: platformLink,
                sourceName: platformNames[platform] || item.source,
            });
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

import Parser from 'rss-parser';

const parser = new Parser({
  customFields: {
    item: ['description'],
  },
});

export interface NewsItem {
  rank: number;
  title: string;
  link: string;
  description?: string;
}

// 네이버 뉴스 RSS 피드 (주요뉴스)
const NAVER_NEWS_RSS = 'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko';
// 대안: 네이버 뉴스 섹션별 RSS
const NAVER_NEWS_SECTIONS = {
  politics: 'https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNRFZ4ZERBU0FtdHZLQUFQAQ?hl=ko&gl=KR&ceid=KR:ko',
  economy: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko',
  society: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6ZDJjU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko',
  tech: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtdHZHZ0pMVWlnQVAB?hl=ko&gl=KR&ceid=KR:ko',
};

export async function fetchTopNews(limit: number = 5): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(NAVER_NEWS_RSS);

    const items: NewsItem[] = feed.items.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      title: cleanTitle(item.title || ''),
      link: item.link || '',
      description: item.contentSnippet || item.description || '',
    }));

    return items;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// HTML 태그 및 소스 정보 제거
function cleanTitle(title: string): string {
  // " - 출처" 형식 제거
  const cleaned = title.split(' - ')[0];
  // HTML 엔티티 디코딩
  return cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// 섹션별 뉴스 가져오기
export async function fetchNewsBySection(
  section: keyof typeof NAVER_NEWS_SECTIONS,
  limit: number = 5
): Promise<NewsItem[]> {
  try {
    const feed = await parser.parseURL(NAVER_NEWS_SECTIONS[section]);

    return feed.items.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      title: cleanTitle(item.title || ''),
      link: item.link || '',
      description: item.contentSnippet || item.description || '',
    }));
  } catch (error) {
    console.error(`Error fetching ${section} news:`, error);
    return [];
  }
}

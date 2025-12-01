export interface YouTubeVideo {
  rank: number;
  title: string;
  videoId: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: string;
  link: string;
}

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// YouTube Data API를 사용한 인기 급상승 동영상 조회
export async function fetchTrendingVideos(limit: number = 10): Promise<YouTubeVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.warn('YOUTUBE_API_KEY is not set. Using fallback data.');
    return getFallbackVideos();
  }

  try {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,statistics');
    url.searchParams.set('chart', 'mostPopular');
    url.searchParams.set('regionCode', 'KR');
    url.searchParams.set('maxResults', limit.toString());
    url.searchParams.set('key', YOUTUBE_API_KEY);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    const videos: YouTubeVideo[] = data.items.map(
      (item: YouTubeAPIItem, index: number) => ({
        rank: index + 1,
        title: item.snippet.title,
        videoId: item.id,
        channelTitle: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url ||
          '',
        viewCount: formatViewCount(item.statistics?.viewCount),
        link: `https://www.youtube.com/watch?v=${item.id}`,
      })
    );

    return videos;
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return getFallbackVideos();
  }
}

// YouTube API 응답 타입
interface YouTubeAPIItem {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics?: {
    viewCount?: string;
  };
}

// 조회수 포맷팅
function formatViewCount(count?: string): string {
  if (!count) return '';

  const num = parseInt(count, 10);
  if (num >= 100000000) {
    return `${(num / 100000000).toFixed(1)}억회`;
  }
  if (num >= 10000) {
    return `${(num / 10000).toFixed(0)}만회`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}천회`;
  }
  return `${num}회`;
}

// API 키가 없을 때 사용할 폴백 데이터
function getFallbackVideos(): YouTubeVideo[] {
  return [
    {
      rank: 1,
      title: 'YouTube API 키를 설정해주세요',
      videoId: 'dQw4w9WgXcQ',
      channelTitle: 'System',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      viewCount: '-',
      link: 'https://console.cloud.google.com/apis/credentials',
    },
  ];
}

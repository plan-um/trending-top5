// US Trending Sources
import Parser from 'rss-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SHOPPING_STORES, SOCIAL_PLATFORMS } from './locale';

const parser = new Parser({
  customFields: {
    item: ['description'],
  },
});

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// ============================================
// US NEWS/KEYWORD SOURCES
// ============================================
export const US_NEWS_SOURCES = [
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFZxYUdjU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    name: 'Top Stories',
  },
  {
    url: 'https://news.google.com/rss/topics/CAAqIggKIhxDQkFTRHdvSkwyMHZNR1Z0YlhKNUVnSmxiaWdBUAE?hl=en-US&gl=US&ceid=US:en',
    name: 'US News',
  },
  {
    url: 'https://news.google.com/rss/search?q=trending+viral+today&hl=en-US&gl=US&ceid=US:en',
    name: 'Trending',
  },
  {
    url: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    name: 'Technology',
  },
];

// ============================================
// US SOCIAL SOURCES
// ============================================
export const US_SOCIAL_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=twitter+X+viral+OR+trending&hl=en-US&gl=US&ceid=US:en',
    name: 'X/Twitter',
    platform: 'twitter',
  },
  {
    url: 'https://news.google.com/rss/search?q=TikTok+viral+OR+trending&hl=en-US&gl=US&ceid=US:en',
    name: 'TikTok',
    platform: 'tiktok',
  },
  {
    url: 'https://news.google.com/rss/search?q=Instagram+viral+OR+trending+OR+influencer&hl=en-US&gl=US&ceid=US:en',
    name: 'Instagram',
    platform: 'instagram',
  },
  {
    url: 'https://news.google.com/rss/search?q=Reddit+viral+OR+front+page&hl=en-US&gl=US&ceid=US:en',
    name: 'Reddit',
    platform: 'reddit',
  },
];

// ============================================
// US SHOPPING SOURCES
// ============================================
export const US_SHOPPING_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=Amazon+best+seller+OR+deal+OR+sale&hl=en-US&gl=US&ceid=US:en',
    name: 'Amazon',
  },
  {
    url: 'https://news.google.com/rss/search?q=iPhone+OR+MacBook+OR+AirPods+deal&hl=en-US&gl=US&ceid=US:en',
    name: 'Electronics',
  },
  {
    url: 'https://news.google.com/rss/search?q=Black+Friday+OR+Cyber+Monday+OR+sale+deal&hl=en-US&gl=US&ceid=US:en',
    name: 'Deals',
  },
  {
    url: 'https://news.google.com/rss/search?q=Nike+OR+Adidas+OR+sneaker+drop&hl=en-US&gl=US&ceid=US:en',
    name: 'Fashion',
  },
];

// ============================================
// US YOUTUBE/CONTENT SOURCES
// ============================================
export const US_YOUTUBE_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=YouTube+viral+OR+trending+video&hl=en-US&gl=US&ceid=US:en',
    name: 'YouTube',
  },
  {
    url: 'https://news.google.com/rss/search?q=Netflix+OR+streaming+trending&hl=en-US&gl=US&ceid=US:en',
    name: 'Streaming',
  },
];

// ============================================
// US RISING/VIRAL SOURCES
// ============================================
export const US_RISING_SOURCES = [
  {
    url: 'https://news.google.com/rss/search?q=viral+meme+OR+going+viral&hl=en-US&gl=US&ceid=US:en',
    name: 'Viral',
  },
  {
    url: 'https://news.google.com/rss/search?q=breaking+news+OR+just+announced&hl=en-US&gl=US&ceid=US:en',
    name: 'Breaking',
  },
];

// ============================================
// FETCH FUNCTIONS
// ============================================

interface NewsItem {
  title: string;
  link: string;
  source: string;
  snippet: string;
  platform?: string;
}

async function fetchRssSources(sources: { url: string; name: string; platform?: string }[]): Promise<NewsItem[]> {
  const items: NewsItem[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      for (const item of feed.items.slice(0, 15)) {
        if (item.title) {
          items.push({
            title: cleanTitle(item.title),
            link: item.link || '',
            source: source.name,
            snippet: item.contentSnippet || item.content || '',
            platform: source.platform,
          });
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${source.name}:`, error);
    }
  }

  return items;
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

// ============================================
// US NEWS TRENDS
// ============================================
export interface USTrendItem {
  rank: number;
  title: string;
  link: string;
  description?: string;
  sourceName: string;
  thumbnail?: string;
  price?: string;
}

export async function fetchUSNewsTrends(limit: number = 10): Promise<USTrendItem[]> {
  try {
    const allItems = await fetchRssSources(US_NEWS_SOURCES);
    if (allItems.length === 0) return [];

    if (!genAI) {
      return allItems.slice(0, limit).map((item, i) => ({
        rank: i + 1,
        title: item.title.slice(0, 60),
        link: item.link,
        description: item.snippet.slice(0, 100),
        sourceName: item.source,
      }));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const itemsText = allItems.map((item, i) => `${i}. ${item.title}`).join('\n');

    const prompt = `
Select the 10 most newsworthy trending topics from these US news headlines.

Headlines:
${itemsText}

Respond in JSON format only:
[
  {"topic": "topic title", "itemIndex": 0, "summary": "brief 1-sentence summary"},
  ...
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const topics = JSON.parse(jsonMatch[0]) as { topic: string; itemIndex: number; summary?: string }[];

    return topics.slice(0, limit).map((t, index) => {
      const item = allItems[t.itemIndex] || allItems[0];
      return {
        rank: index + 1,
        title: t.topic,
        link: item.link,
        description: t.summary || item.snippet.slice(0, 100),
        sourceName: 'Google News',
      };
    });
  } catch (error) {
    console.error('Error fetching US news trends:', error);
    return [];
  }
}

// ============================================
// US SOCIAL TRENDS
// ============================================
export async function fetchUSSocialTrends(limit: number = 10): Promise<USTrendItem[]> {
  try {
    const allItems = await fetchRssSources(US_SOCIAL_SOURCES);
    if (allItems.length === 0) return [];

    if (!genAI) {
      return allItems.slice(0, limit).map((item, i) => ({
        rank: i + 1,
        title: item.title.slice(0, 60),
        link: getSocialSearchLink('us', item.platform || 'twitter', item.title),
        sourceName: SOCIAL_PLATFORMS.us[item.platform || 'twitter']?.name || 'Social',
      }));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const itemsText = allItems.map((item, i) => `${i}. [${item.source}] ${item.title}`).join('\n');

    const prompt = `
From these US social media news, identify 10 trending topics.

Requirements:
- Diverse platforms: X/Twitter 3, TikTok 3, Instagram 2, Reddit 2
- If you know the username/handle, include it
- Focus on viral content, influencers, celebrities

News:
${itemsText}

JSON format only:
[
  {
    "topic": "trending topic",
    "itemIndex": 0,
    "platform": "twitter/tiktok/instagram/reddit",
    "username": "@handle or null",
    "searchKeyword": "search keyword"
  }
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const topics = JSON.parse(jsonMatch[0]) as {
      topic: string;
      itemIndex: number;
      platform: string;
      username?: string | null;
      searchKeyword?: string;
    }[];

    return topics.slice(0, limit).map((t, index) => {
      const item = allItems[t.itemIndex] || allItems[0];
      const searchTerm = t.searchKeyword || t.topic;
      const platformConfig = SOCIAL_PLATFORMS.us[t.platform];

      let link: string;
      if (t.username && t.username !== 'null') {
        link = platformConfig?.profile(t.username.replace('@', '')) || getSocialSearchLink('us', t.platform, searchTerm);
      } else {
        link = getSocialSearchLink('us', t.platform, searchTerm);
      }

      return {
        rank: index + 1,
        title: t.topic,
        link,
        description: item.snippet.slice(0, 100),
        sourceName: platformConfig?.name || t.platform,
      };
    });
  } catch (error) {
    console.error('Error fetching US social trends:', error);
    return [];
  }
}

function getSocialSearchLink(locale: 'kr' | 'us', platform: string, keyword: string): string {
  const platforms = SOCIAL_PLATFORMS[locale];
  const config = platforms[platform];
  if (config) {
    return config.search(keyword);
  }
  // Default to X search
  return `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
}

// ============================================
// US SHOPPING TRENDS
// ============================================
export async function fetchUSShoppingTrends(limit: number = 10): Promise<USTrendItem[]> {
  try {
    const allItems = await fetchRssSources(US_SHOPPING_SOURCES);
    if (allItems.length === 0) return [];

    if (!genAI) {
      return allItems.slice(0, limit).map((item, i) => ({
        rank: i + 1,
        title: item.title.slice(0, 60),
        link: SHOPPING_STORES.us.amazon(item.title),
        sourceName: 'Amazon',
      }));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const itemsText = allItems.map((item, i) => `${i}. ${item.title}\n   ${item.snippet.slice(0, 100)}`).join('\n');

    const prompt = `
From these US shopping/product news, select 10 trending products.

Requirements:
- Include specific product names (brand + product)
- Categorize: electronics/fashion/beauty/home/other
- Provide search-friendly keywords

News:
${itemsText}

JSON format only:
[
  {
    "product": "Product Name",
    "itemIndex": 0,
    "searchKeyword": "search keyword",
    "category": "electronics/fashion/beauty/home/other",
    "store": "amazon/bestbuy/target/walmart"
  }
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const products = JSON.parse(jsonMatch[0]) as {
      product: string;
      itemIndex: number;
      searchKeyword?: string;
      category?: string;
      store?: string;
    }[];

    return products.slice(0, limit).map((p, index) => {
      const item = allItems[p.itemIndex] || allItems[0];
      const searchTerm = p.searchKeyword || p.product;
      const { link, storeName } = getUSShoppingLink(searchTerm, p.category, p.store);

      return {
        rank: index + 1,
        title: p.product,
        link,
        description: item.snippet.slice(0, 80),
        sourceName: storeName,
      };
    });
  } catch (error) {
    console.error('Error fetching US shopping trends:', error);
    return [];
  }
}

function getUSShoppingLink(product: string, category?: string, preferredStore?: string): { link: string; storeName: string } {
  const stores = SHOPPING_STORES.us;
  const lowerProduct = product.toLowerCase();
  const lowerCat = (category || '').toLowerCase();

  // Electronics -> Best Buy
  if (
    lowerCat.includes('electronics') ||
    lowerProduct.includes('iphone') ||
    lowerProduct.includes('macbook') ||
    lowerProduct.includes('airpods') ||
    lowerProduct.includes('samsung') ||
    lowerProduct.includes('tv') ||
    lowerProduct.includes('laptop') ||
    lowerProduct.includes('playstation') ||
    lowerProduct.includes('xbox')
  ) {
    return { link: stores.bestbuy(product), storeName: 'Best Buy' };
  }

  // Use preferred store if specified
  if (preferredStore && stores[preferredStore]) {
    const storeNames: Record<string, string> = {
      amazon: 'Amazon',
      bestbuy: 'Best Buy',
      target: 'Target',
      walmart: 'Walmart',
      ebay: 'eBay',
    };
    return { link: stores[preferredStore](product), storeName: storeNames[preferredStore] || preferredStore };
  }

  // Default: Amazon
  return { link: stores.amazon(product), storeName: 'Amazon' };
}

// ============================================
// US YOUTUBE/CONTENT TRENDS
// ============================================
export async function fetchUSContentTrends(limit: number = 10): Promise<USTrendItem[]> {
  try {
    const allItems = await fetchRssSources(US_YOUTUBE_SOURCES);
    if (allItems.length === 0) return [];

    if (!genAI) {
      return allItems.slice(0, limit).map((item, i) => ({
        rank: i + 1,
        title: item.title.slice(0, 60),
        link: `https://www.youtube.com/results?search_query=${encodeURIComponent(item.title)}`,
        sourceName: 'YouTube',
      }));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const itemsText = allItems.map((item, i) => `${i}. ${item.title}`).join('\n');

    const prompt = `
From these US video/content news, identify 10 trending topics.

News:
${itemsText}

JSON format only:
[
  {"topic": "topic title", "itemIndex": 0, "searchKeyword": "YouTube search keyword"}
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const topics = JSON.parse(jsonMatch[0]) as { topic: string; itemIndex: number; searchKeyword?: string }[];

    return topics.slice(0, limit).map((t, index) => {
      const item = allItems[t.itemIndex] || allItems[0];
      const searchTerm = t.searchKeyword || t.topic;
      return {
        rank: index + 1,
        title: t.topic,
        link: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`,
        description: item.snippet.slice(0, 100),
        sourceName: 'YouTube',
      };
    });
  } catch (error) {
    console.error('Error fetching US content trends:', error);
    return [];
  }
}

// ============================================
// US RISING TRENDS
// ============================================
export async function fetchUSRisingTrends(limit: number = 10): Promise<USTrendItem[]> {
  try {
    const allItems = await fetchRssSources(US_RISING_SOURCES);
    if (allItems.length === 0) return [];

    if (!genAI) {
      return allItems.slice(0, limit).map((item, i) => ({
        rank: i + 1,
        title: item.title.slice(0, 60),
        link: item.link,
        sourceName: item.source,
      }));
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const itemsText = allItems.map((item, i) => `${i}. ${item.title}`).join('\n');

    const prompt = `
From these US viral/breaking news, select 10 topics that are rapidly gaining attention.

News:
${itemsText}

JSON format only:
[
  {"topic": "topic title", "itemIndex": 0, "viralScore": 1-100}
]
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const topics = JSON.parse(jsonMatch[0]) as { topic: string; itemIndex: number; viralScore?: number }[];

    return topics.slice(0, limit).map((t, index) => {
      const item = allItems[t.itemIndex] || allItems[0];
      return {
        rank: index + 1,
        title: t.topic,
        link: item.link,
        description: item.snippet.slice(0, 100),
        sourceName: 'Trending',
      };
    });
  } catch (error) {
    console.error('Error fetching US rising trends:', error);
    return [];
  }
}

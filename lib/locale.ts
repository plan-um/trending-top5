// Locale/Region configuration for trending data

export type Locale = 'kr' | 'us';

export interface LocaleConfig {
  code: Locale;
  name: string;
  flag: string;
  language: string;
  googleNewsCeid: string;
  googleNewsHl: string;
  googleNewsGl: string;
}

export const LOCALES: Record<Locale, LocaleConfig> = {
  kr: {
    code: 'kr',
    name: '한국',
    flag: '🇰🇷',
    language: 'ko',
    googleNewsCeid: 'KR:ko',
    googleNewsHl: 'ko',
    googleNewsGl: 'KR',
  },
  us: {
    code: 'us',
    name: 'USA',
    flag: '🇺🇸',
    language: 'en',
    googleNewsCeid: 'US:en',
    googleNewsHl: 'en-US',
    googleNewsGl: 'US',
  },
};

export const DEFAULT_LOCALE: Locale = 'kr';

// Category labels by locale
export const CATEGORY_LABELS_BY_LOCALE: Record<Locale, Record<string, string>> = {
  kr: {
    keyword: '뉴스',
    social: '소셜',
    content: '유튜브',
    shopping: '쇼핑',
    rising: '떡상중',
  },
  us: {
    keyword: 'News',
    social: 'Social',
    content: 'YouTube',
    shopping: 'Shopping',
    rising: 'Trending',
  },
};

// Shopping stores by locale
export const SHOPPING_STORES: Record<Locale, Record<string, (keyword: string) => string>> = {
  kr: {
    coupang: (keyword: string) =>
      `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(keyword)}&channel=user`,
    st11: (keyword: string) =>
      `https://search.11st.co.kr/Search.tmall?kwd=${encodeURIComponent(keyword)}`,
    gmarket: (keyword: string) =>
      `https://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(keyword)}`,
    musinsa: (keyword: string) =>
      `https://www.musinsa.com/search/musinsa/goods?q=${encodeURIComponent(keyword)}`,
    oliveyoung: (keyword: string) =>
      `https://www.oliveyoung.co.kr/store/search/getSearchMain.do?query=${encodeURIComponent(keyword)}`,
    danawa: (keyword: string) =>
      `https://search.danawa.com/dsearch.php?query=${encodeURIComponent(keyword)}`,
  },
  us: {
    amazon: (keyword: string) =>
      `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`,
    bestbuy: (keyword: string) =>
      `https://www.bestbuy.com/site/searchpage.jsp?st=${encodeURIComponent(keyword)}`,
    target: (keyword: string) =>
      `https://www.target.com/s?searchTerm=${encodeURIComponent(keyword)}`,
    walmart: (keyword: string) =>
      `https://www.walmart.com/search?q=${encodeURIComponent(keyword)}`,
    ebay: (keyword: string) =>
      `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(keyword)}`,
  },
};

// Social platform URLs by locale
export const SOCIAL_PLATFORMS: Record<Locale, Record<string, {
  search: (keyword: string) => string;
  profile: (username: string) => string;
  name: string;
}>> = {
  kr: {
    twitter: {
      search: (keyword: string) => `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`,
      profile: (username: string) => `https://x.com/${username}`,
      name: 'X',
    },
    instagram: {
      search: (keyword: string) => `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword.replace(/\s+/g, ''))}/`,
      profile: (username: string) => `https://www.instagram.com/${username}/`,
      name: '인스타그램',
    },
    threads: {
      search: (keyword: string) => `https://www.threads.net/search?q=${encodeURIComponent(keyword)}&serp_type=default`,
      profile: (username: string) => `https://www.threads.net/@${username}`,
      name: '스레드',
    },
    facebook: {
      search: (keyword: string) => `https://www.facebook.com/search/posts/?q=${encodeURIComponent(keyword)}`,
      profile: (username: string) => `https://www.facebook.com/${username}`,
      name: '페이스북',
    },
  },
  us: {
    twitter: {
      search: (keyword: string) => `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`,
      profile: (username: string) => `https://x.com/${username}`,
      name: 'X',
    },
    instagram: {
      search: (keyword: string) => `https://www.instagram.com/explore/tags/${encodeURIComponent(keyword.replace(/\s+/g, ''))}/`,
      profile: (username: string) => `https://www.instagram.com/${username}/`,
      name: 'Instagram',
    },
    tiktok: {
      search: (keyword: string) => `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`,
      profile: (username: string) => `https://www.tiktok.com/@${username}`,
      name: 'TikTok',
    },
    reddit: {
      search: (keyword: string) => `https://www.reddit.com/search/?q=${encodeURIComponent(keyword)}&sort=hot`,
      profile: (username: string) => `https://www.reddit.com/user/${username}`,
      name: 'Reddit',
    },
  },
};

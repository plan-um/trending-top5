import * as cheerio from 'cheerio';

// Open Graph 이미지 추출
export async function extractOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);

    // Open Graph image
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) return normalizeImageUrl(ogImage, url);

    // Twitter image
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (twitterImage) return normalizeImageUrl(twitterImage, url);

    // First meaningful image
    const firstImage = $('article img, .content img, main img').first().attr('src');
    if (firstImage) return normalizeImageUrl(firstImage, url);

    return null;
  } catch (error) {
    console.error('Error extracting OG image:', error);
    return null;
  }
}

// 상대 URL을 절대 URL로 변환
function normalizeImageUrl(imageUrl: string, baseUrl: string): string {
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('//')) return 'https:' + imageUrl;

  try {
    const base = new URL(baseUrl);
    return new URL(imageUrl, base.origin).href;
  } catch {
    return imageUrl;
  }
}

// 네이버 쇼핑 베스트 크롤링
export interface NaverShoppingItem {
  rank: number;
  title: string;
  link: string;
  price?: string;
  thumbnail?: string;
  storeName?: string;
}

export async function scrapeNaverShoppingBest(): Promise<NaverShoppingItem[]> {
  try {
    // 네이버 쇼핑 베스트 100 페이지
    const response = await fetch('https://search.shopping.naver.com/best/home', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      console.error('Naver shopping fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: NaverShoppingItem[] = [];

    // 베스트 상품 목록 파싱 (클래스명은 변경될 수 있음)
    $('[class*="product_item"], [class*="item_inner"]').each((index, element) => {
      if (items.length >= 10) return false;

      const $el = $(element);
      const title = $el.find('[class*="product_title"], [class*="tit"]').text().trim();
      const link = $el.find('a').first().attr('href');
      const price = $el.find('[class*="price"], [class*="num"]').text().trim();
      const thumbnail = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');

      if (title && link) {
        items.push({
          rank: items.length + 1,
          title: title.slice(0, 60),
          link: link.startsWith('http') ? link : `https://search.shopping.naver.com${link}`,
          price: price || undefined,
          thumbnail: thumbnail || undefined,
        });
      }
    });

    return items;
  } catch (error) {
    console.error('Error scraping Naver shopping:', error);
    return [];
  }
}

// 더쿠 실시간 베스트 크롤링
export interface CommunityPost {
  rank: number;
  title: string;
  link: string;
  views?: number;
  comments?: number;
  source: string;
}

export async function scrapeTheqooBest(): Promise<CommunityPost[]> {
  try {
    const response = await fetch('https://theqoo.net/index.php?mid=hot', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://theqoo.net/',
      },
    });

    if (!response.ok) {
      console.error('Theqoo fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: CommunityPost[] = [];

    // 더쿠 게시글 목록 파싱
    $('table.bd_lst tbody tr, .bd_lst_wrp li').each((index, element) => {
      if (items.length >= 10) return false;

      const $el = $(element);
      const $link = $el.find('a.title, a[class*="title"], td.title a').first();
      const title = $link.text().trim();
      const href = $link.attr('href');

      if (title && href && !title.includes('공지')) {
        items.push({
          rank: items.length + 1,
          title: title.slice(0, 60),
          link: href.startsWith('http') ? href : `https://theqoo.net${href}`,
          source: '더쿠',
        });
      }
    });

    return items;
  } catch (error) {
    console.error('Error scraping Theqoo:', error);
    return [];
  }
}

// 인스티즈 실시간 이슈 크롤링
export async function scrapeInstizBest(): Promise<CommunityPost[]> {
  try {
    const response = await fetch('https://www.instiz.net/pt', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      console.error('Instiz fetch failed:', response.status);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: CommunityPost[] = [];

    // 인스티즈 게시글 파싱
    $('#mainboard tr, .listbox li').each((index, element) => {
      if (items.length >= 10) return false;

      const $el = $(element);
      const $link = $el.find('a.title, a[class*="subject"]').first();
      const title = $link.text().trim();
      const href = $link.attr('href');

      if (title && href) {
        items.push({
          rank: items.length + 1,
          title: title.slice(0, 60),
          link: href.startsWith('http') ? href : `https://www.instiz.net${href}`,
          source: '인스티즈',
        });
      }
    });

    return items;
  } catch (error) {
    console.error('Error scraping Instiz:', error);
    return [];
  }
}

// 여러 커뮤니티에서 통합 수집
export async function scrapeCommunityBest(): Promise<CommunityPost[]> {
  const [theqoo, instiz] = await Promise.allSettled([
    scrapeTheqooBest(),
    scrapeInstizBest(),
  ]);

  const allPosts: CommunityPost[] = [];

  if (theqoo.status === 'fulfilled') {
    allPosts.push(...theqoo.value.slice(0, 5));
  }
  if (instiz.status === 'fulfilled') {
    allPosts.push(...instiz.value.slice(0, 5));
  }

  // 랭킹 재정렬
  return allPosts.map((post, index) => ({
    ...post,
    rank: index + 1,
  }));
}

// 배치 이미지 추출 (병렬 처리)
export async function extractImagesForItems<T extends { link?: string; source_url?: string }>(
  items: T[],
  limit: number = 3
): Promise<(T & { thumbnail?: string })[]> {
  const results = await Promise.all(
    items.map(async (item, index) => {
      // 상위 limit개만 이미지 추출
      if (index >= limit) {
        return item;
      }

      const url = item.link || item.source_url;
      if (!url) return item;

      const thumbnail = await extractOgImage(url);
      return {
        ...item,
        thumbnail: thumbnail || undefined,
      };
    })
  );

  return results;
}

import { TrendItem, TrendCategory } from '@/types/trend';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WeightedTrend extends TrendItem {
    score: number;
    originalCategory: TrendCategory;
}

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// 가중치 설정
const WEIGHTS: Record<TrendCategory, number> = {
    keyword: 1.0, // 검색어는 가장 직접적인 관심도
    social: 0.9,  // 소셜은 확산도 (높임)
    content: 0.7, // 콘텐츠는 소비형
    shopping: 0.6, // 쇼핑은 구매 트렌드
    rising: 0.8,  // 떡상중은 급상승
};

export async function calculateOverallRanking(
    allTrends: Record<TrendCategory, TrendItem[]>
): Promise<TrendItem[]> {
    const pool: WeightedTrend[] = [];

    // 1. 모든 트렌드를 풀에 모으고 점수 계산
    Object.entries(allTrends).forEach(([category, items]) => {
        if (category === 'overall') return;

        items.forEach((item) => {
            const rankScore = (6 - item.rank) * (WEIGHTS[category as TrendCategory] || 0.5);
            pool.push({
                ...item,
                score: rankScore,
                originalCategory: category as TrendCategory,
            });
        });
    });

    if (pool.length === 0) {
        return [];
    }

    // 2. Gemini를 사용한 스마트 중복 제거 및 병합
    const merged = await smartMergeTrends(pool);

    // 3. 점수순 정렬 및 Top 5 추출
    const sorted = merged
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    // 4. 최종 형태 변환
    return sorted.map((item, index) => ({
        ...item,
        rank: index + 1,
    }));
}

// Gemini를 활용한 스마트 중복 제거
async function smartMergeTrends(trends: WeightedTrend[]): Promise<WeightedTrend[]> {
    if (!genAI || trends.length <= 5) {
        return simpleMerge(trends);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const trendsText = trends.map((t, i) =>
            `${i}. [${t.originalCategory}] ${t.title} (score: ${t.score.toFixed(1)})`
        ).join('\n');

        const prompt = `
다음 트렌드 항목들 중에서 같은 주제/이슈를 다루는 것들을 그룹핑해주세요.

트렌드 목록:
${trendsText}

규칙:
1. 같은 인물/사건/현상에 대한 것은 하나로 묶기
2. 각 그룹에서 가장 대표적인 제목 선택
3. 그룹 내 점수는 합산
4. 서로 다른 주제는 별도 그룹으로 유지

다음 JSON 형식으로만 응답:
[
  {"indices": [0, 3, 5], "representativeIndex": 0, "mergedTitle": "통합된 제목"},
  {"indices": [1], "representativeIndex": 1, "mergedTitle": null},
  ...
]
`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return simpleMerge(trends);
        }

        const groups = JSON.parse(jsonMatch[0]) as {
            indices: number[];
            representativeIndex: number;
            mergedTitle: string | null;
        }[];

        const merged: WeightedTrend[] = [];

        for (const group of groups) {
            const rep = trends[group.representativeIndex];
            if (!rep) continue;

            // 그룹 내 점수 합산
            const totalScore = group.indices.reduce((sum, idx) => {
                return sum + (trends[idx]?.score || 0);
            }, 0);

            merged.push({
                ...rep,
                title: group.mergedTitle || rep.title,
                score: totalScore,
            });
        }

        return merged;
    } catch (error) {
        console.error('Smart merge error:', error);
        return simpleMerge(trends);
    }
}

// 단순 중복 제거 (Gemini 없을 때)
function simpleMerge(trends: WeightedTrend[]): WeightedTrend[] {
    const merged = new Map<string, WeightedTrend>();

    for (const item of trends) {
        // 더 엄격한 정규화: 공백, 특수문자 제거, 소문자
        const key = item.title
            .replace(/\s+/g, '')
            .replace(/[^\w가-힣]/g, '')
            .toLowerCase()
            .slice(0, 15); // 앞 15자만 비교

        if (merged.has(key)) {
            const existing = merged.get(key)!;
            existing.score += item.score;
            // 더 높은 순위의 정보 유지
            if (item.rank < existing.rank) {
                existing.sourceUrl = item.sourceUrl;
                existing.sourceName = item.sourceName;
                existing.thumbnail = item.thumbnail || existing.thumbnail;
            }
        } else {
            merged.set(key, { ...item });
        }
    }

    return Array.from(merged.values());
}

export async function generateMetaAnalysis(topTrends: TrendItem[]): Promise<string> {
    if (!genAI || topTrends.length === 0) {
        return '현재 다양한 이슈가 복합적으로 관심을 받고 있습니다.';
    }

    const titles = topTrends.map((t) => `${t.rank}위: ${t.title}`).join('\n');

    const prompt = `
다음은 현재 한국의 실시간 종합 트렌드 Top 5입니다:
${titles}

이 트렌드들을 관통하는 오늘의 핵심 키워드나 현상을 1문장으로 분석해주세요.
- 20~40자 이내
- 구체적인 인사이트 제공
- "~입니다" 형식으로 끝내기

예시:
- "연예계 컴백 러시와 스포츠 빅매치가 동시에 화제입니다."
- "정치권 이슈보다 일상 콘텐츠에 대한 관심이 높습니다."

분석:`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text().trim();

        // 따옴표 제거
        return text.replace(/^["']|["']$/g, '');
    } catch (e) {
        console.error('Meta analysis failed', e);
        return '현재 다양한 이슈가 복합적으로 관심을 받고 있습니다.';
    }
}

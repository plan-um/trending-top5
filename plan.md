# 트렌딩 탑5 - 구현 계획서

**프로젝트**: trending-top5 | **날짜**: 2025-11-28
**핵심 가치**: "지금 뜨는 것 5개만, 30초 안에 파악하기"

---

## 1. 프로젝트 개요

### 1.1 서비스 목표
- 실시간 트렌드 큐레이션 서비스
- 카테고리별 TOP 5 트렌드 제공
- AI 기반 한 줄 요약

### 1.2 타겟 사용자
- 트렌드에 민감하지만 시간이 부족한 직장인
- 마케터, 콘텐츠 크리에이터
- Z세대 정보 소비자

### 1.3 MVP 범위 (2주)
- **1개 카테고리**: 네이버 검색어 트렌드
- 기본 UI (모바일 퍼스트)
- 1시간 주기 자동 업데이트
- AI 요약 (Gemini)

---

## 2. 기술 스택

| 영역 | 기술 | 선정 이유 |
|------|------|----------|
| 프론트엔드 | Next.js 14 (App Router) | SSR/SSG, 서버 컴포넌트 지원 |
| 스타일링 | TailwindCSS + shadcn/ui | 빠른 개발, 일관된 디자인 |
| 데이터베이스 | Supabase (PostgreSQL) | 무료 티어, 실시간 구독 |
| 캐싱 | Vercel KV (Redis) | 빠른 응답, Vercel 통합 |
| 데이터 수집 | Vercel Cron Jobs | 서버리스, 무료 |
| AI 요약 | Gemini API | 무료 티어 충분 |
| 호스팅 | Vercel | Next.js 최적화 |

---

## 3. 데이터 모델

### 3.1 trends 테이블
```sql
CREATE TABLE trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,           -- 'keyword' | 'product' | 'community' | 'content' | 'news'
  rank INTEGER NOT NULL,            -- 1~5
  title TEXT NOT NULL,              -- 트렌드 제목/키워드
  summary TEXT,                     -- AI 생성 요약
  source_url TEXT,                  -- 원본 링크
  source_name TEXT,                 -- 출처명 (네이버, 유튜브 등)
  change_rate DECIMAL,              -- 상승률 (%)
  mention_count INTEGER,            -- 언급량
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_trends_category ON trends(category);
CREATE INDEX idx_trends_updated ON trends(updated_at DESC);
CREATE INDEX idx_trends_category_rank ON trends(category, rank);
```

### 3.2 trend_history 테이블 (Phase 2)
```sql
CREATE TABLE trend_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES trends(id),
  rank INTEGER NOT NULL,
  change_rate DECIMAL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API 설계

### 4.1 트렌드 조회
```
GET /api/trends?category={category}

Response:
{
  "category": "keyword",
  "updatedAt": "2025-11-28T11:32:00Z",
  "items": [
    {
      "rank": 1,
      "title": "검색어",
      "summary": "AI 생성 요약",
      "sourceUrl": "https://...",
      "sourceName": "네이버",
      "changeRate": 150.5,
      "updatedAt": "2025-11-28T11:32:00Z"
    }
  ]
}
```

### 4.2 Cron Job (트렌드 수집)
```
GET /api/cron/fetch-trends
Header: Authorization: Bearer {CRON_SECRET}

- 1시간마다 실행
- 네이버 데이터랩 API 호출
- Supabase에 저장
- 새 트렌드에 Gemini 요약 생성
```

### 4.3 AI 요약 생성
```
POST /api/ai/summarize
Body: { "keyword": "검색어", "context": "관련 정보" }

Response:
{ "summary": "한 줄 요약" }
```

---

## 5. 프로젝트 구조

```
trending-top5/
├── app/
│   ├── page.tsx                    # 메인 페이지
│   ├── layout.tsx                  # 루트 레이아웃
│   ├── globals.css                 # 글로벌 스타일
│   ├── api/
│   │   ├── trends/
│   │   │   └── route.ts            # GET: 트렌드 조회
│   │   ├── cron/
│   │   │   └── fetch-trends/
│   │   │       └── route.ts        # Cron: 트렌드 수집
│   │   └── ai/
│   │       └── summarize/
│   │           └── route.ts        # POST: AI 요약
│   └── components/
│       ├── TrendCard.tsx           # 트렌드 카드
│       ├── CategoryTabs.tsx        # 카테고리 탭
│       ├── TrendList.tsx           # 트렌드 리스트
│       └── UpdateTime.tsx          # 업데이트 시간
├── lib/
│   ├── supabase.ts                 # Supabase 클라이언트
│   ├── naver.ts                    # 네이버 API 클라이언트
│   └── gemini.ts                   # Gemini API 클라이언트
├── types/
│   └── trend.ts                    # 타입 정의
├── vercel.json                     # Cron 설정
├── .env.local                      # 환경변수
└── package.json
```

---

## 6. 외부 API 연동

### 6.1 네이버 데이터랩 API
- **URL**: https://openapi.naver.com/v1/datalab/search
- **인증**: Client ID + Client Secret
- **제한**: 1,000회/일
- **데이터**: 검색어 트렌드 (상대적 검색량)

**주의사항**:
- 네이버 데이터랩 API는 "검색어 트렌드"가 아닌 "검색어 비교" 기능
- 실시간 인기 검색어는 공식 API 없음 → 웹 크롤링 필요
- 대안: 네이버 실시간 검색어 페이지 크롤링 or 네이버 뉴스 API

### 6.2 Gemini API
- **URL**: https://generativelanguage.googleapis.com/v1beta
- **모델**: gemini-1.5-flash (빠르고 저렴)
- **제한**: 15 RPM (무료), 1M 토큰/분
- **용도**: 트렌드 키워드 한 줄 요약 생성

---

## 7. 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 네이버 API
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx

# Gemini API
GEMINI_API_KEY=xxx

# Cron 보안
CRON_SECRET=xxx
```

---

## 8. 구현 순서 (MVP)

### Phase 1: 프로젝트 설정
- [ ] T001: Next.js 14 프로젝트 생성 (App Router)
- [ ] T002: TailwindCSS + shadcn/ui 설정
- [ ] T003: Supabase 프로젝트 생성 (사용자와 함께)
- [ ] T004: YouTube API 키 발급 (사용자와 함께)
- [ ] T005: 환경변수 설정 (.env.local)
- [ ] T006: Supabase 테이블 생성

### Phase 2: 데이터 수집 레이어
- [ ] T007: Supabase 클라이언트 설정 (`lib/supabase.ts`)
- [ ] T008: Google Trends 수집 (`lib/google-trends.ts`) - pytrends 또는 SerpAPI
- [ ] T009: 네이버 뉴스 수집 (`lib/naver-news.ts`) - RSS 파싱
- [ ] T010: YouTube 급상승 수집 (`lib/youtube.ts`) - YouTube Data API
- [ ] T011: Gemini 요약 클라이언트 (`lib/gemini.ts`)

### Phase 3: API Routes
- [ ] T012: 트렌드 조회 API (`/api/trends`)
- [ ] T013: Cron Job - Google Trends (`/api/cron/fetch-keywords`)
- [ ] T014: Cron Job - 뉴스 (`/api/cron/fetch-news`)
- [ ] T015: Cron Job - YouTube (`/api/cron/fetch-youtube`)
- [ ] T016: AI 요약 API (`/api/ai/summarize`)

### Phase 4: 프론트엔드 UI
- [ ] T017: 메인 레이아웃 + 다크모드
- [ ] T018: CategoryTabs 컴포넌트 (스와이프)
- [ ] T019: TrendCard 컴포넌트
- [ ] T020: TrendList 컴포넌트
- [ ] T021: UpdateTime 컴포넌트
- [ ] T022: 메인 페이지 조립

### Phase 5: 배포
- [ ] T023: Vercel 배포
- [ ] T024: Cron Jobs 설정 (`vercel.json`)
- [ ] T025: 최종 테스트

---

## 9. 기술적 고려사항

### 9.1 네이버 실시간 검색어 대안
네이버 공식 API가 실시간 인기 검색어를 제공하지 않으므로:

**옵션 A**: 웹 크롤링 (추천)
- zum.com 실시간 검색어
- 시그널 실시간 검색어

**옵션 B**: 대체 데이터 소스
- Google Trends API
- X(트위터) Trending API

**옵션 C**: 네이버 뉴스 API
- 많이 본 뉴스 기반 키워드 추출

### 9.2 캐싱 전략
- Vercel KV로 1시간 캐싱
- ISR (Incremental Static Regeneration) 활용
- `revalidate: 3600` 설정

### 9.3 에러 처리
- API 호출 실패 시 이전 캐시 데이터 반환
- Retry 로직 (최대 3회)
- Fallback UI 제공

---

## 10. 결정 사항 (확정)

1. **데이터 소스**: ✅ Google Trends (pytrends 라이브러리)
2. **MVP 카테고리**: ✅ 3개 모두 구현
   - 화제의 키워드 (Google Trends)
   - 뉴스 이슈 (네이버 뉴스 API or RSS)
   - 콘텐츠 (YouTube API)
3. **API 키 상태**:
   - ✅ Gemini API: 준비됨
   - ⚠️ Supabase: 설정 필요
   - ⚠️ YouTube API: 설정 필요

---

## 11. 참고 자료

- [Next.js 14 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Gemini API](https://ai.google.dev/docs)
- [shadcn/ui](https://ui.shadcn.com)

# LUMEN — 화장품 회사 소개 랜딩페이지

원페이지 스크롤 랜딩 + Supabase 문의 저장.

## 실행

1. `index.html`을 **Live Server** 등으로 열기 (`http://localhost` — `file://`는 폼 전송 불가)
2. 문의 폼 연동: `npx supabase login` 후 `.\scripts\setup-supabase.ps1` (자세히 [supabase/README.md](supabase/README.md))

## 구조

- `index.html` / `css/` / `js/` — 프론트
- `source/` — 이미지·영상
- `supabase/` — DB 스키마·연동 가이드
- `gas/` — (이전) Google 스프레드시트 연동 (선택)
- `기획서.md`, `디자인 기획.md` — 기획 문서

## GitHub Pages (선택)

Repository **Settings → Pages → Branch: main, folder: / (root)** 후 `index.html` URL로 접속.

## Vercel 배포

1. GitHub 연동 후 Import (`lumen-cosmetics-landing`)
2. **Environment Variables** 추가:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy (빌드 시 `scripts/generate-config.js`가 `js/config.js` 생성)

로컬: `npx vercel login` → `npx vercel deploy --prod`

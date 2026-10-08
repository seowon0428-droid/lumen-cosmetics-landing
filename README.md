# LUMEN — 화장품 회사 소개 랜딩페이지

원페이지 스크롤 랜딩 + Google 스프레드시트 문의 저장 (Apps Script).

## 실행

1. `index.html`을 **Live Server** 등으로 열기 (`http://localhost` — `file://`는 폼 전송 불가)
2. 문의 폼 연동: `js/config.js`의 `GAS_ENDPOINT` 설정 (`js/config.example.js` 참고)
3. Apps Script 배포: [gas/README.md](gas/README.md)

## 구조

- `index.html` / `css/` / `js/` — 프론트
- `source/` — 이미지·영상
- `gas/Code.gs` — 스프레드시트 API
- `기획서.md`, `디자인 기획.md` — 기획 문서

## GitHub Pages (선택)

Repository **Settings → Pages → Branch: main, folder: / (root)** 후 `index.html` URL로 접속.

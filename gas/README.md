# Google 스프레드시트 연동 가이드

## 1. 스프레드시트

1. [Google 스프레드시트](https://sheets.google.com)에서 새 문서 생성
2. 하단 시트 이름을 **inquiries** 로 변경
3. 1행에 헤더 입력: `created_at` | `name` | `email` | `message` | `privacy_agreed`

(스크립트가 시트가 없으면 자동 생성할 수도 있습니다.)

## 2. Apps Script

1. **확장 프로그램** → **Apps Script**
2. [Code.gs](./Code.gs) 내용 전체 붙여넣기 후 저장
3. **배포** → **새 배포** → 유형 **웹 앱**
   - 실행: **나**
   - 액세스: **모든 사용자** (또는 과제 지침에 따름)
4. 배포 URL 복사

## 3. 웹 페이지 설정

`js/config.js` 파일을 열고:

```javascript
window.LUMEN_CONFIG = {
  GAS_ENDPOINT: "여기에_배포_URL_붙여넣기",
};
```

## 4. 테스트

- `index.html`은 **Live Server** 등으로 `http://localhost`에서 열기 (`file://`에서는 fetch가 제한될 수 있음)
- 문의 폼 제출 후 스프레드시트에 행이 추가되는지 확인

## 5. 코드 수정 후

Apps Script를 변경했다면 **배포** → **배포 관리** → **새 버전**으로 다시 배포해야 합니다.

## 6. 폼이 안 될 때 (404 / 서버 응답 오류)

- 브라우저에서 `/exec` URL을 열었을 때 **404**이면 배포가 삭제되었거나 URL이 바뀐 것입니다.
- **배포 → 배포 관리 → 웹 앱 → URL 복사** 후 `js/config.js` 갱신 → Git push 또는 `npx vercel deploy --prod`
- GET으로 `{"status":"ok",...}` JSON이 보여야 정상입니다.

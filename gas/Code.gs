/**
 * LUMEN 문의 폼 → Google 스프레드시트 저장
 *
 * [설정]
 * 1. 문의용 스프레드시트를 연 상태에서 확장 프로그램 > Apps Script 열기
 * 2. 이 파일 전체를 붙여넣고 저장
 * 3. 함수 doGet 선택 후 실행 → 권한 허용
 * 4. 배포 > 새 배포 > 웹 앱
 *    - 실행: 나
 *    - 액세스: 모든 사용자
 * 5. /exec URL을 js/config.js 의 GAS_ENDPOINT 에 넣기
 *
 * [시트]
 * 탭 이름: inquiries
 * 1행: created_at | name | email | message | privacy_agreed
 */

var SHEET_NAME = "inquiries";

var HEADERS = [
  "created_at",
  "name",
  "email",
  "message",
  "privacy_agreed",
];

/**
 * 브라우저에서 배포 URL을 열었을 때 (연동 테스트)
 */
function doGet() {
  return jsonOutput({
    status: "ok",
    message: "LUMEN inquiry API. POST JSON from the landing form.",
  });
}

/**
 * 랜딩 페이지 문의 제출 (POST)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOutput({ error: "요청 데이터가 없습니다." });
    }

    var payload = JSON.parse(e.postData.contents);

    // 스팸 방지 (honeypot)
    if (trimString(payload.website)) {
      return jsonOutput({ message: "접수되었습니다." });
    }

    var name = trimString(payload.name);
    var email = trimString(payload.email);
    var message = trimString(payload.message);
    var privacyAgreed = payload.privacy_agreed === true;

    if (name.length < 2 || name.length > 50) {
      return jsonOutput({ error: "이름을 2~50자로 입력해 주세요." });
    }
    if (!isValidEmail(email)) {
      return jsonOutput({ error: "올바른 이메일을 입력해 주세요." });
    }
    if (message.length < 10 || message.length > 2000) {
      return jsonOutput({ error: "문의 내용을 10~2000자로 입력해 주세요." });
    }
    if (!privacyAgreed) {
      return jsonOutput({ error: "개인정보 수집·이용에 동의해 주세요." });
    }

    var sheet = getInquiriesSheet();
    sheet.appendRow([new Date(), name, email, message, privacyAgreed]);

    return jsonOutput({
      message: "접수되었습니다.",
      id: sheet.getLastRow(),
    });
  } catch (error) {
    return jsonOutput({ error: "서버 처리 중 오류가 발생했습니다." });
  }
}

function getInquiriesSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaderRow(sheet);
  return sheet;
}

function ensureHeaderRow(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    return;
  }

  var firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var headerOk = HEADERS.every(function (title, index) {
    return String(firstRow[index]) === title;
  });

  if (!headerOk) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function trimString(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function isValidEmail(email) {
  if (!email || email.length > 255) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function jsonOutput(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON
  );
}

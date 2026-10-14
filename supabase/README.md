# Supabase 문의 폼 연동

Google 스프레드시트 대신 Supabase `inquiries` 테이블에 저장합니다.

## 자동 설정 (권장)

Supabase **계정 로그인**은 본인만 할 수 있습니다. 로그인 한 번 후 나머지는 스크립트가 처리합니다.

```powershell
cd "프로젝트 폴더"
npx supabase login
.\scripts\setup-supabase.ps1
```

프로젝트 생성·`schema.sql` 적용·`js/config.js` 작성까지 한 번에 됩니다.

이미 프로젝트가 있으면:

```powershell
.\scripts\setup-supabase.ps1 -ProjectRef "프로젝트_ref"
```

## 수동 설정

## 1. 프로젝트 만들기

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. **Project Settings → API**에서 다음 값을 복사:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** 키 → `SUPABASE_ANON_KEY`

## 2. 테이블·RLS

1. **SQL Editor**에서 [schema.sql](./schema.sql) 내용을 실행
2. **Table Editor**에서 `inquiries` 테이블이 생겼는지 확인

## 3. 프론트 설정

```bash
cp js/config.example.js js/config.js
```

`js/config.js`에 URL과 anon 키를 넣습니다. (`config.js`는 git에 올리지 않는 것을 권장)

## 4. 문의 확인

Supabase **Table Editor → inquiries**에서 행을 확인하거나, 웹 **관리자 페이지**를 사용합니다.

### 관리자 페이지 (역할 3종)

| 계정 (예시) | 역할 | admin_roles | 보이는 탭 |
|-------------|------|-------------|-----------|
| admin1@lumen.kr | 전체 | `super` | 접수 문의 + 게시판 |
| admin2@lumen.kr | 접수 문의 | `inquiries` | 접수 문의만 |
| admin3@lumen.kr | 게시판 | `board` | 게시판만 |

1. **Authentication → Users**에서 위 3명 생성 (비밀번호·Auto Confirm)
2. SQL Editor에서 [schema-admin-roles.sql](./schema-admin-roles.sql) 실행 (역할 테이블·RLS·INSERT)
3. `admin.html` 로그인

이메일은 SQL 파일에서 원하는 주소로 바꿀 수 있습니다.

주소 예: `http://localhost:5500/admin.html`

## 게시판 (회원 로그인)

1. SQL Editor에서 [schema-board.sql](./schema-board.sql) 실행
2. **Authentication → Providers → Email** 에서 이메일 가입 허용
3. 학습용으로 바로 로그인하려면 **Authentication → Sign In / Providers → Email** 에서 **Confirm email** 끄기 (선택)
4. `login.html` 회원가입 → `board.html` 에서 글 목록·작성

비로그인 시 게시판 접근 시 로그인 페이지로 이동합니다.

### 게시판 댓글

1. SQL Editor에서 [schema-comments.sql](./schema-comments.sql) 실행
2. 회원·관리자 모두 로그인 후 댓글 작성 가능
3. **admin.html → 게시판** 탭에서 관리자 댓글 작성·삭제 (관리자 이메일은 댓글 삭제 권한 포함)

## 참고

- anon 키는 브라우저에 노출됩니다. **RLS**로 INSERT만 허용하므로 일반 사용자는 목록을 읽을 수 없습니다.
- 로컬 테스트는 `http://localhost` 등으로 열어야 합니다 (`file://`는 CORS/전송 이슈 가능).

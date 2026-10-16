/**
 * 배포 후 이 파일을 config.js 로 복사하고 Supabase 값을 넣으세요.
 * config.js는 git에 올리지 않는 것을 권장합니다.
 */
window.LUMEN_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  // Legacy: anon (eyJ...) 또는 새 Publishable key (sb_publishable_...)
  SUPABASE_ANON_KEY: "YOUR_PUBLISHABLE_OR_ANON_KEY",
  // 관리자 권한은 Supabase admin_roles 테이블에서 설정 (schema-admin-roles.sql)
  //
  // AI 초안 — 로컬 Live Server: 아래 키를 넣으면 브라우저에서 바로 동작 (config.js는 git 제외).
  // OPENAI_API_KEY: "sk-...",
  //
  // Vercel 배포: Project Settings → OPENAI_API_KEY (서버). config.js에는 키 넣지 않음.
  // AI_API_URL: "https://your-project.vercel.app/api/ai-draft",
};

(function () {
  let client = null;

  window.getLumenSupabase = function () {
    const config = window.LUMEN_CONFIG || {};
    const url = (config.SUPABASE_URL || "").trim().replace(/\/$/, "");
    const key = (config.SUPABASE_ANON_KEY || "").trim();
    if (!url || !key) {
      throw new Error(
        "Supabase 설정이 없습니다. js/config.js를 확인해 주세요."
      );
    }
    if (!client) {
      client = window.supabase.createClient(url, key);
    }
    return client;
  };
})();

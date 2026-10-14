(function () {
  const boardLink = document.getElementById("nav-board-link");
  if (!boardLink || !window.supabase) return;

  boardLink.addEventListener("click", async function (e) {
    try {
      const sb = window.getLumenSupabase();
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        e.preventDefault();
        window.location.href =
          "login.html?redirect=" + encodeURIComponent("board.html");
      }
    } catch {
      e.preventDefault();
      window.location.href = "login.html?redirect=board.html";
    }
  });
})();

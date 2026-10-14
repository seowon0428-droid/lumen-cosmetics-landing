(function () {
  const link = document.getElementById("nav-auth-link");
  if (!link || !window.supabase) return;

  function setLoggedOut() {
    link.textContent = "Login";
    link.href = "login.html";
    link.removeAttribute("aria-current");
  }

  function setLoggedIn(email) {
    link.textContent = "Logout";
    link.href = "#";
    link.setAttribute("aria-label", "Logout (" + email + ")");
    link.onclick = async function (e) {
      e.preventDefault();
      try {
        const sb = window.getLumenSupabase();
        await sb.auth.signOut();
      } catch {
        /* ignore */
      }
      setLoggedOut();
      link.onclick = null;
      if (window.location.pathname.endsWith("board.html")) {
        window.location.href = "login.html";
      }
    };
  }

  (async function () {
    try {
      const sb = window.getLumenSupabase();
      const { data } = await sb.auth.getSession();
      if (data.session?.user?.email) {
        setLoggedIn(data.session.user.email);
      } else {
        setLoggedOut();
      }
    } catch {
      setLoggedOut();
    }
  })();
})();

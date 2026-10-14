(function () {
  const tabLogin = document.getElementById("tab-login");
  const tabSignup = document.getElementById("tab-signup");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginStatus = document.getElementById("login-status");
  const signupStatus = document.getElementById("signup-status");

  const redirectTo =
    new URLSearchParams(window.location.search).get("redirect") || "board.html";

  function setStatus(el, message, type) {
    el.textContent = message || "";
    el.className = "form-status" + (type ? " form-status--" + type : "");
  }

  function showLoginTab() {
    tabLogin.classList.add("is-active");
    tabSignup.classList.remove("is-active");
    tabLogin.setAttribute("aria-selected", "true");
    tabSignup.setAttribute("aria-selected", "false");
    loginForm.hidden = false;
    signupForm.hidden = true;
  }

  function showSignupTab() {
    tabSignup.classList.add("is-active");
    tabLogin.classList.remove("is-active");
    tabSignup.setAttribute("aria-selected", "true");
    tabLogin.setAttribute("aria-selected", "false");
    signupForm.hidden = false;
    loginForm.hidden = true;
  }

  tabLogin.addEventListener("click", showLoginTab);
  tabSignup.addEventListener("click", showSignupTab);

  if (new URLSearchParams(window.location.search).get("mode") === "signup") {
    showSignupTab();
  }

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus(loginStatus, "", "");
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const sb = window.getLumenSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = redirectTo;
    } catch (err) {
      setStatus(loginStatus, err.message || "로그인에 실패했습니다.", "error");
    }
  });

  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus(signupStatus, "", "");
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const passwordConfirm = document.getElementById(
      "signup-password-confirm"
    ).value;

    if (password !== passwordConfirm) {
      setStatus(signupStatus, "비밀번호가 일치하지 않습니다.", "error");
      return;
    }

    try {
      const sb = window.getLumenSupabase();
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
      if (data.session) {
        window.location.href = redirectTo;
        return;
      }
      setStatus(
        signupStatus,
        "가입되었습니다. 이메일 확인이 필요하면 메일함을 확인한 뒤 로그인해 주세요.",
        "success"
      );
      showLoginTab();
    } catch (err) {
      setStatus(signupStatus, err.message || "회원가입에 실패했습니다.", "error");
    }
  });

  (async function () {
    try {
      const sb = window.getLumenSupabase();
      const { data } = await sb.auth.getSession();
      if (data.session) {
        window.location.href = redirectTo;
      }
    } catch {
      /* stay on login */
    }
  })();
})();

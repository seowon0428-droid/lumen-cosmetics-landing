(function () {
  const composeSection = document.getElementById("compose-section");
  const boardUser = document.getElementById("board-user");
  const postForm = document.getElementById("post-form");
  const postStatus = document.getElementById("post-status");
  const postList = document.getElementById("post-list");
  const postEmpty = document.getElementById("post-empty");
  const listStatus = document.getElementById("list-status");

  let currentUser = null;

  function setStatus(el, message, type) {
    el.textContent = message || "";
    el.className = "form-status" + (type ? " form-status--" + type : "");
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function renderComments(comments) {
    const sorted = (comments || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    if (sorted.length === 0) {
      return '<p class="post-comments__empty">댓글 없음</p>';
    }
    return (
      '<ul class="post-comments">' +
      sorted
        .map(function (c) {
          return (
            '<li class="post-comment">' +
            '<p class="post-comment__meta">' +
            escapeHtml(formatDate(c.created_at)) +
            " · " +
            escapeHtml(c.author_email || "") +
            "</p>" +
            '<p class="post-comment__body">' +
            escapeHtml(c.body) +
            "</p>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  async function requireLogin() {
    const sb = window.getLumenSupabase();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    if (!data.session?.user) {
      window.location.replace(
        "login.html?redirect=" + encodeURIComponent("board.html")
      );
      return null;
    }
    return data.session.user;
  }

  async function loadPosts() {
    setStatus(listStatus, "", "");
    postList.innerHTML = "";
    postEmpty.hidden = true;

    const sb = window.getLumenSupabase();
    const { data, error } = await sb
      .from("posts")
      .select(
        "id, created_at, title, body, author_email, post_comments ( id, created_at, author_email, body )"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(
        listStatus,
        error.message +
          " — Supabase에서 schema-board.sql, schema-comments.sql 실행 여부를 확인해 주세요.",
        "error"
      );
      return;
    }

    if (!data || data.length === 0) {
      postEmpty.hidden = false;
      return;
    }

    postList.innerHTML = data
      .map(function (post) {
        return (
          '<li class="post-card" data-post-id="' +
          post.id +
          '">' +
          '<header class="post-card__head">' +
          "<h3 class=\"post-card__title\">" +
          escapeHtml(post.title) +
          "</h3>" +
          '<p class="post-card__meta">' +
          escapeHtml(formatDate(post.created_at)) +
          " · " +
          escapeHtml(post.author_email || "") +
          "</p>" +
          "</header>" +
          '<div class="post-card__body">' +
          escapeHtml(post.body) +
          "</div>" +
          '<section class="post-comments-section" aria-label="댓글">' +
          "<h4 class=\"post-comments__title\">댓글</h4>" +
          renderComments(post.post_comments) +
          '<form class="post-comment-form" data-comment-form="' +
          post.id +
          '">' +
          '<label class="visually-hidden" for="comment-body-' +
          post.id +
          '">댓글</label>' +
          '<textarea id="comment-body-' +
          post.id +
          '" rows="2" required minlength="1" maxlength="2000" placeholder="댓글을 입력하세요"></textarea>' +
          '<button type="submit" class="btn btn--small">댓글 등록</button>' +
          "</form>" +
          "</section>" +
          "</li>"
        );
      })
      .join("");
  }

  postList.addEventListener("submit", async function (e) {
    const form = e.target.closest("[data-comment-form]");
    if (!form) return;
    e.preventDefault();
    if (!currentUser) return;

    const postId = Number(form.getAttribute("data-comment-form"));
    const textarea = form.querySelector("textarea");
    const body = (textarea?.value || "").trim();
    if (!body) return;

    try {
      const sb = window.getLumenSupabase();
      const { error } = await sb.from("post_comments").insert({
        post_id: postId,
        author_id: currentUser.id,
        author_email: currentUser.email,
        body: body,
      });
      if (error) throw error;
      textarea.value = "";
      await loadPosts();
    } catch (err) {
      setStatus(listStatus, err.message || "댓글 등록에 실패했습니다.", "error");
    }
  });

  postForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus(postStatus, "", "");
    if (!currentUser) return;

    const title = document.getElementById("post-title").value.trim();
    const body = document.getElementById("post-body").value.trim();

    try {
      const sb = window.getLumenSupabase();
      const { error } = await sb.from("posts").insert({
        author_id: currentUser.id,
        author_email: currentUser.email,
        title: title,
        body: body,
      });
      if (error) throw error;
      postForm.reset();
      setStatus(postStatus, "등록되었습니다.", "success");
      await loadPosts();
    } catch (err) {
      setStatus(postStatus, err.message || "등록에 실패했습니다.", "error");
    }
  });

  (async function init() {
    try {
      currentUser = await requireLogin();
      if (!currentUser) return;

      boardUser.hidden = false;
      boardUser.textContent = "로그인: " + currentUser.email;
      composeSection.hidden = false;
      await loadPosts();
    } catch (err) {
      setStatus(listStatus, err.message || "오류가 발생했습니다.", "error");
    }
  })();
})();

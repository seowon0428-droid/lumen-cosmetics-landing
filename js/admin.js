(function () {
  const config = window.LUMEN_CONFIG || {};
  const supabaseUrl = (config.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabaseAnonKey = (config.SUPABASE_ANON_KEY || "").trim();
  const ROLE_LABELS = {
    super: "전체 관리",
    inquiries: "접수 문의",
    board: "게시판",
  };

  const loginPanel = document.getElementById("login-panel");
  const inquiriesPanel = document.getElementById("inquiries-panel");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const listStatus = document.getElementById("list-status");
  const boardStatus = document.getElementById("board-status");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const inquiriesBody = document.getElementById("inquiries-body");
  const inquiriesEmpty = document.getElementById("inquiries-empty");
  const sessionMeta = document.getElementById("admin-session-meta");
  const tabInquiries = document.getElementById("tab-inquiries");
  const tabBoard = document.getElementById("tab-board");
  const inquiriesSection = document.getElementById("inquiries-section");
  const boardSection = document.getElementById("board-section");
  const adminBoardList = document.getElementById("admin-board-list");
  const boardEmpty = document.getElementById("board-empty");

  let client = null;
  let adminUser = null;
  let adminRole = null;
  const adminTabsEl = document.querySelector(".admin-tabs");
  const inquiryById = new Map();
  const postById = new Map();

  function setStatus(el, message, type) {
    el.textContent = message || "";
    el.className = "form-status" + (type ? " form-status--" + type : "");
  }

  function formatDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleString("ko-KR", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function getAccessToken() {
    const sb = ensureClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }
    return token;
  }

  async function runAiDraft(button, payload, textarea, statusEl) {
    if (!window.LUMEN_AI?.generateDraft) {
      setStatus(statusEl, "AI 모듈을 불러오지 못했습니다.", "error");
      return;
    }
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "생성 중…";
    setStatus(statusEl, "", "");
    try {
      const token = await getAccessToken();
      const text = await window.LUMEN_AI.generateDraft(token, payload);
      textarea.value = text;
      textarea.focus();
      setStatus(statusEl, "AI 초안을 작성했습니다. 수정 후 저장하세요.", "success");
    } catch (err) {
      setStatus(statusEl, err.message || "AI 생성에 실패했습니다.", "error");
      statusEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function ensureClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase 설정이 없습니다. js/config.js를 확인해 주세요."
      );
    }
    if (!client) {
      client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    }
    return client;
  }

  function showLogin() {
    loginPanel.hidden = false;
    inquiriesPanel.hidden = true;
    logoutBtn.hidden = true;
  }

  const adminAiHint = document.getElementById("admin-ai-hint");

  function showDashboard(email, role) {
    loginPanel.hidden = true;
    inquiriesPanel.hidden = false;
    logoutBtn.hidden = false;
    const label = ROLE_LABELS[role] || role;
    sessionMeta.textContent = "로그인: " + email + " · " + label;
    if (adminAiHint) {
      adminAiHint.hidden = false;
    }
  }

  function canAccessInquiries(role) {
    return role === "super" || role === "inquiries";
  }

  function canAccessBoard(role) {
    return role === "super" || role === "board";
  }

  async function fetchAdminRole(userId) {
    const sb = ensureClient();
    const { data, error } = await sb
      .from("admin_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.role || null;
  }

  function applyRoleUI(role) {
    const inq = canAccessInquiries(role);
    const brd = canAccessBoard(role);
    tabInquiries.hidden = !inq;
    tabBoard.hidden = !brd;
    if (adminTabsEl) {
      adminTabsEl.hidden = !(inq && brd);
    }
    if (inq && brd) {
      showInquiriesTab();
      loadInquiries();
    } else if (inq) {
      showInquiriesTab();
      loadInquiries();
    } else if (brd) {
      showBoardTab();
      loadBoard();
    }
  }

  function showInquiriesTab() {
    tabInquiries.classList.add("is-active");
    tabBoard.classList.remove("is-active");
    tabInquiries.setAttribute("aria-selected", "true");
    tabBoard.setAttribute("aria-selected", "false");
    inquiriesSection.hidden = false;
    boardSection.hidden = true;
  }

  function showBoardTab() {
    tabBoard.classList.add("is-active");
    tabInquiries.classList.remove("is-active");
    tabBoard.setAttribute("aria-selected", "true");
    tabInquiries.setAttribute("aria-selected", "false");
    inquiriesSection.hidden = true;
    boardSection.hidden = false;
  }

  async function requireAdminSession() {
    const sb = ensureClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    const session = data.session;
    if (!session || !session.user) {
      showLogin();
      return null;
    }
    adminUser = session.user;
    const role = await fetchAdminRole(session.user.id);
    if (!role) {
      await sb.auth.signOut();
      throw new Error(
        "관리자 권한이 없습니다. Supabase에서 admin_roles를 설정했는지 확인하세요."
      );
    }
    adminRole = role;
    showDashboard(session.user.email, role);
    applyRoleUI(role);
    return session;
  }

  async function loadInquiries() {
    setStatus(listStatus, "", "");
    inquiriesBody.innerHTML = "";
    inquiriesEmpty.hidden = true;

    const sb = ensureClient();
    const { data, error } = await sb
      .from("inquiries")
      .select(
        "id, created_at, name, email, message, status, admin_reply, replied_at, replied_by"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(
        listStatus,
        error.message ||
          "문의 목록을 불러오지 못했습니다. schema-admin-roles.sql 실행 여부를 확인해 주세요.",
        "error"
      );
      return;
    }

    if (!data || data.length === 0) {
      inquiryById.clear();
      inquiriesEmpty.hidden = false;
      inquiriesEmpty.innerHTML =
        "표시할 문의가 없거나 조회 권한(RLS)이 없습니다. schema-admin.sql을 실행했는지 확인하세요.";
      return;
    }

    inquiryById.clear();
    data.forEach(function (row) {
      inquiryById.set(row.id, row);
    });
    inquiriesBody.innerHTML = data.map(renderInquiryRow).join("");
  }

  function renderInquiryStatus(row) {
    const isReplied = row.status === "replied";
    const label = isReplied ? "답변완료" : "신규";
    const cls = isReplied
      ? "inquiry-status--replied"
      : "inquiry-status--new";
    return (
      '<span class="inquiry-status ' + cls + '">' + label + "</span>"
    );
  }

  function renderInquiryReplyCell(row) {
    const meta =
      row.replied_at && row.replied_by
        ? '<p class="inquiry-reply-meta">마지막 답변: ' +
          escapeHtml(formatDate(row.replied_at)) +
          " · " +
          escapeHtml(row.replied_by) +
          "</p>"
        : "";
    const draft = row.admin_reply ? escapeHtml(row.admin_reply) : "";
    return (
      '<form class="inquiry-reply-form" data-inquiry-reply="' +
      row.id +
      '">' +
      '<label class="visually-hidden" for="reply-' +
      row.id +
      '">비고</label>' +
      '<textarea id="reply-' +
      row.id +
      '" required minlength="2" maxlength="2000" placeholder="담당 업무 메모·답변 초안을 입력하세요">' +
      draft +
      "</textarea>" +
      '<button type="submit" class="btn">답변 저장</button>' +
      meta +
      "</form>"
    );
  }

  function renderInquiryRow(row) {
    return (
      "<tr data-inquiry-id=\"" +
      row.id +
      '">' +
      '<td class="admin-table__ai">' +
      '<button type="button" class="btn btn--ai" data-ai-inquiry="' +
      row.id +
      '" title="AI로 비고 초안 작성">AI</button>' +
      "</td>" +
      "<td>" +
      escapeHtml(formatDate(row.created_at)) +
      "</td>" +
      "<td>" +
      escapeHtml(row.name) +
      "</td>" +
      '<td><a href="mailto:' +
      escapeHtml(row.email) +
      '">' +
      escapeHtml(row.email) +
      "</a></td>" +
      "<td>" +
      renderInquiryStatus(row) +
      "</td>" +
      '<td class="admin-table__message">' +
      escapeHtml(row.message) +
      "</td>" +
      "<td>" +
      renderInquiryReplyCell(row) +
      "</td>" +
      "</tr>"
    );
  }

  async function saveInquiryReply(inquiryId, replyText) {
    const sb = ensureClient();
    const { error } = await sb
      .from("inquiries")
      .update({
        admin_reply: replyText,
        status: "replied",
        replied_at: new Date().toISOString(),
        replied_by: adminUser.email,
      })
      .eq("id", inquiryId);
    if (error) throw error;
  }

  inquiriesBody.addEventListener("click", async function (e) {
    const aiBtn = e.target.closest("[data-ai-inquiry]");
    if (!aiBtn || !canAccessInquiries(adminRole)) return;

    const inquiryId = Number(aiBtn.getAttribute("data-ai-inquiry"));
    const row = inquiryById.get(inquiryId);
    const form = aiBtn.closest("tr")?.querySelector("[data-inquiry-reply]");
    const textarea = form?.querySelector("textarea");
    if (!row || !textarea) return;

    await runAiDraft(
      aiBtn,
      {
        kind: "inquiry_note",
        context: {
          created_at: row.created_at,
          name: row.name,
          email: row.email,
          message: row.message,
          status: row.status,
          admin_reply: row.admin_reply,
          replied_at: row.replied_at,
          replied_by: row.replied_by,
        },
      },
      textarea,
      listStatus
    );
  });

  inquiriesBody.addEventListener("submit", async function (e) {
    const form = e.target.closest("[data-inquiry-reply]");
    if (!form) return;
    e.preventDefault();
    if (!canAccessInquiries(adminRole)) return;

    const inquiryId = Number(form.getAttribute("data-inquiry-reply"));
    const textarea = form.querySelector("textarea");
    const replyText = (textarea?.value || "").trim();
    if (replyText.length < 2) {
      setStatus(listStatus, "답변은 2자 이상 입력해 주세요.", "error");
      return;
    }

    try {
      await saveInquiryReply(inquiryId, replyText);
      setStatus(listStatus, "답변이 저장되었습니다.", "success");
      await loadInquiries();
    } catch (err) {
      setStatus(
        listStatus,
        (err.message || "저장에 실패했습니다.") +
          " — schema-inquiries-reply.sql 실행 여부를 확인해 주세요.",
        "error"
      );
    }
  });

  function renderComments(comments) {
    const sorted = (comments || []).slice().sort(function (a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
    if (sorted.length === 0) {
      return '<p class="admin-meta">댓글 없음</p>';
    }
    return (
      '<ul class="admin-comments">' +
      sorted
        .map(function (c) {
          return (
            '<li class="admin-comment" data-comment-id="' +
            c.id +
            '">' +
            '<div class="admin-comment__body">' +
            '<div class="admin-comment__meta">' +
            escapeHtml(formatDate(c.created_at)) +
            " · " +
            escapeHtml(c.author_email || "") +
            "</div>" +
            escapeHtml(c.body) +
            "</div>" +
            '<button type="button" class="admin-comment__delete" data-delete-comment="' +
            c.id +
            '">삭제</button>' +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  async function loadBoard() {
    setStatus(boardStatus, "", "");
    adminBoardList.innerHTML = "";
    boardEmpty.hidden = true;

    const sb = ensureClient();
    const { data, error } = await sb
      .from("posts")
      .select(
        "id, created_at, title, body, author_email, post_comments ( id, created_at, author_email, body, author_id )"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setStatus(
        boardStatus,
        error.message +
          " — schema-board.sql, schema-comments.sql 실행 여부를 확인해 주세요.",
        "error"
      );
      return;
    }

    if (!data || data.length === 0) {
      postById.clear();
      boardEmpty.hidden = false;
      return;
    }

    postById.clear();
    data.forEach(function (post) {
      postById.set(post.id, post);
    });

    adminBoardList.innerHTML = data
      .map(function (post) {
        return (
          '<article class="admin-post-card" data-post-id="' +
          post.id +
          '">' +
          '<h2 class="admin-post-card__title">' +
          escapeHtml(post.title) +
          "</h2>" +
          '<p class="admin-post-card__meta">' +
          escapeHtml(formatDate(post.created_at)) +
          " · " +
          escapeHtml(post.author_email || "") +
          "</p>" +
          '<div class="admin-post-card__body">' +
          escapeHtml(post.body) +
          "</div>" +
          "<h3 class=\"admin-meta\">댓글</h3>" +
          renderComments(post.post_comments) +
          '<form class="admin-comment-form" data-comment-form="' +
          post.id +
          '">' +
          '<div class="admin-comment-form__head">' +
          '<label class="admin-meta" for="comment-' +
          post.id +
          '">관리자 댓글</label>' +
          '<button type="button" class="btn btn--ai btn--ai-sm" data-ai-comment="' +
          post.id +
          '" title="AI 댓글 초안">AI</button>' +
          "</div>" +
          '<textarea id="comment-' +
          post.id +
          '" required minlength="1" maxlength="2000" placeholder="댓글을 입력하세요"></textarea>' +
          '<button type="submit" class="btn">댓글 등록</button>' +
          "</form>" +
          "</article>"
        );
      })
      .join("");
  }

  async function addComment(postId, body) {
    const sb = ensureClient();
    const { error } = await sb.from("post_comments").insert({
      post_id: postId,
      author_id: adminUser.id,
      author_email: adminUser.email,
      body: body,
    });
    if (error) throw error;
  }

  async function deleteComment(commentId) {
    const sb = ensureClient();
    const { error } = await sb.from("post_comments").delete().eq("id", commentId);
    if (error) throw error;
  }

  adminBoardList.addEventListener("click", async function (e) {
    const aiBtn = e.target.closest("[data-ai-comment]");
    if (aiBtn && canAccessBoard(adminRole)) {
      const postId = Number(aiBtn.getAttribute("data-ai-comment"));
      const post = postById.get(postId);
      const form = aiBtn.closest("[data-comment-form]");
      const textarea = form?.querySelector("textarea");
      if (!post || !textarea) return;

      const comments = (post.post_comments || []).map(function (c) {
        return {
          created_at: c.created_at,
          author_email: c.author_email,
          body: c.body,
        };
      });

      await runAiDraft(
        aiBtn,
        {
          kind: "board_comment",
          context: {
            title: post.title,
            body: post.body,
            author_email: post.author_email,
            comments: comments,
          },
        },
        textarea,
        boardStatus
      );
      return;
    }

    const delBtn = e.target.closest("[data-delete-comment]");
    if (!delBtn) return;
    const commentId = delBtn.getAttribute("data-delete-comment");
    if (!commentId || !window.confirm("이 댓글을 삭제할까요?")) return;
    try {
      await deleteComment(commentId);
      await loadBoard();
    } catch (err) {
      setStatus(boardStatus, err.message || "삭제에 실패했습니다.", "error");
    }
  });

  adminBoardList.addEventListener("submit", async function (e) {
    const form = e.target.closest("[data-comment-form]");
    if (!form) return;
    e.preventDefault();
    const postId = Number(form.getAttribute("data-comment-form"));
    const textarea = form.querySelector("textarea");
    const body = (textarea?.value || "").trim();
    if (!body) return;
    try {
      await addComment(postId, body);
      textarea.value = "";
      await loadBoard();
      setStatus(boardStatus, "댓글이 등록되었습니다.", "success");
    } catch (err) {
      setStatus(boardStatus, err.message || "등록에 실패했습니다.", "error");
    }
  });

  tabInquiries.addEventListener("click", function () {
    if (!canAccessInquiries(adminRole)) return;
    showInquiriesTab();
    loadInquiries();
  });

  tabBoard.addEventListener("click", function () {
    if (!canAccessBoard(adminRole)) return;
    showBoardTab();
    loadBoard();
  });

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    setStatus(loginStatus, "", "");

    const email = (
      loginForm.querySelector('[name="email"]')?.value || ""
    )
      .toString()
      .trim();
    const password = (
      loginForm.querySelector('[name="password"]')?.value || ""
    ).toString();

    try {
      const sb = ensureClient();
      const { error } = await sb.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (error) throw error;
      await requireAdminSession();
    } catch (err) {
      setStatus(
        loginStatus,
        err.message || "로그인에 실패했습니다.",
        "error"
      );
    }
  });

  logoutBtn.addEventListener("click", async function () {
    try {
      const sb = ensureClient();
      await sb.auth.signOut();
    } catch {
      /* ignore */
    }
    adminUser = null;
    adminRole = null;
    showLogin();
    setStatus(loginStatus, "", "");
  });

  refreshBtn.addEventListener("click", function () {
    if (canAccessBoard(adminRole) && !boardSection.hidden) {
      loadBoard();
    } else if (canAccessInquiries(adminRole)) {
      loadInquiries();
    }
  });

  (async function init() {
    const emailInput = document.getElementById("admin-email");
    if (emailInput) {
      emailInput.value = "";
      emailInput.setAttribute("readonly", "readonly");
      emailInput.addEventListener("focus", function () {
        emailInput.removeAttribute("readonly");
      });
    }
    try {
      ensureClient();
      await requireAdminSession();
    } catch (err) {
      setStatus(loginStatus, err.message, "error");
      showLogin();
      if (emailInput) {
        emailInput.value = "";
      }
    }
  })();
})();

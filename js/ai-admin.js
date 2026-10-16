(function () {
  const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
  const DEFAULT_MODEL = "gpt-4o-mini";

  function buildMessages(kind, context) {
    if (kind === "inquiry_note") {
      const statusLabel = context.status === "replied" ? "답변완료" : "신규";
      const system =
        "당신은 스킨케어 브랜드 LUMEN의 내부 운영 어시스턴트입니다. " +
        "한국어로 담당자가 수행할 업무를 비고란에 적을 수 있게 작성합니다. " +
        "불릿 목록을 사용하고, 확인·연락·후속 조치를 구체적으로 제안합니다. " +
        "고객에게 보낼 답변 초안이 필요하면 마지막에 [고객 답변 초안] 섹션을 추가합니다.";
      const user =
        "접수일: " +
        (context.created_at || "") +
        "\n이름: " +
        (context.name || "") +
        "\n이메일: " +
        (context.email || "") +
        "\n상태: " +
        statusLabel +
        "\n문의 내용:\n" +
        (context.message || "") +
        (context.admin_reply
          ? "\n\n기존 비고/답변:\n" + context.admin_reply
          : "") +
        (context.replied_at
          ? "\n\n마지막 처리: " +
            context.replied_at +
            (context.replied_by ? " · " + context.replied_by : "")
          : "");
      return { system, user };
    }

    if (kind === "board_comment") {
      const commentsText = (context.comments || [])
        .map(function (c) {
          return (
            "- " +
            (c.created_at || "") +
            " " +
            (c.author_email || "") +
            ": " +
            (c.body || "")
          );
        })
        .join("\n");
      const system =
        "당신은 LUMEN 브랜드 게시판 관리자입니다. 게시글과 기존 댓글을 바탕으로 " +
        "관리자가 게시판에 달 댓글 초안을 한국어로 작성합니다. 공손하고 간결하게, 2~6문장.";
      const user =
        "제목: " +
        (context.title || "") +
        "\n작성자: " +
        (context.author_email || "") +
        "\n본문:\n" +
        (context.body || "") +
        (commentsText ? "\n\n기존 댓글:\n" + commentsText : "");
      return { system, user };
    }

    return null;
  }

  function getEndpoint() {
    const config = window.LUMEN_CONFIG || {};
    const custom = (config.AI_API_URL || "").trim();
    if (custom) {
      return custom.replace(/\/$/, "");
    }
    return "/api/ai-draft";
  }

  function getClientApiKey() {
    const config = window.LUMEN_CONFIG || {};
    return (config.OPENAI_API_KEY || "").trim();
  }

  async function callOpenAi(apiKey, kind, context) {
    const messages = buildMessages(kind, context);
    if (!messages) {
      throw new Error("잘못된 AI 요청입니다.");
    }

    const config = window.LUMEN_CONFIG || {};
    const model = (config.OPENAI_MODEL || DEFAULT_MODEL).trim();

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.6,
        messages: [
          { role: "system", content: messages.system },
          { role: "user", content: messages.user },
        ],
      }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      throw new Error(
        data?.error?.message ||
          "OpenAI 요청에 실패했습니다. (" + res.status + ")"
      );
    }

    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      throw new Error("AI가 빈 응답을 반환했습니다.");
    }
    return text;
  }

  async function generateDraftViaServer(accessToken, payload) {
    const res = await fetch(getEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + accessToken,
      },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      const err = new Error(
        data.error || "AI 서버 요청에 실패했습니다. (" + res.status + ")"
      );
      err.status = res.status;
      throw err;
    }

    return data.text || "";
  }

  async function generateDraft(accessToken, payload) {
    const clientKey = getClientApiKey();
    if (clientKey) {
      return callOpenAi(clientKey, payload.kind, payload.context || {});
    }

    try {
      return await generateDraftViaServer(accessToken, payload);
    } catch (err) {
      if (err.status === 404) {
        throw new Error(
          "AI API를 찾을 수 없습니다. Live Server로 열 때는 js/config.js에 OPENAI_API_KEY를 넣거나, npx vercel dev로 실행하세요."
        );
      }
      throw err;
    }
  }

  window.LUMEN_AI = {
    generateDraft: generateDraft,
    hasLocalKey: function () {
      return !!getClientApiKey();
    },
  };
})();

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

function setCors(res, req) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function getAdminRole(accessToken) {
  const supabaseUrl = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabaseKey = (process.env.SUPABASE_ANON_KEY || "").trim();
  if (!supabaseUrl || !supabaseKey || !accessToken) {
    return null;
  }

  const userRes = await fetch(supabaseUrl + "/auth/v1/user", {
    headers: {
      Authorization: "Bearer " + accessToken,
      apikey: supabaseKey,
    },
  });
  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user?.id) return null;

  const roleRes = await fetch(
    supabaseUrl +
      "/rest/v1/admin_roles?user_id=eq." +
      encodeURIComponent(user.id) +
      "&select=role",
    {
      headers: {
        Authorization: "Bearer " + accessToken,
        apikey: supabaseKey,
      },
    }
  );
  if (!roleRes.ok) return null;
  const rows = await roleRes.json();
  return rows?.[0]?.role || null;
}

function roleAllowed(role, kind) {
  if (!role) return false;
  if (role === "super") return true;
  if (kind === "inquiry_note") {
    return role === "inquiries";
  }
  if (kind === "board_comment") {
    return role === "board";
  }
  return false;
}

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

module.exports = async function handler(req, res) {
  setCors(res, req);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!openaiKey) {
    res.status(500).json({
      error:
        "OPENAI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수 또는 .env.local을 확인하세요.",
    });
    return;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const role = await getAdminRole(token);
  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const kind = body.kind;
  const context = body.context || {};

  if (!roleAllowed(role, kind)) {
    res.status(403).json({ error: "관리자 권한이 없습니다." });
    return;
  }

  const messages = buildMessages(kind, context);
  if (!messages) {
    res.status(400).json({ error: "잘못된 요청입니다." });
    return;
  }

  try {
    const aiRes = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + openaiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        temperature: 0.6,
        messages: [
          { role: "system", content: messages.system },
          { role: "user", content: messages.user },
        ],
      }),
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      const msg =
        data?.error?.message || "AI 요청에 실패했습니다. (" + aiRes.status + ")";
      res.status(502).json({ error: msg });
      return;
    }

    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) {
      res.status(502).json({ error: "AI가 빈 응답을 반환했습니다." });
      return;
    }

    res.status(200).json({ text: text });
  } catch (err) {
    res.status(500).json({
      error: err.message || "AI 처리 중 오류가 발생했습니다.",
    });
  }
};

(function () {
  const form = document.getElementById("inquiry-form");
  const submitBtn = document.getElementById("submit-btn");
  const formStatus = document.getElementById("form-status");

  const config = window.LUMEN_CONFIG || {};
  const supabaseUrl = (config.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const supabaseAnonKey = (config.SUPABASE_ANON_KEY || "").trim();

  function getFieldErrorEl(name) {
    return form.querySelector('.field-error[data-for="' + name + '"]');
  }

  function setFieldError(name, message) {
    const el = getFieldErrorEl(name);
    if (el) el.textContent = message || "";
  }

  function clearErrors() {
    ["name", "email", "message"].forEach(function (name) {
      setFieldError(name, "");
    });
    formStatus.textContent = "";
    formStatus.className = "form-status";
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validateForm(data) {
    let valid = true;

    if (!data.name || data.name.length < 2 || data.name.length > 50) {
      setFieldError("name", "이름을 2~50자로 입력해 주세요.");
      valid = false;
    }

    if (!data.email || !isValidEmail(data.email)) {
      setFieldError("email", "올바른 이메일을 입력해 주세요.");
      valid = false;
    }

    if (!data.message || data.message.length < 10 || data.message.length > 2000) {
      setFieldError("message", "문의 내용을 10~2000자로 입력해 주세요.");
      valid = false;
    }

    if (!data.privacy_agreed) {
      formStatus.textContent = "개인정보 수집·이용에 동의해 주세요.";
      formStatus.className = "form-status form-status--error";
      valid = false;
    }

    return valid;
  }

  function setStatus(message, type) {
    formStatus.textContent = message;
    formStatus.className = "form-status form-status--" + type;
  }

  async function submitToSupabase(payload) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase 설정이 없습니다. js/config.js에 SUPABASE_URL과 SUPABASE_ANON_KEY를 입력해 주세요."
      );
    }

    if (payload.website) {
      return;
    }

    let response;
    try {
      const headers = {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      };
      if (supabaseAnonKey.startsWith("eyJ")) {
        headers.Authorization = "Bearer " + supabaseAnonKey;
      }

      response = await fetch(supabaseUrl + "/rest/v1/inquiries", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          message: payload.message,
          privacy_agreed: payload.privacy_agreed,
        }),
      });
    } catch {
      throw new Error(
        "네트워크 오류입니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해 주세요."
      );
    }

    if (response.ok) {
      return;
    }

    let detail = "";
    try {
      const body = await response.json();
      if (body && body.message) {
        detail = body.message;
      }
    } catch {
      /* ignore */
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Supabase 인증 또는 RLS 정책 오류입니다. anon 키와 schema.sql 실행 여부를 확인해 주세요."
      );
    }

    if (response.status === 404) {
      throw new Error(
        "inquiries 테이블을 찾을 수 없습니다. supabase/schema.sql을 SQL Editor에서 실행해 주세요."
      );
    }

    throw new Error(detail || "제출에 실패했습니다.");
  }

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      clearErrors();

      const formData = new FormData(form);
      const payload = {
        name: (formData.get("name") || "").toString().trim(),
        email: (formData.get("email") || "").toString().trim(),
        message: (formData.get("message") || "").toString().trim(),
        privacy_agreed: formData.get("privacy_agreed") === "on",
        website: (formData.get("website") || "").toString().trim(),
      };

      if (!validateForm(payload)) {
        return;
      }

      submitBtn.disabled = true;
      setStatus("전송 중…", "success");

      try {
        await submitToSupabase(payload);
        form.reset();
        setStatus("접수되었습니다. 빠른 시일 내에 답변드리겠습니다.", "success");
      } catch (err) {
        setStatus(err.message || "제출 중 오류가 발생했습니다.", "error");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();

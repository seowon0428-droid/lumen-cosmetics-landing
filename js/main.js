(function () {
  const form = document.getElementById("inquiry-form");
  const submitBtn = document.getElementById("submit-btn");
  const formStatus = document.getElementById("form-status");

  const config = window.LUMEN_CONFIG || {};
  const endpoint = (config.GAS_ENDPOINT || "").trim();

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

  async function submitToSheet(payload) {
    if (!endpoint) {
      throw new Error(
        "Google Apps Script URL이 설정되지 않았습니다. js/config.js의 GAS_ENDPOINT를 입력해 주세요."
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error("서버 응답을 처리할 수 없습니다.");
    }

    if (!response.ok || body.error) {
      throw new Error(body.error || "제출에 실패했습니다.");
    }

    return body;
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
        await submitToSheet(payload);
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

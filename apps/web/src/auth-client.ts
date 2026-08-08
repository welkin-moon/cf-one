export const AUTH_JS = String.raw`
const root = document.documentElement;
const app = document.querySelector("#app");
const account = document.querySelector("#account");
const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");
const navSheet = document.querySelector("#nav-sheet");
const moreNav = document.querySelector("#more-nav");
let session = null;
let submitting = false;

function h(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function clear(node) { node?.replaceChildren(); }
function base64url(bytes) { let value = ""; for (const byte of bytes) value += String.fromCharCode(byte); return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""); }
function fromBase64url(value) { const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4); return Uint8Array.from(atob(padded), c => c.charCodeAt(0)); }

async function deriveVerifier(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64url(salt), iterations }, material, 256);
  return base64url(new Uint8Array(bits));
}

async function proof(verifier, challenge) {
  const key = await crypto.subtle.importKey("raw", fromBase64url(verifier), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(challenge))));
}

function friendly(raw, status) {
  const message = String(raw || "").toLowerCase();
  const known = [
    ["invalid owner credentials", "用户名或密码不正确"],
    ["invalid credentials", "用户名或密码不正确"],
    ["valid email required", "请输入有效的邮箱地址"],
    ["invalid invite code", "邀请码不正确"],
    ["account disabled", "这个账号已停用"],
    ["account unavailable", "这个账号当前不可用"],
    ["login challenge expired", "登录验证已过期，正在重新获取"],
    ["valid login challenge required", "登录验证无效，正在重新获取"],
    ["valid owner login challenge required", "登录验证无效，正在重新获取"],
    ["too many requests", "尝试次数太多，请稍等一会再试"],
    ["registration is disabled", "当前暂时不能创建新账号"],
    ["session_secret", "登录服务配置暂时不可用"]
  ];
  for (const [needle, text] of known) if (message.includes(needle)) return text;
  if (status === 429) return "尝试次数太多，请稍等一会再试";
  if (status >= 500) return "登录服务暂时出现问题，请稍后再试";
  return raw || "登录没有成功，请重试";
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const headers = new Headers(options.headers || {});
    headers.set("accept", "application/json");
    let body = options.body;
    if (body && typeof body !== "string") {
      headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }
    const response = await fetch(path, { ...options, body, headers, credentials: "same-origin", cache: "no-store", signal: controller.signal });
    const type = response.headers.get("content-type") || "";
    const payload = type.includes("json") ? await response.json() : await response.text();
    if (!response.ok) {
      const raw = payload && typeof payload === "object" && payload.error ? payload.error : "请求失败";
      const error = new Error(friendly(raw, response.status));
      error.status = response.status;
      error.raw = String(raw || "");
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeout = new Error("网络响应超时，请检查连接后重试");
      timeout.status = 0;
      timeout.raw = "network timeout";
      throw timeout;
    }
    throw error;
  } finally { clearTimeout(timer); }
}

function setupTheme() {
  const stored = localStorage.getItem("lms-theme");
  root.dataset.theme = ["system", "light", "dark"].includes(stored) ? stored : "system";
  const media = matchMedia("(prefers-color-scheme: dark)");
  const update = () => {
    const mode = root.dataset.theme || "system";
    const dark = mode === "dark" || (mode === "system" && media.matches);
    themeColor?.setAttribute("content", dark ? "#141218" : "#fffbfe");
    if (themeToggle) {
      themeToggle.textContent = mode === "system" ? "◐" : mode === "light" ? "☀" : "☾";
      themeToggle.setAttribute("aria-label", mode === "system" ? "显示模式：跟随系统" : mode === "light" ? "显示模式：浅色" : "显示模式：深色");
    }
  };
  update();
  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "system" ? "light" : root.dataset.theme === "light" ? "dark" : "system";
    localStorage.setItem("lms-theme", root.dataset.theme);
    update();
  });
  media.addEventListener?.("change", update);
}

function setupNavigation() {
  if (moreNav && navSheet) moreNav.addEventListener("click", () => navSheet.showModal());
  navSheet?.querySelector("[data-close-sheet]")?.addEventListener("click", () => navSheet.close());
  navSheet?.addEventListener("click", event => { if (event.target === navSheet) navSheet.close(); });
}

function passwordField(label, name, autocomplete, placeholder) {
  const input = h("input", { name, type: "password", autocomplete, placeholder, required: true, maxlength: 256 });
  const toggle = h("button", { class: "password-toggle", type: "button", text: "显示", onclick: () => {
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    toggle.textContent = visible ? "显示" : "隐藏";
  }});
  return h("label", { class: "field" }, h("span", { class: "field-label", text: label }), h("span", { class: "field-control password-control" }, input, toggle));
}

function textField(label, name, type, placeholder, required = true) {
  return h("label", { class: "field" }, h("span", { class: "field-label", text: label }), h("span", { class: "field-control" }, h("input", { name, type, placeholder, required, autocomplete: name === "email" ? "username" : "off" })));
}

function refreshAdminNavigation() {
  const admin = Boolean(session && session.role === "admin");
  document.body.classList.toggle("is-admin", admin);
  const adminMore = document.querySelector("[data-admin-more]");
  if (adminMore) adminMore.hidden = !admin;
}

function updateAccount() {
  if (!account) return;
  clear(account);
  refreshAdminNavigation();
  if (!session) {
    account.append(h("span", { class: "pill", text: "未登录" }));
    return;
  }
  account.append(h("span", { class: "pill success", text: session.owner ? "admin" : session.email }));
}

function renderSignedIn() {
  app?.setAttribute("aria-busy", "false");
  clear(app);
  app?.append(h("div", { class: "auth-layout" },
    h("section", { class: "auth-card" },
      h("h2", { text: "已经登录" }),
      h("p", { text: session.owner ? "当前使用站主账号。" : "当前会话有效，可以直接继续使用。" }),
      h("div", { class: "row" },
        h("a", { class: "button filled", href: "/", text: "返回首页" }),
        h("button", { class: "button text", type: "button", text: "退出登录", onclick: async () => {
          try { await api("/api/auth/logout", { method: "POST", headers: { "x-csrf-token": session.csrf } }); location.reload(); }
          catch (error) { console.warn("logout failed", error?.status || 0); }
        }})
      )
    )
  ));
}

function challengeRetryable(error) {
  const raw = String(error?.raw || "").toLowerCase();
  return error?.status === 403 && (raw.includes("challenge expired") || raw.includes("already used")) ||
    error?.status === 400 && raw.includes("valid login challenge");
}

function renderLogin() {
  app?.setAttribute("aria-busy", "false");
  clear(app);
  const message = h("div", { class: "auth-message", role: "status", "aria-live": "polite" });
  const identifierField = textField("用户名或邮箱", "email", "text", "admin 或 you@example.com");
  const password = passwordField("密码", "password", "current-password", "输入密码");
  const registration = h("div", { class: "stack", hidden: true },
    h("div", { class: "callout", text: "这是这个邮箱第一次加入。再填写显示名称和邀请码即可创建账号。" }),
    textField("显示名称", "displayName", "text", "你希望别人看到的名字", false),
    passwordField("邀请码", "inviteCode", "one-time-code", "输入邀请码")
  );
  const submit = h("button", { class: "button filled", type: "submit", text: "登录" });
  const form = h("form", null, identifierField, password, registration, message, submit);
  const identifier = identifierField.querySelector("input");

  const setMessage = (text, error = false, success = false) => {
    message.textContent = text || "";
    message.className = "auth-message" + (error ? " error" : success ? " success" : "");
  };

  const resetRegistration = () => {
    if (registration.hidden) return;
    registration.hidden = true;
    submit.textContent = "登录";
    setMessage("");
  };
  identifier?.addEventListener("input", resetRegistration);

  async function runHandshake(values, loginName, passwordValue, allowDiscoverRegistration) {
    setMessage("正在获取登录验证…");
    const challenge = await api("/api/auth/challenge", { method: "POST", body: { email: loginName } });
    if (challenge.mode !== "login" && allowDiscoverRegistration && registration.hidden) {
      return { needsRegistration: true };
    }
    setMessage(challenge.iterations >= 200000 ? "正在计算密码验证，请稍候…" : "正在验证密码…");
    const verifier = await deriveVerifier(passwordValue, challenge.salt, challenge.iterations);
    const loginProof = await proof(verifier, challenge.challenge);
    const payload = { email: loginName, challengeId: challenge.challengeId, proof: loginProof };
    if (challenge.mode !== "login") {
      payload.verifier = verifier;
      payload.displayName = String(values.displayName || "");
      payload.inviteCode = String(values.inviteCode || "");
    }
    setMessage("正在建立会话…");
    await api("/api/auth/login", { method: "POST", body: payload });
    return { needsRegistration: false };
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitting) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const loginName = String(values.email || "").trim().toLowerCase();
    const passwordValue = String(values.password || "");
    if (!loginName) return setMessage("请输入用户名或邮箱", true);
    if (!passwordValue || passwordValue.length > 256) return setMessage("请输入有效密码", true);
    if (loginName !== "admin" && passwordValue.length < 10) return setMessage("成员密码至少需要 10 个字符", true);
    if (!registration.hidden && !String(values.inviteCode || "")) return setMessage("请输入邀请码", true);

    submitting = true;
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    submit.textContent = registration.hidden ? "正在登录…" : "正在创建…";
    try {
      let result;
      try {
        result = await runHandshake(values, loginName, passwordValue, true);
      } catch (error) {
        if (!challengeRetryable(error)) throw error;
        setMessage("登录验证刚好失效，正在自动重试…");
        result = await runHandshake(values, loginName, passwordValue, false);
      }
      if (result.needsRegistration) {
        registration.hidden = false;
        submit.textContent = "创建账号";
        setMessage("检测到这是首次加入，请补充邀请码后继续。", false, true);
        registration.querySelector("input[name=displayName]")?.focus();
        return;
      }
      setMessage("凭据已验证，正在确认会话…");
      const check = await api("/api/auth/session");
      if (!check?.session) {
        const error = new Error("凭据已验证，但浏览器没有保存登录会话。请允许此站点使用 Cookie 后重试。");
        error.status = 0;
        throw error;
      }
      session = check.session;
      updateAccount();
      setMessage("登录成功，正在进入首页…", false, true);
      location.replace("/");
    } catch (error) {
      setMessage(error?.message || "登录没有成功，请重试", true);
    } finally {
      submitting = false;
      submit.disabled = false;
      form.removeAttribute("aria-busy");
      submit.textContent = registration.hidden ? "登录" : "创建账号";
    }
  });

  app?.append(h("div", { class: "auth-layout" },
    h("section", { class: "auth-card" },
      h("h2", { text: "登录" }),
      h("p", { text: "输入账号信息继续；首次加入时才会出现邀请码。" }),
      form
    )
  ));
  identifier?.focus();
}

async function clearLegacyCaches() {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith("cf-one-")).map(key => caches.delete(key)));
    }
  } catch {}
}

async function start() {
  setupTheme();
  setupNavigation();
  clearLegacyCaches();
  try { session = (await api("/api/auth/session")).session; } catch { session = null; }
  updateAccount();
  if (session) renderSignedIn(); else renderLogin();
}

start();
`;

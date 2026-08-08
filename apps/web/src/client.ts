export const APP_JS = String.raw`
const page = document.body.dataset.page || "home";
const app = document.querySelector("#app");
const account = document.querySelector("#account");
const toast = document.querySelector("#toast");
const root = document.documentElement;
const themeToggle = document.querySelector("#theme-toggle");
const themeColor = document.querySelector("#theme-color");
const navSheet = document.querySelector("#nav-sheet");
const moreNav = document.querySelector("#more-nav");
const confirmDialog = document.querySelector("#confirm-dialog");
const confirmTitle = document.querySelector("#confirm-title");
const confirmMessage = document.querySelector("#confirm-message");
const confirmAccept = document.querySelector("#confirm-accept");
let session = null;
let pollTimer = null;
let toastTimer = null;

function h(tag, attributes, ...children) {
  const element = document.createElement(tag);
  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === "class") element.className = value;
      else if (key === "text") element.textContent = value;
      else if (key.startsWith("on") && typeof value === "function") element.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value === true) element.setAttribute(key, "");
      else element.setAttribute(key, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

function clear(element) { if (element) element.replaceChildren(); }
function setReady() { if (app) app.setAttribute("aria-busy", "false"); }
function formatDate(value) { return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—"; }
function field(label, name, type, placeholder, required, help) {
  const tag = type === "textarea" ? "textarea" : "input";
  const control = h(tag, { name, type: tag === "input" ? type : null, placeholder, required, autocomplete: type === "password" ? "current-password" : null });
  return h("label", { class: "field" }, h("span", { class: "field-label", text: label }), h("span", { class: "field-control" }, control), help ? h("span", { class: "field-help", text: help }) : null);
}
function formValues(form) { return Object.fromEntries(new FormData(form).entries()); }
function panel(title, description, ...children) {
  return h("section", { class: "panel" }, h("h2", { text: title }), description ? h("p", { class: "panel-description", text: description }) : null, ...children);
}
function output(value) { return h("pre", { class: "output", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }); }
function emptyState(title, description, icon) {
  return h("div", { class: "empty-state" }, h("span", { class: "empty-icon", text: icon || "·" }), h("div", null, h("h3", { text: title }), h("p", { text: description })));
}
function setBusy(button, label) {
  const previous = button.textContent;
  button.disabled = true;
  button.textContent = label;
  return () => { button.disabled = false; button.textContent = previous; };
}

function friendlyMessage(raw, status) {
  const message = String(raw || "").toLowerCase();
  const known = [
    ["invalid credentials", "用户名或密码不正确"],
    ["valid email required", "请输入有效的邮箱地址"],
    ["invalid invite code", "邀请码不正确"],
    ["account disabled", "这个账号已停用"],
    ["account unavailable", "这个账号当前不可用"],
    ["authentication required", "请先登录"],
    ["admin required", "需要管理员权限"],
    ["site owner required", "只有站主可以执行这个操作"],
    ["owner required", "只有站主可以执行这个操作"],
    ["too many requests", "操作太频繁，请稍后再试"],
    ["login challenge expired", "登录请求已过期，请重新提交"],
    ["could not allocate an unused mirror hostname", "暂时没有可分配的镜像地址，请稍后再试"],
    ["active mirror limit", "你已经达到当前可用的镜像数量上限"],
    ["mirror self-service is disabled", "镜像申请暂时关闭"],
    ["cloudflare", "域名服务暂时不可用，请稍后再试"]
  ];
  for (const [needle, replacement] of known) if (message.includes(needle)) return replacement;
  if (status === 500) return "服务暂时出现问题，请稍后再试";
  if (status === 503) return "这个功能暂时不可用";
  if (status === 403) return "当前账号没有执行这个操作的权限";
  if (status === 404) return "没有找到你要的内容";
  return raw || "请求没有成功，请稍后再试";
}

function showToast(message, error) {
  if (!toast) return;
  if (toastTimer) window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "snackbar show" + (error ? " error" : "");
  toastTimer = window.setTimeout(() => { toast.className = "snackbar"; }, 3800);
}

function confirmAction(title, message, destructive) {
  if (!confirmDialog || typeof confirmDialog.showModal !== "function") return Promise.resolve(false);
  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAccept.textContent = destructive ? "确认移除" : "确认";
  confirmAccept.className = destructive ? "button danger" : "button filled";
  return new Promise(resolve => {
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "confirm"), { once: true });
    confirmDialog.showModal();
  });
}

function setupTheme() {
  const stored = localStorage.getItem("lms-theme");
  const initial = ["system", "light", "dark"].includes(stored) ? stored : "system";
  root.dataset.theme = initial;
  const media = matchMedia("(prefers-color-scheme: dark)");
  function update() {
    const mode = root.dataset.theme || "system";
    const dark = mode === "dark" || (mode === "system" && media.matches);
    if (themeColor) themeColor.setAttribute("content", dark ? "#141218" : "#fffbfe");
    if (themeToggle) {
      themeToggle.textContent = mode === "system" ? "◐" : mode === "light" ? "☀" : "☾";
      themeToggle.setAttribute("aria-label", mode === "system" ? "显示模式：跟随系统" : mode === "light" ? "显示模式：浅色" : "显示模式：深色");
      themeToggle.title = themeToggle.getAttribute("aria-label");
    }
  }
  update();
  if (themeToggle) themeToggle.addEventListener("click", () => {
    const next = root.dataset.theme === "system" ? "light" : root.dataset.theme === "light" ? "dark" : "system";
    root.dataset.theme = next;
    localStorage.setItem("lms-theme", next);
    update();
  });
  media.addEventListener?.("change", update);
}

function setupNavigation() {
  const links = navSheet ? navSheet.querySelectorAll("a") : [];
  if (!links.length && moreNav) moreNav.hidden = true;
  if (moreNav && navSheet) moreNav.addEventListener("click", () => navSheet.showModal());
  navSheet?.querySelector("[data-close-sheet]")?.addEventListener("click", () => navSheet.close());
  navSheet?.addEventListener("click", event => { if (event.target === navSheet) navSheet.close(); });
}

function bytesToBase64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64urlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}
async function deriveVerifier(password, salt, iterations) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: base64urlToBytes(salt), iterations }, material, 256);
  return bytesToBase64url(new Uint8Array(bits));
}
async function makeProof(verifier, challenge) {
  const key = await crypto.subtle.importKey("raw", base64urlToBytes(verifier), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(challenge));
  return bytesToBase64url(new Uint8Array(signature));
}

async function api(path, options) {
  const init = Object.assign({ credentials: "same-origin" }, options || {});
  const headers = new Headers(init.headers || {});
  headers.set("accept", "application/json");
  if (init.body && !(init.body instanceof FormData) && typeof init.body !== "string") {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(init.body);
  }
  if (session && session.csrf && !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase())) headers.set("x-csrf-token", session.csrf);
  init.headers = headers;
  const response = await fetch(path, init);
  const type = response.headers.get("content-type") || "";
  const body = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    const raw = body && typeof body === "object" && body.error ? body.error : "请求失败";
    const error = new Error(friendlyMessage(raw, response.status));
    error.status = response.status;
    throw error;
  }
  return body;
}

function updateAccount() {
  if (!account) return;
  clear(account);
  document.body.classList.toggle("is-admin", Boolean(session && session.role === "admin"));
  if (!session) {
    account.append(h("a", { href: "/app/login", class: "button tonal", text: "登录" }));
    return;
  }
  const label = session.owner ? "admin" : session.email;
  account.append(h("span", { class: "pill" }, h("span", { class: "status-dot " + (session.deviceChanged ? "warn" : "ok") }), h("span", { class: "account-name", text: label })));
  account.append(h("button", { class: "icon-button", type: "button", title: "退出登录", "aria-label": "退出登录", text: "↪", onclick: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); location.href = "/"; }
    catch (error) { showToast(error.message, true); }
  }}));
}

async function loadSession() {
  try { session = (await api("/api/auth/session")).session; }
  catch { session = null; }
  updateAccount();
}

function requireLogin() {
  if (session) return true;
  setReady();
  clear(app);
  app?.append(panel("需要登录", "登录后才能打开这个功能。", h("a", { class: "button filled", href: "/app/login", text: "前往登录" })));
  return false;
}

function renderLogin() {
  setReady();
  clear(app);
  let pending = null;
  const identifierField = field("用户名或邮箱", "email", "text", "admin 或 you@example.com", true);
  const passwordField = field("密码", "password", "password", "输入密码", true);
  const registration = h("div", { class: "stack", hidden: true },
    h("div", { class: "callout", text: "这是这个邮箱第一次加入。填写邀请码后即可创建账号。" }),
    field("显示名称", "displayName", "text", "你希望别人看到的名字", false),
    field("邀请码", "inviteCode", "password", "输入邀请码", true)
  );
  const submit = h("button", { class: "button filled", type: "submit", text: "继续" });
  const form = h("form", null, identifierField, passwordField, registration, submit);
  const identifier = identifierField.querySelector("input");
  const password = passwordField.querySelector("input");

  function resetRegistration() {
    if (!pending) return;
    pending = null;
    registration.hidden = true;
    submit.textContent = "继续";
  }
  identifier.addEventListener("input", resetRegistration);
  password.addEventListener("input", resetRegistration);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const values = formValues(form);
    const loginName = String(values.email || "").trim().toLowerCase();
    const passwordValue = String(values.password || "");
    if (!loginName) return showToast("请输入用户名或邮箱", true);
    if (!passwordValue || passwordValue.length > 256) return showToast("请输入有效密码", true);
    if (loginName !== "admin" && passwordValue.length < 10) return showToast("成员密码至少需要 10 个字符", true);
    const restore = setBusy(submit, pending ? "正在创建账号…" : "正在验证…");
    try {
      let challenge;
      let verifier;
      if (pending) {
        challenge = pending.challenge;
        verifier = pending.verifier;
      } else {
        challenge = await api("/api/auth/challenge", { method: "POST", body: { email: loginName } });
        verifier = await deriveVerifier(passwordValue, challenge.salt, challenge.iterations);
        if (challenge.mode !== "login") {
          pending = { challenge, verifier };
          registration.hidden = false;
          submit.textContent = "创建账号";
          registration.querySelector("input[name=displayName]")?.focus();
          showToast("还差一步：填写邀请码即可加入");
          return;
        }
      }
      const proof = await makeProof(verifier, challenge.challenge);
      const login = { email: loginName, displayName: values.displayName, inviteCode: values.inviteCode, challengeId: challenge.challengeId, proof };
      if (challenge.mode !== "login") login.verifier = verifier;
      await api("/api/auth/login", { method: "POST", body: login });
      location.href = "/";
    } catch (error) {
      if (pending && error.status === 403) resetRegistration();
      showToast(error.message, true);
    } finally { restore(); if (pending && !registration.hidden) submit.textContent = "创建账号"; }
  });

  app?.append(h("div", { class: "split" }, panel("欢迎回来", "使用站点账号继续。", form), panel("第一次来？", "成员第一次加入时会需要邀请码；之后只需要邮箱和密码。", h("div", { class: "callout", text: "如果登录环境变化较大，系统可能会要求你重新登录。" }))));
}

async function renderChat() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const roomList = h("div", { class: "list" });
  const detail = h("section", { class: "panel" }, emptyState("选择一个聊天", "从左侧选择房间，或者先创建一个。", "◫"));
  const createForm = h("form", null, field("新房间", "name", "text", "例如：Lunar friends", true), h("button", { class: "button tonal", type: "submit", text: "创建房间" }));
  createForm.addEventListener("submit", async event => {
    event.preventDefault();
    const button = createForm.querySelector("button");
    const restore = setBusy(button, "创建中…");
    try { await api("/api/chat/rooms", { method: "POST", body: formValues(createForm) }); createForm.reset(); await loadRooms(); showToast("房间已创建"); }
    catch (error) { showToast(error.message, true); }
    finally { restore(); }
  });
  app?.append(h("div", { class: "split" }, panel("聊天", "选择房间或新建一个。", createForm, roomList), detail));

  async function loadRooms() {
    const rooms = (await api("/api/chat/rooms")).rooms;
    clear(roomList);
    if (!rooms.length) return roomList.append(emptyState("还没有聊天", "创建第一个房间后，它会出现在这里。", "+"));
    for (const room of rooms) {
      roomList.append(h("button", { class: "list-item", onclick: event => selectRoom(room, event.currentTarget) },
        h("strong", { text: room.name }), h("div", { class: "muted tiny", text: String(room.member_count) + " 位成员 · " + formatDate(room.last_message_at || room.created_at) })
      ));
    }
  }

  async function selectRoom(room, button) {
    for (const item of roomList.children) item.classList.remove("active");
    button.classList.add("active");
    if (pollTimer) window.clearInterval(pollTimer);
    clear(detail);
    const messages = h("div", { class: "messages" });
    const messageForm = h("form", null, field("消息", "body", "textarea", "写点什么…", true), h("button", { class: "button filled", type: "submit", text: "发送" }));
    const memberForm = h("form", { class: "row" }, h("input", { name: "email", type: "email", placeholder: "添加成员邮箱", required: true }), h("button", { class: "button tonal", type: "submit", text: "添加" }));
    detail.append(h("div", { class: "row between" }, h("div", null, h("h2", { text: room.name }), h("span", { class: "muted tiny", text: String(room.member_count) + " 位成员" }))), memberForm, messages, messageForm);
    memberForm.addEventListener("submit", async event => {
      event.preventDefault();
      try { await api("/api/chat/rooms/" + room.id + "/members", { method: "POST", body: formValues(memberForm) }); memberForm.reset(); showToast("成员已加入"); }
      catch (error) { showToast(error.message, true); }
    });
    messageForm.addEventListener("submit", async event => {
      event.preventDefault();
      const send = messageForm.querySelector("button");
      const restore = setBusy(send, "发送中…");
      try { await api("/api/chat/rooms/" + room.id + "/messages", { method: "POST", body: formValues(messageForm) }); messageForm.reset(); await loadMessages(true); }
      catch (error) { showToast(error.message, true); }
      finally { restore(); }
    });
    async function loadMessages(scroll) {
      try {
        const rows = (await api("/api/chat/rooms/" + room.id + "/messages")).messages;
        clear(messages);
        if (!rows.length) messages.append(emptyState("还没有消息", "发第一条消息吧。", "◫"));
        for (const message of rows) messages.append(h("article", { class: "message" + (message.author_id === session.id ? " mine" : "") },
          h("header", null, h("strong", { text: message.author_name || message.author }), h("time", { text: formatDate(message.created_at) })),
          h("p", { text: message.body })
        ));
        if (scroll) messages.scrollTop = messages.scrollHeight;
      } catch (error) { if (error.status !== 401) showToast(error.message, true); }
    }
    await loadMessages(true);
    pollTimer = window.setInterval(() => { if (!document.hidden) loadMessages(false); }, 12000);
  }
  await loadRooms();
}

async function renderSocial() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const friendList = h("div", { class: "list" });
  const feed = h("div", { class: "stack" });
  const friendForm = h("form", null, field("朋友邮箱", "email", "email", "friend@example.com", true), h("button", { class: "button tonal", type: "submit", text: "发送请求" }));
  const postForm = h("form", null, field("新动态", "body", "textarea", "今天发生了什么？", true), h("label", { class: "field" }, h("span", { class: "field-label", text: "谁可以看" }), h("select", { name: "visibility" }, h("option", { value: "friends", text: "好友" }), h("option", { value: "private", text: "仅自己" }))), h("button", { class: "button filled", type: "submit", text: "发布" }));
  app?.append(h("div", { class: "split" }, panel("朋友", "添加朋友并处理收到的请求。", friendForm, friendList), h("div", { class: "stack" }, panel("分享近况", "选择可见范围后发布。", postForm), panel("最近动态", null, feed))));
  friendForm.addEventListener("submit", async event => {
    event.preventDefault();
    try { await api("/api/social/friends/requests", { method: "POST", body: formValues(friendForm) }); friendForm.reset(); await loadFriends(); showToast("请求已发送"); }
    catch (error) { showToast(error.message, true); }
  });
  postForm.addEventListener("submit", async event => {
    event.preventDefault();
    try { await api("/api/social/posts", { method: "POST", body: formValues(postForm) }); postForm.reset(); await loadFeed(); showToast("已发布"); }
    catch (error) { showToast(error.message, true); }
  });
  async function loadFriends() {
    const friends = (await api("/api/social/friends")).friends;
    clear(friendList);
    if (!friends.length) return friendList.append(emptyState("还没有朋友", "输入邮箱发送第一条好友请求。", "+"));
    for (const friend of friends) {
      const state = friend.status === "accepted" ? "好友" : friend.direction === "incoming" ? "等待你确认" : "等待对方确认";
      const actions = [];
      if (friend.status === "pending" && friend.direction === "incoming") actions.push(h("button", { class: "button tonal", text: "接受", onclick: async () => { await api("/api/social/friends/requests/" + friend.id + "/accept", { method: "POST" }); await loadFriends(); await loadFeed(); } }));
      friendList.append(h("div", { class: "list-item" }, h("div", { class: "row between" }, h("strong", { text: friend.display_name || friend.email }), h("span", { class: "pill", text: state })), h("div", { class: "muted tiny", text: friend.email }), ...actions));
    }
  }
  async function loadFeed() {
    const posts = (await api("/api/social/feed")).posts;
    clear(feed);
    if (!posts.length) return feed.append(emptyState("这里还很安静", "添加朋友或发一条自己的近况。", "✦"));
    for (const post of posts) {
      const like = h("button", { class: "button text tiny", text: (post.liked ? "♥ " : "♡ ") + post.like_count, onclick: async () => { await api("/api/social/posts/" + post.id + "/like", { method: "POST" }); await loadFeed(); } });
      feed.append(h("article", { class: "post" }, h("header", null, h("strong", { text: post.author_name || post.author }), h("span", { text: formatDate(post.created_at) + " · " + (post.visibility === "private" ? "仅自己" : "好友") })), h("div", { class: "body", text: post.body }), like));
    }
  }
  await Promise.all([loadFriends(), loadFeed()]);
}

function renderTools() {
  setReady();
  clear(app);
  function tool(title, description, controls, result) { return panel(title, description, controls, result); }
  const uuidOut = output("点击按钮生成");
  const uuidControls = h("button", { class: "button filled", text: "生成 UUID", onclick: async () => { uuidOut.textContent = (await api("/api/tools/uuid")).uuid; } });
  const baseInput = h("textarea", { placeholder: "输入文本或 Base64" });
  const baseOut = output("");
  const baseControls = h("div", { class: "stack" }, baseInput, h("div", { class: "row" }, h("button", { class: "button tonal", text: "编码", onclick: async () => { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "encode", value: baseInput.value } })).value; } }), h("button", { class: "button tonal", text: "解码", onclick: async () => { try { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "decode", value: baseInput.value } })).value; } catch (error) { showToast(error.message, true); } } })));
  const hashInput = h("textarea", { placeholder: "输入文本" });
  const hashOut = output("");
  const hashControls = h("div", { class: "stack" }, hashInput, h("button", { class: "button tonal", text: "计算 SHA-256", onclick: async () => { hashOut.textContent = (await api("/api/tools/hash", { method: "POST", body: { value: hashInput.value } })).sha256; } }));
  const jsonInput = h("textarea", { placeholder: "粘贴 JSON" });
  const jsonOut = output("");
  const jsonControls = h("div", { class: "stack" }, jsonInput, h("button", { class: "button tonal", text: "格式化", onclick: () => { try { jsonOut.textContent = JSON.stringify(JSON.parse(jsonInput.value), null, 2); } catch { showToast("这段内容不是有效 JSON", true); } } }));
  app?.append(h("div", { class: "tool-grid" }, tool("UUID", "生成一个新的唯一标识。", uuidControls, uuidOut), tool("Base64", "在文本与 Base64 之间转换。", baseControls, baseOut), tool("SHA-256", "计算文本摘要。", hashControls, hashOut), tool("JSON", "检查并整理 JSON。", jsonControls, jsonOut)));
}

async function renderMail() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const messages = h("div", { class: "list" });
  const children = [panel("最近邮件", "打开一封邮件可以查看原始内容。", messages)];
  if (session.role === "admin") {
    const sendForm = h("form", null, field("发件地址", "from", "email", "hello@lunarlab.uk", true), field("收件地址", "to", "email", "friend@example.com", true), field("主题", "subject", "text", "主题", true), field("正文", "text", "textarea", "写点什么…", true), h("button", { class: "button filled", type: "submit", text: "发送" }));
    sendForm.addEventListener("submit", async event => { event.preventDefault(); const button = sendForm.querySelector("button"); const restore = setBusy(button, "发送中…"); try { await api("/api/mail/send", { method: "POST", body: formValues(sendForm) }); sendForm.reset(); showToast("邮件已发送"); } catch (error) { showToast(error.message, true); } finally { restore(); } });
    children.unshift(panel("发送邮件", "选择已允许的发件和收件地址。", sendForm));
  }
  app?.append(h("div", { class: "stack" }, ...children));
  try {
    const rows = (await api("/api/mail/messages")).messages;
    clear(messages);
    if (!rows.length) return messages.append(emptyState("还没有邮件", "收到的邮件会显示在这里。", "✉"));
    for (const message of rows) messages.append(h("a", { class: "list-item", href: "/api/mail/messages/" + message.id + "/raw" }, h("strong", { text: message.sender }), h("div", { class: "muted tiny", text: "发给 " + message.recipient + " · " + formatDate(message.received_at) })));
  } catch (error) { messages.append(emptyState("邮件暂时不可用", error.message, "!")); }
}

async function renderMirror() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const list = h("div", { class: "list" });
  const form = h("form", null,
    field("目标网站", "origin", "url", "https://example.com/", true, "只填写网站根地址，不要带路径、账号或密码。"),
    field("名称", "label", "text", "可选备注", false),
    h("button", { class: "button filled", type: "submit", text: "申请地址" })
  );
  app?.append(h("div", { class: "split" },
    panel("申请镜像", "地址会按 m1、m2… 的顺序分配；已经被使用的地址会自动跳过。", form),
    panel(session.owner ? "全部镜像" : "我的镜像", "可以打开正在使用的地址，也可以随时移除。", list)
  ));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const restore = setBusy(button, "正在申请…");
    try {
      const created = await api("/api/mirror/targets", { method: "POST", body: formValues(form) });
      form.reset();
      showToast("已分配 " + created.target.hostname);
      await load();
    } catch (error) { showToast(error.message, true); }
    finally { restore(); }
  });
  async function load() {
    const response = await api("/api/mirror/targets");
    clear(list);
    if (!response.targets.length) return list.append(emptyState("还没有镜像", "提交一个目标网站后，新地址会出现在这里。", "↗"));
    for (const target of response.targets) {
      const states = { active: "可用", pending: "正在准备", suspended: "已移除", rejected: "未能创建", expired: "已过期" };
      const open = target.state === "active" ? h("a", { class: "button tonal", href: target.url, target: "_blank", rel: "noreferrer", text: "打开" }) : null;
      const remove = ["active", "pending"].includes(target.state) ? h("button", { class: "button danger", text: "移除", onclick: async () => {
        const confirmed = await confirmAction("移除镜像？", target.hostname + " 将停止访问。这个操作不会影响其他地址。", true);
        if (!confirmed) return;
        try { await api("/api/mirror/targets/" + target.id, { method: "DELETE" }); await load(); showToast("镜像已移除"); }
        catch (error) { showToast(error.message, true); }
      }}) : null;
      list.append(h("div", { class: "list-item" },
        h("div", { class: "row between" }, h("strong", { text: target.hostname }), h("span", { class: "pill " + (target.state === "active" ? "success" : ""), text: states[target.state] || target.state })),
        h("div", { class: "muted tiny", text: target.label + " · " + target.origin }),
        h("div", { class: "row" }, open, remove)
      ));
    }
  }
  try { await load(); } catch (error) { list.append(emptyState("暂时无法加载", error.message, "!")); }
}

function renderStore() {
  setReady();
  clear(app);
  const install = h("button", { class: "button filled", text: "查看安装方法", onclick: () => showToast("手机浏览器可从分享菜单选择“添加到主屏幕”；桌面浏览器通常会在地址栏提供安装入口。") });
  app?.append(h("div", { class: "stack" }, panel("安装到设备", "把本站像普通应用一样放到主屏幕或桌面。", install), panel("更多应用", "以后添加的网页应用会集中显示在这里。", emptyState("暂时没有其他应用", "有新的可安装内容时会显示在这里。", "▦"))));
}

async function renderAdmin() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  if (session.role !== "admin") { app?.append(panel("没有管理权限", "当前账号不能打开站点管理。", h("a", { class: "button tonal", href: "/", text: "返回首页" }))); return; }

  const statusSection = h("div", { class: "status-grid" });
  const sections = h("div", { class: "stack" }, panel("站点状态", "这里只显示功能是否可用，不展示任何凭据或配置值。", statusSection));
  app?.append(sections);

  try {
    const status = await api("/api/admin/status");
    const checks = [
      ["账号登录", Boolean(status.capabilities?.sessionSigningConfigured && status.capabilities?.ownerPasswordConfigured)],
      ["域名管理", Boolean(status.capabilities?.cloudflareApiConfigured && status.capabilities?.accountConfigured && status.capabilities?.managedZoneScopeConfigured)],
      ["邮件", Boolean(status.bindings?.r2 || status.bindings?.emailSend)]
    ];
    for (const [label, ok] of checks) statusSection.append(h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: label }), h("strong", null, h("span", { class: "status-dot " + (ok ? "ok" : "warn") }), ok ? "可用" : "未启用")));
  } catch (error) { statusSection.append(emptyState("状态暂时不可用", error.message, "!")); }

  if (!session.owner) {
    sections.append(panel("管理员账号", "你可以使用管理员功能；成员权限和域名设置只由站主修改。", h("span", { class: "pill success", text: "管理员" })));
    return;
  }

  const users = h("div", { class: "list" });
  sections.append(panel("成员与权限", "站主可以调整成员角色或停用账号。", users));
  async function loadUsers() {
    const response = await api("/api/admin/users");
    clear(users);
    for (const user of response.users || []) {
      const isOwner = Boolean(user.owner);
      const roleLabel = isOwner ? "站主" : user.role === "admin" ? "管理员" : "成员";
      const statusLabel = user.status === "active" ? "正常" : "已停用";
      const actions = [];
      if (!isOwner) {
        actions.push(h("button", { class: "button tonal", text: user.role === "admin" ? "改为成员" : "设为管理员", onclick: async () => {
          const next = user.role === "admin" ? "member" : "admin";
          const confirmed = await confirmAction("修改成员权限？", user.email + " 将变为" + (next === "admin" ? "管理员" : "普通成员") + "。", false);
          if (!confirmed) return;
          try { await api("/api/admin/users/" + user.id, { method: "PATCH", body: { role: next } }); await loadUsers(); showToast("权限已更新"); } catch (error) { showToast(error.message, true); }
        }}));
        actions.push(h("button", { class: user.status === "active" ? "button danger" : "button tonal", text: user.status === "active" ? "停用" : "恢复", onclick: async () => {
          const next = user.status === "active" ? "disabled" : "active";
          const confirmed = await confirmAction(next === "disabled" ? "停用账号？" : "恢复账号？", user.email + (next === "disabled" ? " 将立即失去访问权限。" : " 将重新获得访问权限。"), next === "disabled");
          if (!confirmed) return;
          try { await api("/api/admin/users/" + user.id, { method: "PATCH", body: { status: next } }); await loadUsers(); showToast("账号状态已更新"); } catch (error) { showToast(error.message, true); }
        }}));
      }
      users.append(h("div", { class: "list-item" }, h("div", { class: "row between" }, h("div", null, h("strong", { text: user.display_name || user.email }), h("div", { class: "muted tiny", text: isOwner ? "admin" : user.email })), h("div", { class: "row" }, h("span", { class: "pill", text: roleLabel }), h("span", { class: "pill " + (user.status === "active" ? "success" : "error"), text: statusLabel }))), actions.length ? h("div", { class: "row" }, ...actions) : null));
    }
  }
  try { await loadUsers(); } catch (error) { users.append(emptyState("成员列表暂时不可用", error.message, "!")); }

  const zones = h("div", { class: "list" });
  const recordsPanel = panel("记录", "先选择一个域名。", emptyState("选择域名", "选中左侧域名后即可查看和修改记录。", "⌂"));
  sections.append(h("div", { class: "split" }, panel("域名", "选择要管理的域名。", zones), recordsPanel));
  try {
    const response = await api("/api/admin/cf/zones");
    for (const zone of response.result || []) zones.append(h("button", { class: "list-item", onclick: event => { for (const item of zones.children) item.classList.remove("active"); event.currentTarget.classList.add("active"); loadRecords(zone); } }, h("strong", { text: zone.name }), h("div", { class: "muted tiny", text: zone.status === "active" ? "正常" : "状态：" + zone.status })));
    if (!(response.result || []).length) zones.append(emptyState("没有可管理的域名", "当前站点没有可用的域名管理权限。", "⌂"));
  } catch (error) { zones.append(emptyState("域名暂时不可用", error.message, "!")); }

  async function loadRecords(zone) {
    clear(recordsPanel);
    recordsPanel.append(h("h2", { text: zone.name }), h("p", { class: "panel-description", text: "新增记录前会要求确认；删除也需要再次确认。" }));
    const create = h("form", null,
      h("label", { class: "field" }, h("span", { class: "field-label", text: "类型" }), h("select", { name: "type" }, ...["A", "AAAA", "CNAME", "TXT", "MX"].map(type => h("option", { value: type, text: type })))),
      field("名称", "name", "text", "name." + zone.name, true),
      field("内容", "content", "text", "记录内容", true),
      field("优先级", "priority", "number", "仅 MX 需要，例如 10", false),
      h("button", { class: "button filled", type: "submit", text: "添加记录" })
    );
    const table = h("div", { class: "table-wrap" });
    recordsPanel.append(create, table);
    create.addEventListener("submit", async event => {
      event.preventDefault();
      const body = formValues(create);
      body.confirmation = "CREATE " + String(body.name).toLowerCase();
      const confirmed = await confirmAction("添加这条记录？", String(body.type) + "  " + String(body.name), false);
      if (!confirmed) return;
      try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records", { method: "POST", body }); create.reset(); await refresh(); showToast("记录已添加"); }
      catch (error) { showToast(error.message, true); }
    });
    async function refresh() {
      const rows = (await api("/api/admin/cf/zones/" + zone.id + "/dns-records")).result || [];
      clear(table);
      if (!rows.length) return table.append(emptyState("还没有记录", "为这个域名添加第一条记录。", "+"));
      const body = h("tbody");
      for (const record of rows) {
        const remove = h("button", { class: "button danger", text: "删除", onclick: async () => {
          const confirmed = await confirmAction("删除这条记录？", record.type + "  " + record.name + "\n" + record.content, true);
          if (!confirmed) return;
          try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records/" + record.id, { method: "DELETE", body: { confirmation: "DELETE " + record.id } }); await refresh(); showToast("记录已删除"); }
          catch (error) { showToast(error.message, true); }
        }});
        body.append(h("tr", null, h("td", { text: record.type }), h("td", { text: record.name }), h("td", { text: record.content }), h("td", null, remove)));
      }
      table.append(h("table", null, h("thead", null, h("tr", null, h("th", { text: "类型" }), h("th", { text: "名称" }), h("th", { text: "内容" }), h("th", { text: "操作" }))), body));
    }
    try { await refresh(); } catch (error) { table.append(emptyState("记录暂时不可用", error.message, "!")); }
  }
}

async function start() {
  setupTheme();
  setupNavigation();
  await loadSession();
  const handlers = { login: renderLogin, chat: renderChat, social: renderSocial, tools: renderTools, mail: renderMail, mirror: renderMirror, store: renderStore, admin: renderAdmin };
  if (handlers[page]) {
    try { await handlers[page](); }
    catch (error) { setReady(); clear(app); app?.append(panel("暂时打不开", "这个页面加载时遇到了问题。", h("div", { class: "callout", text: error.message || "请稍后再试" }))); }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}

window.addEventListener("beforeunload", () => { if (pollTimer) window.clearInterval(pollTimer); });
start();
`;

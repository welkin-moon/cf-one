export const APP_JS = String.raw`
const page = document.body.dataset.page || "home";
const app = document.querySelector("#app");
const account = document.querySelector("#account");
const toast = document.querySelector("#toast");
let session = null;
let pollTimer = null;

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
    if (child === null || child === undefined) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

function clear(element) { if (element) element.replaceChildren(); }
function formatDate(value) { return value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "—"; }
function field(label, name, type, placeholder, required) {
  return h("label", null, label, h(type === "textarea" ? "textarea" : "input", { name, type: type === "textarea" ? null : type, placeholder, required }));
}
function formValues(form) { return Object.fromEntries(new FormData(form).entries()); }
function showToast(message, error) {
  toast.textContent = message;
  toast.className = "toast show" + (error ? " error" : "");
  window.setTimeout(() => { toast.className = "toast"; }, 3600);
}
function panel(title, ...children) { return h("section", { class: "panel" }, h("h2", { text: title }), ...children); }
function output(value) { return h("pre", { class: "output", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }); }

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
    const message = body && typeof body === "object" && body.error ? body.error : "Request failed (" + response.status + ")";
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return body;
}

function updateAccount() {
  clear(account);
  const dot = h("span", { class: "status-dot" });
  account.append(dot);
  if (!session) {
    account.className = "account";
    account.append(h("a", { href: "/app/login", text: "登录" }));
    return;
  }
  account.className = "account " + (session.deviceChanged ? "warn" : "online");
  account.append(h("span", { text: session.email }));
  const logout = h("button", { class: "tiny", text: "退出", onclick: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); location.href = "/"; }
    catch (error) { showToast(error.message, true); }
  }});
  account.append(logout);
}

async function loadSession() {
  try { session = (await api("/api/auth/session")).session; }
  catch { session = null; }
  updateAccount();
}

function requireLogin() {
  if (session) return true;
  clear(app);
  app.append(panel("需要登录", h("p", { class: "muted", text: "这个功能只对站内成员开放。" }), h("a", { class: "button primary", href: "/app/login", text: "前往登录" })));
  return false;
}

function renderLogin() {
  clear(app);
  const form = h("form", null,
    field("邮箱", "email", "email", "you@example.com", true),
    field("显示名称（首次注册）", "displayName", "text", "诗诗", false),
    field("密码", "password", "password", "至少 10 个字符", true),
    field("邀请码（仅首次注册或升级旧账号）", "inviteCode", "password", "已有账号可留空", false),
    h("button", { class: "primary", type: "submit", text: "登录 / 创建账号" })
  );
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const values = formValues(form);
      if (String(values.password || "").length < 10 || String(values.password || "").length > 256) throw new Error("密码必须为 10–256 个字符");
      button.textContent = "正在生成登录证明…";
      const challenge = await api("/api/auth/challenge", { method: "POST", body: { email: values.email } });
      const verifier = await deriveVerifier(String(values.password), challenge.salt, challenge.iterations);
      const proof = await makeProof(verifier, challenge.challenge);
      const login = { email: values.email, displayName: values.displayName, inviteCode: values.inviteCode, challengeId: challenge.challengeId, proof };
      if (challenge.mode !== "login") login.verifier = verifier;
      await api("/api/auth/login", { method: "POST", body: login });
      location.href = "/";
    } catch (error) { showToast(error.message, true); button.disabled = false; button.textContent = "登录 / 创建账号"; }
  });
  app.append(h("div", { class: "split" }, panel("成员登录", form), panel("安全说明",
    h("div", { class: "callout", text: "PBKDF2 密钥拉伸在你的浏览器完成，Worker 只验证一次性挑战证明；加密后的验证器存进 D1。签名 Cookie 为 HttpOnly、Secure、SameSite=Lax。浏览器特征只检测设备变化，不会单独当作身份。" }),
    h("p", { class: "muted tiny", text: "若管理员启用 strict 设备绑定，浏览器或语言环境显著变化后需要重新登录。" })
  )));
}

async function renderChat() {
  if (!requireLogin()) return;
  clear(app);
  const roomList = h("div", { class: "list" });
  const detail = h("section", { class: "panel" }, h("p", { class: "muted", text: "选择一个房间开始聊天。" }));
  const createForm = h("form", null, field("新房间", "name", "text", "例如：Lunar friends", true), h("button", { type: "submit", text: "创建" }));
  createForm.addEventListener("submit", async event => {
    event.preventDefault();
    try { await api("/api/chat/rooms", { method: "POST", body: formValues(createForm) }); createForm.reset(); await loadRooms(); }
    catch (error) { showToast(error.message, true); }
  });
  app.append(h("div", { class: "split" }, panel("房间", createForm, roomList), detail));

  async function loadRooms() {
    const rooms = (await api("/api/chat/rooms")).rooms;
    clear(roomList);
    if (!rooms.length) roomList.append(h("p", { class: "muted", text: "还没有房间。" }));
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
    const messageInput = field("消息", "body", "textarea", "写点什么…", true);
    const messageForm = h("form", null, messageInput, h("button", { class: "primary", type: "submit", text: "发送" }));
    const memberForm = h("form", { class: "row" }, h("input", { name: "email", type: "email", placeholder: "添加成员邮箱", required: true }), h("button", { type: "submit", text: "添加" }));
    detail.append(h("div", { class: "row between" }, h("h2", { text: room.name }), h("span", { class: "pill", text: String(room.member_count) + " members" })), memberForm, messages, messageForm);
    memberForm.addEventListener("submit", async event => {
      event.preventDefault();
      try { await api("/api/chat/rooms/" + room.id + "/members", { method: "POST", body: formValues(memberForm) }); memberForm.reset(); showToast("成员已加入"); }
      catch (error) { showToast(error.message, true); }
    });
    messageForm.addEventListener("submit", async event => {
      event.preventDefault();
      try { await api("/api/chat/rooms/" + room.id + "/messages", { method: "POST", body: formValues(messageForm) }); messageForm.reset(); await loadMessages(true); }
      catch (error) { showToast(error.message, true); }
    });
    async function loadMessages(scroll) {
      try {
        const rows = (await api("/api/chat/rooms/" + room.id + "/messages")).messages;
        clear(messages);
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
  clear(app);
  const friendList = h("div", { class: "list" });
  const feed = h("div", { class: "stack" });
  const friendForm = h("form", null, field("朋友邮箱", "email", "email", "friend@example.com", true), h("button", { type: "submit", text: "发送请求" }));
  const postForm = h("form", null, field("新动态", "body", "textarea", "今天发生了什么？", true), h("label", null, "可见范围", h("select", { name: "visibility" }, h("option", { value: "friends", text: "好友" }), h("option", { value: "private", text: "仅自己" }))), h("button", { class: "primary", type: "submit", text: "发布" }));
  app.append(h("div", { class: "split" }, panel("朋友", friendForm, friendList), h("div", { class: "stack" }, panel("发布", postForm), panel("时间线", feed))));
  friendForm.addEventListener("submit", async event => {
    event.preventDefault();
    try { await api("/api/social/friends/requests", { method: "POST", body: formValues(friendForm) }); friendForm.reset(); await loadFriends(); showToast("请求已处理"); }
    catch (error) { showToast(error.message, true); }
  });
  postForm.addEventListener("submit", async event => {
    event.preventDefault();
    try { await api("/api/social/posts", { method: "POST", body: formValues(postForm) }); postForm.reset(); await loadFeed(); }
    catch (error) { showToast(error.message, true); }
  });
  async function loadFriends() {
    const friends = (await api("/api/social/friends")).friends;
    clear(friendList);
    if (!friends.length) friendList.append(h("p", { class: "muted", text: "好友列表还是空的。" }));
    for (const friend of friends) {
      const actions = [];
      if (friend.status === "pending" && friend.direction === "incoming") actions.push(h("button", { text: "接受", onclick: async () => { await api("/api/social/friends/requests/" + friend.id + "/accept", { method: "POST" }); await loadFriends(); await loadFeed(); } }));
      friendList.append(h("div", { class: "list-item" }, h("div", { class: "row between" }, h("strong", { text: friend.display_name || friend.email }), h("span", { class: "pill", text: friend.status })), h("div", { class: "muted tiny", text: friend.email }), ...actions));
    }
  }
  async function loadFeed() {
    const posts = (await api("/api/social/feed")).posts;
    clear(feed);
    if (!posts.length) feed.append(h("p", { class: "muted", text: "还没有可见动态。添加朋友或发第一条吧。" }));
    for (const post of posts) {
      const like = h("button", { class: "tiny", text: (post.liked ? "♥ " : "♡ ") + post.like_count, onclick: async () => { await api("/api/social/posts/" + post.id + "/like", { method: "POST" }); await loadFeed(); } });
      feed.append(h("article", { class: "post" }, h("header", null, h("strong", { text: post.author_name || post.author }), h("span", null, formatDate(post.created_at), " · ", post.visibility)), h("div", { class: "body", text: post.body }), like));
    }
  }
  await Promise.all([loadFriends(), loadFeed()]);
}

function renderTools() {
  clear(app);
  function tool(title, controls, result) { return panel(title, controls, result); }
  const uuidOut = output("点击生成");
  const uuidControls = h("button", { class: "primary", text: "生成 UUID", onclick: async () => { uuidOut.textContent = (await api("/api/tools/uuid")).uuid; } });
  const baseInput = h("textarea", { placeholder: "输入文本或 Base64" });
  const baseOut = output("");
  const baseControls = h("div", { class: "stack" }, baseInput, h("div", { class: "row" }, h("button", { text: "编码", onclick: async () => { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "encode", value: baseInput.value } })).value; } }), h("button", { text: "解码", onclick: async () => { try { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "decode", value: baseInput.value } })).value; } catch (error) { showToast(error.message, true); } } })));
  const hashInput = h("textarea", { placeholder: "输入文本" });
  const hashOut = output("");
  const hashControls = h("div", { class: "stack" }, hashInput, h("button", { text: "计算 SHA-256", onclick: async () => { hashOut.textContent = (await api("/api/tools/hash", { method: "POST", body: { value: hashInput.value } })).sha256; } }));
  const jsonInput = h("textarea", { placeholder: "粘贴 JSON" });
  const jsonOut = output("");
  const jsonControls = h("div", { class: "stack" }, jsonInput, h("button", { text: "格式化（本地）", onclick: () => { try { jsonOut.textContent = JSON.stringify(JSON.parse(jsonInput.value), null, 2); } catch (error) { showToast(error.message, true); } } }));
  app.append(h("div", { class: "tool-grid" }, tool("UUID", uuidControls, uuidOut), tool("Base64", baseControls, baseOut), tool("SHA-256", hashControls, hashOut), tool("JSON", jsonControls, jsonOut)));
}

async function renderMail() {
  if (!requireLogin()) return;
  clear(app);
  const messages = h("div", { class: "list" });
  const children = [panel("最近邮件", messages)];
  if (session.role === "admin") {
    const sendForm = h("form", null, field("发件地址", "from", "email", "hello@lunarlab.uk", true), field("收件地址", "to", "email", "friend@example.com", true), field("主题", "subject", "text", "Subject", true), field("正文", "text", "textarea", "Message", true), h("button", { class: "primary", type: "submit", text: "发送" }));
    sendForm.addEventListener("submit", async event => { event.preventDefault(); try { await api("/api/mail/send", { method: "POST", body: formValues(sendForm) }); sendForm.reset(); showToast("邮件已发送"); } catch (error) { showToast(error.message, true); } });
    children.unshift(panel("发送邮件", sendForm));
  }
  app.append(h("div", { class: "stack" }, ...children));
  try {
    const rows = (await api("/api/mail/messages")).messages;
    clear(messages);
    if (!rows.length) messages.append(h("p", { class: "muted", text: "还没有归档邮件。" }));
    for (const message of rows) messages.append(h("a", { class: "list-item", href: "/api/mail/messages/" + message.id + "/raw" }, h("strong", { text: message.sender }), h("div", { class: "muted tiny", text: "to " + message.recipient + " · " + formatDate(message.received_at) })));
  } catch (error) { showToast(error.message, true); }
}

async function renderMirror() {
  if (!requireLogin()) return;
  clear(app);
  if (session.role !== "admin") { app.append(panel("管理员专用", h("p", { class: "muted", text: "镜像入口不对普通成员开放。" }))); return; }
  const list = h("div", { class: "list" });
  app.append(panel("可用目标", h("div", { class: "callout", text: "Cookie 会按镜像别名重命名并限制在对应路径，不会把 cf-one 登录 Cookie 发给上游。镜像文档还会进入不透明 CSP 沙箱，不能读取站内 API；动态脚本、WebSocket 或严格来源校验的复杂网站仍可能需要针对性适配。" }), list));
  try {
    const targets = (await api("/api/admin/mirror-targets")).targets;
    if (!targets.length) list.append(h("p", { class: "muted", text: "尚未在 MIRROR_TARGETS 中配置目标。" }));
    for (const target of targets) list.append(h("a", { class: "list-item", href: "/mirror/" + target.alias + "/" }, h("div", { class: "row between" }, h("strong", { text: target.label }), h("span", { class: "pill", text: target.cookies ? "cookies" : "stateless" })), h("div", { class: "muted tiny", text: target.origin })));
  } catch (error) { showToast(error.message, true); }
}

function renderStore() {
  clear(app);
  const install = h("button", { class: "primary", text: "安装此 PWA", onclick: () => showToast("在 iPhone/iPad Safari 中点“分享”→“添加到主屏幕”；桌面浏览器可用地址栏安装按钮。") });
  app.append(h("div", { class: "stack" }, panel("Lunar Web App", h("p", { class: "muted", text: "完整站点可以作为标准 PWA 安装，离线壳层由 Service Worker 提供。" }), install), panel("原生 iOS 网页分发", h("div", { class: "callout", text: "这里预留的是合规目录入口，不是漏洞商店。Apple Web Distribution 只适用于获授权开发者、已公证应用、注册域名与受支持地区/系统；获得 Apple 的分发包后，可把官方下载链接填入 SITE_CONFIG。" }))));
}

async function renderAdmin() {
  if (!requireLogin()) return;
  clear(app);
  if (session.role !== "admin") { app.append(panel("权限不足", h("p", { class: "muted", text: "当前账号不是管理员。" }))); return; }
  const statusOut = output("Loading…");
  const resourcesOut = output("点击加载资源清单");
  const zones = h("div", { class: "list" });
  const recordsPanel = panel("DNS 记录", h("p", { class: "muted", text: "先选择一个域名。" }));
  const resourceButton = h("button", { text: "加载 D1 / KV / R2", onclick: async () => { try { resourcesOut.textContent = JSON.stringify(await api("/api/admin/cf/resources"), null, 2); } catch (error) { showToast(error.message, true); } } });
  app.append(h("div", { class: "stack" }, h("div", { class: "tool-grid" }, panel("运行状态", statusOut), panel("Cloudflare 资源", resourceButton, resourcesOut)), h("div", { class: "split" }, panel("限定域名", zones), recordsPanel)));
  try { statusOut.textContent = JSON.stringify(await api("/api/admin/status"), null, 2); } catch (error) { showToast(error.message, true); }
  try {
    const response = await api("/api/admin/cf/zones");
    for (const zone of response.result || []) zones.append(h("button", { class: "list-item", onclick: () => loadRecords(zone) }, h("strong", { text: zone.name }), h("div", { class: "muted tiny", text: zone.status + " · " + zone.id })));
    if (!(response.result || []).length) zones.append(h("p", { class: "muted", text: "Token 看不到 MANAGED_ZONES 中的域名，或尚未配置运行时 Token。" }));
  } catch (error) { zones.append(h("p", { class: "muted", text: error.message })); }

  async function loadRecords(zone) {
    clear(recordsPanel);
    recordsPanel.append(h("h2", { text: zone.name }));
    const create = h("form", null, h("div", { class: "row" }, h("select", { name: "type" }, ...["A", "AAAA", "CNAME", "TXT", "MX"].map(type => h("option", { value: type, text: type }))), h("input", { name: "name", placeholder: "name." + zone.name, required: true })), field("内容", "content", "text", "record value", true), field("MX 优先级（仅 MX 必填）", "priority", "number", "10", false), h("button", { type: "submit", text: "创建记录" }));
    const table = h("div", { class: "table-wrap" });
    recordsPanel.append(create, table);
    create.addEventListener("submit", async event => {
      event.preventDefault();
      const body = formValues(create);
      body.confirmation = "CREATE " + String(body.name).toLowerCase();
      if (!confirm("确认创建 DNS 记录 " + body.name + "？")) return;
      try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records", { method: "POST", body }); create.reset(); await refresh(); }
      catch (error) { showToast(error.message, true); }
    });
    async function refresh() {
      const rows = (await api("/api/admin/cf/zones/" + zone.id + "/dns-records")).result || [];
      clear(table);
      const body = h("tbody");
      for (const record of rows) {
        const remove = h("button", { class: "danger tiny", text: "删除", onclick: async () => {
          if (!confirm("永久删除 " + record.type + " " + record.name + "？")) return;
          try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records/" + record.id, { method: "DELETE", body: { confirmation: "DELETE " + record.id } }); await refresh(); }
          catch (error) { showToast(error.message, true); }
        }});
        body.append(h("tr", null, h("td", { text: record.type }), h("td", { text: record.name }), h("td", { text: record.content }), h("td", null, remove)));
      }
      table.append(h("table", null, h("thead", null, h("tr", null, h("th", { text: "类型" }), h("th", { text: "名称" }), h("th", { text: "内容" }), h("th", { text: "操作" }))), body));
    }
    await refresh();
  }
}

async function start() {
  await loadSession();
  const handlers = { login: renderLogin, chat: renderChat, social: renderSocial, tools: renderTools, mail: renderMail, mirror: renderMirror, store: renderStore, admin: renderAdmin };
  if (handlers[page]) {
    try { await handlers[page](); }
    catch (error) { clear(app); app.append(panel("发生错误", h("p", { class: "muted", text: error.message }))); }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}

window.addEventListener("beforeunload", () => { if (pollTimer) window.clearInterval(pollTimer); });
start();
`;

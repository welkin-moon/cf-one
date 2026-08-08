export const APP_JS = String.raw`
const page = document.body.dataset.page || "home";
const host = document.body.dataset.host || location.hostname;
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
function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return bytes + " B";
  const units = ["KiB", "MiB", "GiB", "TiB"];
  let amount = bytes;
  let unit = -1;
  do { amount /= 1024; unit++; } while (amount >= 1024 && unit < units.length - 1);
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: amount >= 100 ? 0 : amount >= 10 ? 1 : 2 }).format(amount) + " " + units[unit];
}
function percent(used, limit) {
  const value = Number(limit) > 0 ? Number(used) / Number(limit) * 100 : Number(used) > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, value));
}
function field(label, name, type, placeholder, required, help, attributes) {
  const tag = type === "textarea" ? "textarea" : "input";
  const props = Object.assign({ name, type: tag === "input" ? type : null, placeholder, required }, attributes || {});
  const control = h(tag, props);
  return h("label", { class: "field" }, h("span", { class: "field-label", text: label }), control, help ? h("span", { class: "field-help", text: help }) : null);
}
function formValues(form) { return Object.fromEntries(new FormData(form).entries()); }
function panel(title, description, ...children) {
  return h("section", { class: "panel" }, h("h2", { text: title }), description ? h("p", { class: "panel-description", text: description }) : null, ...children);
}
function output(value) { return h("pre", { class: "output", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }); }
function emptyState(title, description, icon) {
  return h("div", { class: "empty-state" }, h("span", { class: "empty-icon", text: icon || "·" }), h("h3", { text: title }), h("p", { text: description }));
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
    ["daily relay traffic limit reached", "今天的中转流量或请求额度已用完，请联系管理员处理"],
    ["global storage capacity guard reached", "全站存储保护额度已达到上限，请联系管理员处理"],
    ["google storage capacity guard reached", "Google 存储剩余空间触发安全保护，请联系管理员处理"],
    ["global file count guard reached", "全站文件数量触发安全保护，请联系管理员处理"],
    ["file count limit reached", "你的文件数量已达到上限，请联系管理员处理"],
    ["too many active uploads", "同时上传的文件太多，请先完成或取消已有上传"],
    ["storage quota exceeded", "存储空间已达到限额，请联系管理员处理"],
    ["quota cannot be lower", "新额度不能低于当前已使用空间"],
    ["global quota cannot be lower", "全站额度不能低于当前已使用和正在上传的空间"],
    ["google drive is not connected", "文件存储尚未连接，请联系管理员"],
    ["google drive oauth is not configured", "文件存储还没有完成初始化"],
    ["google drive authorization needs", "Google Drive 授权需要管理员重新处理"],
    ["google drive connection needs", "Google Drive 连接需要管理员处理"],
    ["google drive rate limit", "Google Drive 当前触发上游限流，请联系管理员"],
    ["google drive request failed", "Google Drive 暂时不可用，请联系管理员"],
    ["upload session expired", "上传会话已过期，请重新上传"],
    ["invalid credentials", "用户名或密码不正确"],
    ["account disabled", "这个账号已停用"],
    ["authentication required", "请先登录"],
    ["admin required", "需要管理员权限"],
    ["owner required", "只有站主可以执行这个操作"],
    ["too many requests", "操作太频繁，请稍后再试"],
    ["cloudflare", "域名服务暂时不可用，请稍后再试"]
  ];
  for (const [needle, replacement] of known) if (message.includes(needle)) return replacement;
  if (status === 507) return "存储保护机制已阻止这次操作，请联系管理员";
  if (status === 500) return "服务暂时出现问题，请稍后再试";
  if (status === 503) return "这个功能暂时不可用，请联系管理员";
  if (status === 403) return "当前账号没有执行这个操作的权限";
  if (status === 404) return "没有找到你要的内容";
  return raw || "请求没有成功，请稍后再试";
}

function showToast(message, error) {
  if (!toast) return;
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.className = "snackbar show" + (error ? " error" : "");
  toastTimer = setTimeout(() => { toast.className = "snackbar"; }, 4200);
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
  root.dataset.theme = ["system", "light", "dark"].includes(stored) ? stored : "system";
  const media = matchMedia("(prefers-color-scheme: dark)");
  function update() {
    const mode = root.dataset.theme || "system";
    const dark = mode === "dark" || (mode === "system" && media.matches);
    if (themeColor) themeColor.setAttribute("content", dark ? "#141218" : "#fffbfe");
    if (themeToggle) {
      themeToggle.textContent = mode === "system" ? "◐" : mode === "light" ? "☀" : "☾";
      themeToggle.title = mode === "system" ? "跟随系统" : mode === "light" ? "浅色" : "深色";
    }
  }
  update();
  themeToggle?.addEventListener("click", () => {
    root.dataset.theme = root.dataset.theme === "system" ? "light" : root.dataset.theme === "light" ? "dark" : "system";
    localStorage.setItem("lms-theme", root.dataset.theme);
    update();
  });
  media.addEventListener?.("change", update);
}

function setupNavigation() {
  moreNav?.addEventListener("click", () => navSheet?.showModal());
  navSheet?.querySelector("[data-close-sheet]")?.addEventListener("click", () => navSheet.close());
  navSheet?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => navSheet.close()));
  navSheet?.addEventListener("click", event => { if (event.target === navSheet) navSheet.close(); });
}

async function api(path, options) {
  const init = Object.assign({ credentials: "same-origin" }, options || {});
  const headers = new Headers(init.headers || {});
  headers.set("accept", "application/json");
  const body = init.body;
  const binary = body instanceof Blob || body instanceof ArrayBuffer || ArrayBuffer.isView(body) || body instanceof FormData;
  if (body && !binary && typeof body !== "string") {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }
  if (session?.csrf && !["GET", "HEAD", "OPTIONS"].includes((init.method || "GET").toUpperCase())) headers.set("x-csrf-token", session.csrf);
  init.headers = headers;
  const response = await fetch(path, init);
  const type = response.headers.get("content-type") || "";
  const result = type.includes("json") ? await response.json() : await response.text();
  if (!response.ok) {
    const raw = result && typeof result === "object" && result.error ? result.error : "请求失败";
    const error = new Error(friendlyMessage(raw, response.status));
    error.status = response.status;
    throw error;
  }
  return result;
}

function updateAccount() {
  if (!account) return;
  clear(account);
  document.body.classList.toggle("is-admin", Boolean(session?.role === "admin"));
  if (!session) {
    account.append(h("a", { href: "/app/login", class: "button tonal", text: "登录" }));
    return;
  }
  account.append(h("span", { class: "pill" }, h("span", { class: "status-dot " + (session.deviceChanged ? "warn" : "ok") }), h("span", { class: "account-name", text: session.owner ? "admin" : session.email })));
  account.append(h("button", { class: "icon-button", type: "button", title: "退出登录", text: "↪", onclick: async () => {
    try { await api("/api/auth/logout", { method: "POST" }); location.href = "/"; }
    catch (error) { showToast(error.message, true); }
  }}));
}

async function loadSession() {
  try { session = (await api("/api/auth/session")).session; }
  catch (error) { session = null; showToast("暂时无法确认登录状态", true); }
  updateAccount();
}

function requireLogin() {
  if (session) return true;
  setReady();
  clear(app);
  app?.append(panel("需要登录", "登录后才能打开这个功能。", h("a", { class: "button filled", href: "/app/login", text: "前往登录" })));
  return false;
}

function renderTools() {
  setReady();
  clear(app);
  const uuidOut = output("点击按钮生成");
  const baseInput = h("textarea", { placeholder: "输入文本或 Base64" });
  const baseOut = output("");
  const hashInput = h("textarea", { placeholder: "输入文本" });
  const hashOut = output("");
  const jsonInput = h("textarea", { placeholder: "粘贴 JSON" });
  const jsonOut = output("");
  app?.append(h("div", { class: "tool-grid" },
    panel("UUID", "生成新的唯一标识。", h("button", { class: "button filled", text: "生成 UUID", onclick: async () => { uuidOut.textContent = (await api("/api/tools/uuid")).uuid; } }), uuidOut),
    panel("Base64", "在文本与 Base64 之间转换。", baseInput, h("div", { class: "row" }, h("button", { class: "button tonal", text: "编码", onclick: async () => { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "encode", value: baseInput.value } })).value; } }), h("button", { class: "button tonal", text: "解码", onclick: async () => { try { baseOut.textContent = (await api("/api/tools/base64", { method: "POST", body: { operation: "decode", value: baseInput.value } })).value; } catch (error) { showToast(error.message, true); } } })), baseOut),
    panel("SHA-256", "计算文本摘要。", hashInput, h("button", { class: "button tonal", text: "计算", onclick: async () => { hashOut.textContent = (await api("/api/tools/hash", { method: "POST", body: { value: hashInput.value } })).sha256; } }), hashOut),
    panel("JSON", "检查并整理 JSON。", jsonInput, h("button", { class: "button tonal", text: "格式化", onclick: () => { try { jsonOut.textContent = JSON.stringify(JSON.parse(jsonInput.value), null, 2); } catch { showToast("这段内容不是有效 JSON", true); } } }), jsonOut)
  ));
}

async function renderFiles() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const quotaBox = h("div", { class: "quota" });
  const trafficBox = h("div", { class: "quota" });
  const files = h("div", { class: "list" });
  const uploads = h("div", { class: "stack" });
  const picker = h("input", { type: "file", multiple: true });
  const route = h("select", null,
    h("option", { value: "worker", text: "本站中转（兼容网络）" }),
    h("option", { value: "google", text: "Google 直连" })
  );
  route.value = localStorage.getItem("lms-drive-route") === "google" ? "google" : "worker";
  route.addEventListener("change", () => localStorage.setItem("lms-drive-route", route.value));
  const uploadButton = h("button", { class: "button filled", type: "button", text: "上传所选文件" });
  const uploadPanel = panel("上传", "文件会计入你的个人额度；上传流量也会计入当天的本站中转额度。大文件会自动分块续传。", picker, uploadButton, uploads);
  const listPanel = panel("我的文件", "本站中转适合无法稳定直连 Google 的网络；Google 直连不消耗本站中转额度。", h("label", { class: "field" }, h("span", { class: "field-label", text: "下载路径" }), route), files);
  app?.append(h("div", { class: "storage-grid" }, h("div", { class: "stack" }, panel("存储空间", null, quotaBox), panel("今日中转", "北京时间 00:00 重置。上传和本站中转下载都会计入。", trafficBox), uploadPanel), listPanel));

  async function refreshStatus() {
    const status = await api("/api/storage/status");
    clear(quotaBox);
    clear(trafficBox);
    const used = Number(status.usedBytes || 0) + Number(status.reservedBytes || 0);
    const storagePercent = percent(used, status.quotaBytes);
    quotaBox.append(
      h("div", { class: "quota-meta" }, h("strong", { text: formatBytes(used) + " / " + formatBytes(status.quotaBytes) }), h("span", { text: Math.round(storagePercent) + "%" })),
      h("div", { class: "quota-line" }, h("span", { style: "width:" + storagePercent + "%" })),
      h("div", { class: "muted tiny", text: (status.reservedBytes ? "其中 " + formatBytes(status.reservedBytes) + " 正在上传 · " : "") + "可用 " + formatBytes(status.availableBytes) + " · " + Number(status.fileCount || 0) + " / " + Number(status.fileCountLimit || 0) + " 个文件" })
    );
    const relayUsed = Number(status.dailyRelayBytesUsed || 0);
    const relayLimit = Number(status.dailyRelayBytes || 0);
    const relayPercent = percent(relayUsed, relayLimit);
    trafficBox.append(
      h("div", { class: "quota-meta" }, h("strong", { text: formatBytes(relayUsed) + " / " + formatBytes(relayLimit) }), h("span", { text: Math.round(relayPercent) + "%" })),
      h("div", { class: "quota-line" }, h("span", { style: "width:" + relayPercent + "%" })),
      h("div", { class: "muted tiny", text: "请求 " + Number(status.dailyRelayRequestsUsed || 0) + " / " + Number(status.dailyRelayRequests || 0) + (status.workerRelayAvailable ? "" : " · 已触发中转保护") })
    );
    picker.disabled = !status.connected || !status.workerRelayAvailable;
    uploadButton.disabled = !status.connected || !status.workerRelayAvailable;
    if (!status.connected) uploads.replaceChildren(emptyState("存储尚未连接", "管理员完成 Google Drive 连接后即可上传。", "!"));
    else if (!status.workerRelayAvailable) uploads.replaceChildren(emptyState("今日中转额度已用完", "上传和本站中转暂时停止，需要管理员调整额度或等待次日重置。", "!"));
    return status;
  }

  async function refreshFiles() {
    const rows = (await api("/api/storage/files")).files || [];
    clear(files);
    if (!rows.length) return files.append(emptyState("这里还没有文件", "选择文件上传后会显示在这里。", "＋"));
    for (const file of rows) {
      const download = h("a", { class: "button tonal", href: "/api/storage/files/" + file.id + "/content?via=" + encodeURIComponent(route.value), text: "下载" });
      const remove = h("button", { class: "button danger", text: "删除", onclick: async () => {
        const confirmed = await confirmAction("删除文件？", file.name + " 将从存储中永久删除。", true);
        if (!confirmed) return;
        try { await api("/api/storage/files/" + file.id, { method: "DELETE" }); await Promise.all([refreshFiles(), refreshStatus()]); showToast("文件已删除"); }
        catch (error) { showToast(error.message, true); }
      }});
      route.addEventListener("change", () => { download.href = "/api/storage/files/" + file.id + "/content?via=" + encodeURIComponent(route.value); });
      files.append(h("div", { class: "list-item" },
        h("div", { class: "row between" }, h("span", { class: "file-name", text: file.name }), h("span", { class: "pill", text: formatBytes(file.byte_size) })),
        h("div", { class: "muted tiny", text: (file.mime_type || "文件") + " · " + formatDate(file.created_at) }),
        h("div", { class: "file-actions" }, download, remove)
      ));
    }
  }

  async function uploadOne(file) {
    const card = h("div", { class: "list-item upload-card" },
      h("div", { class: "row between" }, h("strong", { text: file.name }), h("span", { class: "muted tiny", text: formatBytes(file.size) })),
      h("div", { class: "upload-progress" }, h("span", { style: "width:0%" })),
      h("div", { class: "muted tiny", text: "准备上传…" })
    );
    uploads.append(card);
    const bar = card.querySelector(".upload-progress span");
    const label = card.querySelector(".muted.tiny");
    let uploadId = null;
    try {
      const created = await api("/api/storage/uploads", { method: "POST", body: { name: file.name, mimeType: file.type || "application/octet-stream", size: file.size } });
      uploadId = created.uploadId;
      const chunkSize = Number(created.chunkBytes) || 16777216;
      let offset = 0;
      while (offset < file.size) {
        const end = Math.min(file.size, offset + chunkSize);
        const blob = file.slice(offset, end, file.type || "application/octet-stream");
        const result = await api("/api/storage/uploads/" + uploadId, {
          method: "PUT",
          headers: { "content-range": "bytes " + offset + "-" + (end - 1) + "/" + file.size, "content-type": file.type || "application/octet-stream" },
          body: blob
        });
        offset = result.complete ? file.size : Number(result.receivedBytes || end);
        const uploadPercent = Math.min(100, offset / file.size * 100);
        bar.style.width = uploadPercent + "%";
        label.textContent = result.complete ? "上传完成" : "已上传 " + Math.round(uploadPercent) + "%";
      }
      showToast(file.name + " 已上传");
    } catch (error) {
      label.textContent = error.message;
      card.classList.add("error");
      if (uploadId) api("/api/storage/uploads/" + uploadId, { method: "DELETE" }).catch(() => {});
      throw error;
    }
  }

  uploadButton.addEventListener("click", async () => {
    const selected = Array.from(picker.files || []);
    if (!selected.length) return showToast("请先选择文件", true);
    const restore = setBusy(uploadButton, "上传中…");
    clear(uploads);
    try {
      for (const file of selected) await uploadOne(file);
      picker.value = "";
      await Promise.all([refreshFiles(), refreshStatus()]);
    } catch (error) { showToast(error.message, true); }
    finally { restore(); }
  });

  try { await Promise.all([refreshStatus(), refreshFiles()]); }
  catch (error) { clear(app); app?.append(panel("文件暂时不可用", error.message)); }
}

async function renderMail() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  const messages = h("div", { class: "list" });
  const children = [panel("最近邮件", "打开邮件可以查看原始内容。", messages)];
  if (session.role === "admin") {
    const sendForm = h("form", null, field("发件地址", "from", "email", "hello@lunarlab.uk", true), field("收件地址", "to", "email", "friend@example.com", true), field("主题", "subject", "text", "主题", true), field("正文", "text", "textarea", "写点什么…", true), h("button", { class: "button filled", type: "submit", text: "发送" }));
    sendForm.addEventListener("submit", async event => { event.preventDefault(); const button = sendForm.querySelector("button"); const restore = setBusy(button, "发送中…"); try { await api("/api/mail/send", { method: "POST", body: formValues(sendForm) }); sendForm.reset(); showToast("邮件已发送"); } catch (error) { showToast(error.message, true); } finally { restore(); } });
    children.unshift(panel("发送邮件", "选择已允许的发件和收件地址。", sendForm));
  }
  app?.append(h("div", { class: "stack" }, ...children));
  try {
    const rows = (await api("/api/mail/messages")).messages || [];
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
    field("目标网站", "origin", "url", "https://example.com/", true, "填写网站根地址。"),
    field("名称", "label", "text", "可选备注", false),
    h("button", { class: "button filled", type: "submit", text: "申请地址" })
  );
  app?.append(h("div", { class: "split" }, panel("申请镜像", "地址会按 m1、m2… 的顺序分配。", form), panel(session.owner ? "全部镜像" : "我的镜像", "可以打开或移除当前地址。", list)));
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = form.querySelector("button");
    const restore = setBusy(button, "正在申请…");
    try { const created = await api("/api/mirror/targets", { method: "POST", body: formValues(form) }); form.reset(); showToast("已分配 " + created.target.hostname); await load(); }
    catch (error) { showToast(error.message, true); }
    finally { restore(); }
  });
  async function load() {
    const response = await api("/api/mirror/targets");
    clear(list);
    if (!response.targets.length) return list.append(emptyState("还没有镜像", "提交一个目标网站后，新地址会出现在这里。", "↗"));
    for (const target of response.targets) {
      const states = { active: "可用", pending: "正在准备", suspended: "已移除", rejected: "未能创建", expired: "已过期" };
      const actions = [];
      if (target.state === "active") actions.push(h("a", { class: "button tonal", href: target.url, target: "_blank", rel: "noreferrer", text: "打开" }));
      if (["active", "pending"].includes(target.state)) actions.push(h("button", { class: "button danger", text: "移除", onclick: async () => { const ok = await confirmAction("移除镜像？", target.hostname + " 将停止访问。", true); if (!ok) return; try { await api("/api/mirror/targets/" + target.id, { method: "DELETE" }); await load(); showToast("镜像已移除"); } catch (error) { showToast(error.message, true); } } }));
      list.append(h("div", { class: "list-item" }, h("div", { class: "row between" }, h("strong", { text: target.hostname }), h("span", { class: "pill " + (target.state === "active" ? "success" : ""), text: states[target.state] || target.state })), h("div", { class: "muted tiny", text: (target.label || "未命名") + " · " + target.origin }), h("div", { class: "file-actions" }, ...actions)));
    }
  }
  try { await load(); } catch (error) { list.append(emptyState("暂时无法加载", error.message, "!")); }
}

function renderStore() {
  setReady();
  clear(app);
  app?.append(panel("安装到设备", "把本站像普通应用一样放到主屏幕或桌面。", h("button", { class: "button filled", text: "查看安装方法", onclick: () => showToast("手机浏览器可从分享菜单选择“添加到主屏幕”；桌面浏览器通常会在地址栏提供安装入口。") })));
}

async function renderAdmin() {
  if (!requireLogin()) return;
  setReady();
  clear(app);
  if (session.role !== "admin") { app?.append(panel("没有管理权限", "当前账号不能打开站点管理。")); return; }
  const sections = h("div", { class: "stack" });
  app?.append(sections);

  const statusGrid = h("div", { class: "status-grid" });
  sections.append(panel("站点状态", "只显示功能是否可用。", statusGrid));
  try {
    const status = await api("/api/admin/status");
    const checks = [
      ["账号登录", Boolean(status.capabilities?.sessionSigningConfigured && status.capabilities?.ownerPasswordConfigured)],
      ["域名管理", Boolean(status.capabilities?.cloudflareApiConfigured && status.capabilities?.accountConfigured)],
      ["邮件", Boolean(status.bindings?.r2 || status.bindings?.emailSend)]
    ];
    for (const [label, ok] of checks) statusGrid.append(h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: label }), h("strong", null, h("span", { class: "status-dot " + (ok ? "ok" : "warn") }), ok ? "可用" : "未启用")));
  } catch (error) { statusGrid.append(emptyState("状态暂时不可用", error.message, "!")); }

  if (host === "lunarlab.uk") await renderStorageAdmin(sections);
  if (!session.owner) {
    sections.append(panel("管理员账号", "你可以处理成员的存储与中转额度；账号角色与域名设置仍由站主修改。", h("span", { class: "pill success", text: "管理员" })));
    return;
  }
  await renderOwnerUsers(sections);
  await renderDnsAdmin(sections);
}

async function renderStorageAdmin(sections) {
  const guardBox = h("div", { class: "stack" });
  if (session.owner) sections.append(panel("存储防护", "这些限制同时保护 Google Drive 容量、Worker 中转流量和 D1 文件索引规模。默认中转总量刻意低于 Google Drive API 的项目级日流量阈值。", guardBox));
  const quotaList = h("div", { class: "list" });
  sections.append(panel("成员存储额度", "每个账号可单独设置容量、每日中转流量和每日中转请求数；达到限制后需要管理员处理。", quotaList));

  async function loadQuotas() {
    const response = await api("/api/storage/admin/quotas");
    clear(quotaList);
    if (session.owner) {
      clear(guardBox);
      const policy = response.policy || {};
      const global = response.global || {};
      const provider = response.provider;
      const summary = h("div", { class: "status-grid" },
        h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: "全站容量" }), h("strong", { text: formatBytes(Number(global.usedBytes || 0) + Number(global.reservedBytes || 0)) + " / " + formatBytes(policy.totalQuotaBytes) })),
        h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: "今日中转" }), h("strong", { text: formatBytes(global.relayBytesToday) + " / " + formatBytes(policy.totalDailyRelayBytes) })),
        h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: "今日传输请求" }), h("strong", { text: Number(global.relayRequestsToday || 0) + " / " + Number(policy.totalDailyRelayRequests || 0) })),
        h("div", { class: "status-card" }, h("span", { class: "muted tiny", text: "文件索引" }), h("strong", { text: Number(global.fileCount || 0) + " / " + Number(policy.totalFileCountLimit || 0) }))
      );
      guardBox.append(summary);
      if (provider?.limit) guardBox.append(h("div", { class: "callout", text: "Google 账户实际用量：" + formatBytes(provider.usage) + " / " + formatBytes(provider.limit) + "；额外保留 " + formatBytes(policy.providerHeadroomBytes) + " 安全空间。" }));
      const policyForm = h("form", null,
        field("默认每用户容量（GiB）", "defaultQuotaGiB", "number", "10", true, null, { min: "0", step: "0.1", value: String(Number(policy.defaultQuotaBytes || 0) / 1073741824) }),
        field("全站容量上限（GiB）", "totalQuotaGiB", "number", "4096", true, null, { min: "0", step: "1", value: String(Number(policy.totalQuotaBytes || 0) / 1073741824) }),
        field("Google 账户保留空间（GiB）", "providerHeadroomGiB", "number", "50", true, "即使 LMS 自身还有额度，也不会把 Google 账户吃到这个安全余量以下。", { min: "0", step: "1", value: String(Number(policy.providerHeadroomBytes || 0) / 1073741824) }),
        field("默认每用户日中转（GiB）", "defaultDailyRelayGiB", "number", "20", true, null, { min: "0", step: "0.1", value: String(Number(policy.defaultDailyRelayBytes || 0) / 1073741824) }),
        field("全站日中转（GiB）", "totalDailyRelayGiB", "number", "200", true, "上传和本站中转下载都会计入；北京时间 00:00 重置。", { min: "0", step: "0.1", max: "900", value: String(Number(policy.totalDailyRelayBytes || 0) / 1073741824) }),
        field("默认每用户日请求数", "defaultDailyRelayRequests", "number", "5000", true, null, { min: "0", step: "1", value: String(Number(policy.defaultDailyRelayRequests || 0)) }),
        field("全站日请求数", "totalDailyRelayRequests", "number", "50000", true, null, { min: "0", step: "1", value: String(Number(policy.totalDailyRelayRequests || 0)) }),
        field("默认每用户文件数", "defaultFileCountLimit", "number", "5000", true, null, { min: "0", step: "1", value: String(Number(policy.defaultFileCountLimit || 0)) }),
        field("全站文件数", "totalFileCountLimit", "number", "50000", true, "限制 D1 中的文件索引和活跃上传记录规模。", { min: "0", step: "1", value: String(Number(policy.totalFileCountLimit || 0)) }),
        h("button", { class: "button filled", type: "submit", text: "保存防护策略" })
      );
      policyForm.addEventListener("submit", async event => {
        event.preventDefault();
        const values = formValues(policyForm);
        const gib = name => Math.round(Number(values[name]) * 1073741824);
        const body = {
          defaultQuotaBytes: gib("defaultQuotaGiB"),
          totalQuotaBytes: gib("totalQuotaGiB"),
          providerHeadroomBytes: gib("providerHeadroomGiB"),
          defaultDailyRelayBytes: gib("defaultDailyRelayGiB"),
          totalDailyRelayBytes: gib("totalDailyRelayGiB"),
          defaultDailyRelayRequests: Number(values.defaultDailyRelayRequests),
          totalDailyRelayRequests: Number(values.totalDailyRelayRequests),
          defaultFileCountLimit: Number(values.defaultFileCountLimit),
          totalFileCountLimit: Number(values.totalFileCountLimit)
        };
        if (Object.values(body).some(value => !Number.isFinite(value) || value < 0)) return showToast("请输入有效的防护额度", true);
        const button = policyForm.querySelector("button");
        const restore = setBusy(button, "保存中…");
        try { await api("/api/storage/admin/policy", { method: "PATCH", body }); await loadQuotas(); showToast("存储防护策略已更新"); }
        catch (error) { showToast(error.message, true); }
        finally { restore(); }
      });
      guardBox.append(policyForm);
    }

    for (const user of response.users || []) {
      const quotaInput = h("input", { type: "number", min: "0", step: "0.1", value: String(Number(user.quota_bytes || 0) / 1073741824) });
      const trafficInput = h("input", { type: "number", min: "0", step: "0.1", max: "900", value: String(Number(user.daily_relay_bytes || 0) / 1073741824) });
      const requestsInput = h("input", { type: "number", min: "0", step: "1", value: String(Number(user.daily_relay_requests || 0)) });
      const save = h("button", { class: "button tonal", text: "保存额度", onclick: async () => {
        const quotaGiB = Number(quotaInput.value);
        const trafficGiB = Number(trafficInput.value);
        const requests = Number(requestsInput.value);
        if (![quotaGiB, trafficGiB, requests].every(value => Number.isFinite(value) && value >= 0)) return showToast("请输入有效额度", true);
        const restore = setBusy(save, "保存中…");
        try {
          await api("/api/storage/admin/quotas/" + user.id, { method: "PATCH", body: {
            quotaBytes: Math.round(quotaGiB * 1073741824),
            dailyRelayBytes: Math.round(trafficGiB * 1073741824),
            dailyRelayRequests: Math.round(requests),
            reason: "管理员调整"
          } });
          await loadQuotas();
          showToast("成员额度已更新");
        } catch (error) { showToast(error.message, true); }
        finally { restore(); }
      }});
      quotaList.append(h("div", { class: "list-item" },
        h("div", { class: "row between" },
          h("div", null, h("strong", { text: user.id === "owner" ? "admin" : (user.display_name || user.email) }), h("div", { class: "muted tiny", text: user.id === "owner" ? "站主" : user.email })),
          h("span", { class: "pill", text: formatBytes(user.used_bytes) + " / " + formatBytes(user.quota_bytes) })
        ),
        h("div", { class: "muted tiny", text: "今日中转 " + formatBytes(user.relay_bytes_today) + " / " + formatBytes(user.daily_relay_bytes) + " · 请求 " + Number(user.relay_requests_today || 0) + " / " + Number(user.daily_relay_requests || 0) + " · 文件 " + Number(user.file_count || 0) }),
        h("div", { class: "row", style: "margin-top:10px" }, quotaInput, h("span", { text: "GiB 容量" })),
        h("div", { class: "row", style: "margin-top:10px" }, trafficInput, h("span", { text: "GiB/日中转" })),
        h("div", { class: "row", style: "margin-top:10px" }, requestsInput, h("span", { text: "次/日" }), save)
      ));
    }
  }
  try { await loadQuotas(); } catch (error) { quotaList.append(emptyState("额度暂时不可用", error.message, "!")); }

  if (!session.owner) return;
  const driveBox = h("div", { class: "stack" });
  sections.append(panel("Google Drive", "首次需要配置一个 Google OAuth Web Client，然后点连接完成授权。授权完成后普通用户不需要接触 Google 凭据。", driveBox));
  async function driveStatus() {
    const status = await api("/api/storage/status");
    clear(driveBox);
    driveBox.append(h("div", { class: "row" }, h("span", { class: "pill " + (status.connected ? "success" : ""), text: status.connected ? "已连接" : status.configured ? "等待连接" : "未配置" })));
    if (status.provider?.limit) driveBox.append(h("div", { class: "callout", text: "Google 账户：" + formatBytes(status.provider.usage) + " / " + formatBytes(status.provider.limit) + "；LMS 全站上限 " + formatBytes(status.global?.quotaBytes) + "。" }));
    const configForm = h("form", null,
      field("OAuth Client ID", "clientId", "text", "...apps.googleusercontent.com", true),
      field("OAuth Client Secret", "clientSecret", "password", "仅在保存时提交", true),
      h("div", { class: "callout", text: "Google Cloud 中的授权回调地址填写：https://lunarlab.uk/api/storage/google/callback" }),
      h("button", { class: "button tonal", type: "submit", text: status.configured ? "替换 OAuth 配置" : "保存 OAuth 配置" })
    );
    configForm.addEventListener("submit", async event => {
      event.preventDefault();
      const values = formValues(configForm);
      try { await api("/api/storage/admin/google/config", { method: "PUT", body: { clientId: values.clientId, clientSecret: values.clientSecret } }); configForm.reset(); await driveStatus(); showToast("OAuth 配置已保存"); } catch (error) { showToast(error.message, true); }
    });
    driveBox.append(configForm);
    if (status.configured) driveBox.append(h("button", { class: "button filled", text: status.connected ? "重新连接 Google Drive" : "连接 Google Drive", onclick: async event => {
      const restore = setBusy(event.currentTarget, "准备连接…");
      try { const result = await api("/api/storage/admin/google/connect", { method: "POST" }); location.href = result.url; } catch (error) { showToast(error.message, true); restore(); }
    }}));
    if (status.connected) driveBox.append(h("button", { class: "button danger", text: "断开 Google Drive", onclick: async () => {
      const ok = await confirmAction("断开 Google Drive？", "现有文件索引会保留，但在重新连接前无法上传或下载。", true);
      if (!ok) return;
      try { await api("/api/storage/admin/google/connection", { method: "DELETE" }); await driveStatus(); showToast("Google Drive 已断开"); } catch (error) { showToast(error.message, true); }
    }}));
  }
  try { await driveStatus(); if (new URLSearchParams(location.search).get("drive") === "connected") showToast("Google Drive 已连接"); }
  catch (error) { driveBox.append(emptyState("Google Drive 配置暂时不可用", error.message, "!")); }
}

async function renderOwnerUsers(sections) {
  const users = h("div", { class: "list" });
  sections.append(panel("成员与权限", "站主可以调整成员角色或停用账号。", users));
  async function loadUsers() {
    const response = await api("/api/admin/users");
    clear(users);
    for (const user of response.users || []) {
      const isOwner = Boolean(user.owner);
      const actions = [];
      if (!isOwner) {
        actions.push(h("button", { class: "button tonal", text: user.role === "admin" ? "改为成员" : "设为管理员", onclick: async () => { const next = user.role === "admin" ? "member" : "admin"; const ok = await confirmAction("修改成员权限？", user.email + " 将变为" + (next === "admin" ? "管理员" : "普通成员") + "。", false); if (!ok) return; try { await api("/api/admin/users/" + user.id, { method: "PATCH", body: { role: next } }); await loadUsers(); } catch (error) { showToast(error.message, true); } } }));
        actions.push(h("button", { class: user.status === "active" ? "button danger" : "button tonal", text: user.status === "active" ? "停用" : "恢复", onclick: async () => { const next = user.status === "active" ? "disabled" : "active"; const ok = await confirmAction(next === "disabled" ? "停用账号？" : "恢复账号？", user.email, next === "disabled"); if (!ok) return; try { await api("/api/admin/users/" + user.id, { method: "PATCH", body: { status: next } }); await loadUsers(); } catch (error) { showToast(error.message, true); } } }));
      }
      users.append(h("div", { class: "list-item" }, h("div", { class: "row between" }, h("div", null, h("strong", { text: isOwner ? "admin" : (user.display_name || user.email) }), h("div", { class: "muted tiny", text: isOwner ? "站主" : user.email })), h("span", { class: "pill", text: isOwner ? "站主" : user.role === "admin" ? "管理员" : "成员" })), actions.length ? h("div", { class: "file-actions" }, ...actions) : null));
    }
  }
  try { await loadUsers(); } catch (error) { users.append(emptyState("成员列表暂时不可用", error.message, "!")); }
}

async function renderDnsAdmin(sections) {
  const zones = h("div", { class: "list" });
  const recordsPanel = panel("记录", "先选择一个域名。", emptyState("选择域名", "选中域名后即可查看记录。", "⌂"));
  sections.append(h("div", { class: "split" }, panel("域名", "选择要管理的域名。", zones), recordsPanel));
  try {
    const response = await api("/api/admin/cf/zones");
    for (const zone of response.result || []) zones.append(h("button", { class: "list-item", onclick: event => { for (const item of zones.children) item.classList.remove("active"); event.currentTarget.classList.add("active"); loadRecords(zone); } }, h("strong", { text: zone.name })));
  } catch (error) { zones.append(emptyState("域名暂时不可用", error.message, "!")); }
  async function loadRecords(zone) {
    clear(recordsPanel);
    const create = h("form", null,
      h("label", { class: "field" }, h("span", { class: "field-label", text: "类型" }), h("select", { name: "type" }, ...["A", "AAAA", "CNAME", "TXT", "MX"].map(type => h("option", { value: type, text: type })))),
      field("名称", "name", "text", "name." + zone.name, true), field("内容", "content", "text", "记录内容", true), field("优先级", "priority", "number", "MX 可选", false), h("button", { class: "button filled", type: "submit", text: "添加记录" })
    );
    const table = h("div", { class: "table-wrap" });
    recordsPanel.append(h("h2", { text: zone.name }), create, table);
    create.addEventListener("submit", async event => { event.preventDefault(); const body = formValues(create); body.confirmation = "CREATE " + String(body.name).toLowerCase(); const ok = await confirmAction("添加记录？", String(body.type) + "  " + String(body.name), false); if (!ok) return; try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records", { method: "POST", body }); create.reset(); await refresh(); } catch (error) { showToast(error.message, true); } });
    async function refresh() {
      const rows = (await api("/api/admin/cf/zones/" + zone.id + "/dns-records")).result || [];
      clear(table);
      const body = h("tbody");
      for (const record of rows) body.append(h("tr", null, h("td", { text: record.type }), h("td", { text: record.name }), h("td", { text: record.content }), h("td", null, h("button", { class: "button danger", text: "删除", onclick: async () => { const ok = await confirmAction("删除记录？", record.name, true); if (!ok) return; try { await api("/api/admin/cf/zones/" + zone.id + "/dns-records/" + record.id, { method: "DELETE", body: { confirmation: "DELETE " + record.id } }); await refresh(); } catch (error) { showToast(error.message, true); } } }))));
      table.append(h("table", null, h("thead", null, h("tr", null, h("th", { text: "类型" }), h("th", { text: "名称" }), h("th", { text: "内容" }), h("th", { text: "操作" }))), body));
    }
    try { await refresh(); } catch (error) { table.append(emptyState("记录暂时不可用", error.message, "!")); }
  }
}

async function start() {
  setupTheme();
  setupNavigation();
  await loadSession();
  const handlers = { files: renderFiles, tools: renderTools, mail: renderMail, mirror: renderMirror, store: renderStore, admin: renderAdmin };
  if (handlers[page]) {
    try { await handlers[page](); }
    catch (error) { setReady(); clear(app); app?.append(panel("暂时打不开", error.message || "请稍后再试")); }
  }
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
}
start();
`;

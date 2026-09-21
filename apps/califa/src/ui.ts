import type { NodeManifest, NodeRole } from './protocol';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character] ?? character);
}

const ROLE_COPY: Record<NodeRole, { title: string; summary: string; items: string[] }> = {
  user: {
    title: '用户节点',
    summary: '用户拥有身份、加密内容、媒体与互动事件。Worker 负责写入授权和定时 GitHub 归档。',
    items: ['个人圈与身份', '加密帖子与媒体', 'GitHub 写入控制', '定时归档与广播器批量推送', 'MCP/客户端兼容 API']
  },
  relay: {
    title: '广播器',
    summary: '广播器只分发对象指针与信任判断，不代理或缓存帖子正文和媒体。',
    items: ['对象 announce', 'Tag 索引', '可信互动', '认证声明', '价值观与内容标签']
  },
  circle: {
    title: '强圈子',
    summary: '强圈子拥有独立身份和治理事件，只决定本圈收录与视图，不拥有用户原文。',
    items: ['投稿与收录', '圈内审核', '规则与运营者', '多签检查点', '可审计治理日志']
  }
};

export function renderHome(manifest: NodeManifest): string {
  const copy = ROLE_COPY[manifest.role];
  const capabilities = manifest.capabilities.map((item) => `<code>${escapeHtml(item)}</code>`).join('');
  const items = copy.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(manifest.name)}</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#080a0f;color:#f6f7fb}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 20% 0,#222a45 0,transparent 34rem),#080a0f}main{width:min(1040px,calc(100% - 32px));margin:0 auto;padding:64px 0 96px}.eyebrow{color:#a7b4ff;text-transform:uppercase;letter-spacing:.18em;font-size:12px}h1{font-size:clamp(42px,8vw,76px);line-height:.94;margin:16px 0 22px;max-width:850px}.lead{font-size:19px;line-height:1.7;color:#c8ccda;max-width:760px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:42px}.card{border:1px solid #2b3040;background:#10131cdd;border-radius:22px;padding:24px;box-shadow:0 20px 60px #0006}.card h2{margin-top:0}.card li{margin:12px 0;color:#d7dae5}code{display:inline-block;margin:4px;padding:7px 10px;border-radius:999px;background:#20263a;color:#cdd5ff}.links{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}.links a{color:#fff;text-decoration:none;border:1px solid #3c4358;border-radius:12px;padding:10px 14px}.status{display:inline-flex;align-items:center;gap:8px}.dot{width:9px;height:9px;border-radius:50%;background:#67e8a4;box-shadow:0 0 18px #67e8a4}
</style>
</head>
<body><main>
<div class="eyebrow">Califa protocol / ${escapeHtml(manifest.network)}</div>
<h1>${escapeHtml(copy.title)}</h1>
<p class="lead">${escapeHtml(copy.summary)}</p>
<div class="links"><a href="/.well-known/califa-node.json">节点声明</a><a href="/api/v1/compatibility">客户端兼容性</a><a href="/healthz">健康检查</a></div>
<section class="grid">
<article class="card"><h2>当前角色</h2><p class="status"><span class="dot"></span>${escapeHtml(manifest.name)}</p><ul>${items}</ul></article>
<article class="card"><h2>能力声明</h2><div>${capabilities}</div></article>
<article class="card"><h2>首期边界</h2><p>当前先实现 Web 系统和协议服务。客户端只预留稳定的 manifest、事件格式和能力协商接口。</p><p>内容正文与媒体属于用户节点；广播器只处理指针和判断。</p></article>
</section>
</main></body></html>`;
}

export function homePage(appName: string): string {
  const cards = [
    ['Chat', '/app/chat', 'Private rooms for friends'],
    ['Social', '/app/social', 'Friends-only short posts'],
    ['Tools', '/app/tools', 'UUID and encoding helpers'],
    ['Mail', '/app/mail', 'Inbound mail archive'],
    ['Mirror', '/mirror', 'Owner-approved reverse proxy targets'],
    ['Admin', '/app/admin', 'Scoped Cloudflare controls']
  ];
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111827"><meta name="apple-mobile-web-app-capable" content="yes">
<link rel="manifest" href="/manifest.webmanifest"><title>${escapeHtml(appName)}</title>
<style>body{font:16px system-ui;margin:0;background:#0b1020;color:#eef2ff}main{max-width:980px;margin:auto;padding:64px 22px}h1{font-size:clamp(2.4rem,8vw,5rem);margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:36px}a{display:block;padding:20px;border:1px solid #334155;border-radius:18px;color:inherit;text-decoration:none;background:#111827}a:hover{border-color:#a5b4fc;transform:translateY(-2px)}small{color:#a5b4fc}</style></head>
<body><main><small>lunarlab.uk · 20100823.xyz</small><h1>${escapeHtml(appName)}</h1><p>一个跑在 Cloudflare 边缘上的私人导航、工具、聊天、社交与管理入口。</p><section class="grid">${cards.map(([title, href, text]) => `<a href="${href}"><strong>${title}</strong><p>${text}</p></a>`).join('')}</section></main><script>navigator.serviceWorker?.register('/sw.js')</script></body></html>`;
}

export function placeholderPage(title: string): string {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>body{font:16px system-ui;max-width:760px;margin:70px auto;padding:20px}code{background:#eee;padding:3px 6px}</style><h1>${escapeHtml(title)}</h1><p>前端界面待实现；当前 API 骨架已经可用。返回 <a href="/">首页</a>。</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] ?? char));
}

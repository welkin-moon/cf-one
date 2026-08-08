import type { Feature, SiteProfile } from './config';
import { escapeHtml } from './security';

type IconName = 'home' | 'chat' | 'social' | 'tools' | 'mail' | 'mirror' | 'store' | 'admin';
type NavItem = [Feature | 'home', string, string, IconName];

const ICONS: Record<IconName, string> = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.1 12 4l8.5 7.1v8.4a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5.5 3v-3H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/></svg>',
  social: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17.2" cy="9.2" r="2.2"/><path d="M3.5 19c.5-3.3 2.4-5 5.5-5s5 1.7 5.5 5M14.5 14.8c2.8-.7 5.3.6 6 3.7"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.2 13.3v-2.6l-2-.7a6 6 0 0 0-.6-1.4l.9-1.9-1.9-1.9-1.9.9a6 6 0 0 0-1.4-.6l-.7-2H9l-.7 2a6 6 0 0 0-1.4.6L5 4.8 3.1 6.7 4 8.6a6 6 0 0 0-.6 1.4l-2 .7v2.6l2 .7a6 6 0 0 0 .6 1.4l-.9 1.9L5 19.2l1.9-.9a6 6 0 0 0 1.4.6l.7 2h2.6l.7-2a6 6 0 0 0 1.4-.6l1.9.9 1.9-1.9-.9-1.9a6 6 0 0 0 .6-1.4Z"/></svg>'
};

const NAV: NavItem[] = [
  ['home', '/', '首页', 'home'],
  ['chat', '/app/chat', '聊天', 'chat'],
  ['social', '/app/social', '动态', 'social'],
  ['tools', '/app/tools', '工具', 'tools'],
  ['mail', '/app/mail', '邮件', 'mail'],
  ['mirror', '/app/mirror', '镜像', 'mirror'],
  ['store', '/app/store', '应用', 'store'],
  ['admin', '/app/admin', '管理', 'admin']
];

const CARDS: Record<Feature, { title: string; text: string; label: string; href: string; icon: IconName; adminOnly?: boolean }> = {
  chat: { title: '聊天', text: '创建房间，和朋友继续对话。', label: '消息', href: '/app/chat', icon: 'chat' },
  social: { title: '动态', text: '分享近况，也可以只留给自己。', label: '朋友', href: '/app/social', icon: 'social' },
  tools: { title: '工具', text: '编码、哈希和文本处理等常用小工具。', label: '实用工具', href: '/app/tools', icon: 'tools' },
  mail: { title: '邮件', text: '查看收到的邮件，需要时直接发送。', label: '收件箱', href: '/app/mail', icon: 'mail' },
  mirror: { title: '镜像', text: '为固定 HTTPS 网站申请一个独立访问地址。', label: '访问地址', href: '/app/mirror', icon: 'mirror' },
  store: { title: '应用', text: '把常用网页应用安装到设备或直接打开。', label: '应用库', href: '/app/store', icon: 'store' },
  admin: { title: '管理', text: '管理成员、域名和站点状态。', label: '站点设置', href: '/app/admin', icon: 'admin', adminOnly: true }
};

function currentPage(path: string): string {
  return path === '/' ? 'home' : path.split('/').filter(Boolean).pop() ?? 'home';
}

function icon(name: IconName): string {
  return ICONS[name];
}

function navLinks(links: NavItem[], page: string, className: string): string {
  return `<nav class="${className}" aria-label="主导航">${links.map(([feature, href, label, iconName]) => {
    const adminOnly = feature === 'admin' ? ' data-admin-only' : '';
    return `<a href="${href}"${feature === page ? ' aria-current="page"' : ''}${adminOnly}><span class="nav-icon">${icon(iconName)}</span><span class="nav-label">${label}</span></a>`;
  }).join('')}</nav>`;
}

function mobileNavigation(primary: NavItem[], more: NavItem[], page: string): string {
  const moreActive = more.some(([feature]) => feature === page);
  return `<nav class="bottom-navigation" aria-label="移动导航">
    ${primary.map(([feature, href, label, iconName]) => `<a href="${href}"${feature === page ? ' aria-current="page"' : ''}${feature === 'admin' ? ' data-admin-only' : ''}><span class="nav-icon">${icon(iconName)}</span><span class="nav-label">${label}</span></a>`).join('')}
    <button id="more-nav" class="bottom-more${moreActive ? ' active' : ''}" type="button" aria-label="更多功能"${more.length ? '' : ' hidden'}><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></span><span class="nav-label">更多</span></button>
  </nav>`;
}

export function appPage(profile: SiteProfile, path: string): string {
  const page = currentPage(path);
  const links = NAV.filter(([feature]) => feature === 'home' || profile.features.includes(feature as Feature));
  const title = page === 'home' ? profile.name : `${pageName(page)} · ${profile.name}`;
  const cards = profile.features.map(feature => ({ feature, ...CARDS[feature] })).filter(card => Boolean(card.title));
  const primaryHref = profile.features.includes('chat') ? '/app/chat' : (cards.find(card => !card.adminOnly)?.href ?? '/app/tools');
  const nonAdminMobile = links.filter(([feature]) => feature !== 'admin');
  const mobilePrimary = nonAdminMobile.slice(0, 4);
  const overflow = nonAdminMobile.slice(4);
  const adminMobile = links.find(([feature]) => feature === 'admin');
  if (!overflow.length && adminMobile && mobilePrimary.length < 4) mobilePrimary.push(adminMobile);
  const mobileMore = [...overflow, ...(overflow.length && adminMobile ? [adminMobile] : [])];
  const accent = escapeHtml(profile.accent);

  return `<!doctype html>
<html lang="zh-CN" data-theme="system" style="--accent:${accent}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark"><meta id="theme-color" name="theme-color" content="#fffbfe"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/app.css"><title>${escapeHtml(title)}</title></head>
<body data-page="${escapeHtml(page)}" data-host="${escapeHtml(profile.host)}" data-features="${escapeHtml(profile.features.join(','))}">
<header class="top-app-bar"><div class="top-bar-inner">
  <a class="brand" href="/" aria-label="返回首页"><span class="brand-mark" aria-hidden="true"></span><span class="brand-copy"><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(profile.eyebrow)}</small></span></a>
  ${navLinks(links, page, 'desktop-navigation')}
  <div class="top-actions"><button id="theme-toggle" class="icon-button" type="button" aria-label="切换显示模式" title="切换显示模式">◐</button><div class="account" id="account" aria-live="polite"><span class="account-placeholder">加载中…</span></div></div>
</div></header>
<main class="main-content">
${page === 'home' ? `<section class="hero"><div class="hero-copy"><span class="overline">${escapeHtml(profile.eyebrow)}</span><h1>${escapeHtml(profile.name)}</h1><p class="lede">${escapeHtml(profile.tagline)}</p><div class="hero-actions"><a class="button filled" href="${primaryHref}">开始使用</a><a class="button tonal" href="/app/tools">打开工具</a></div></div><div class="hero-shape" aria-hidden="true"><span></span></div></section>
<section class="section-heading"><div><span class="overline">常用功能</span><h2>你想做什么？</h2></div></section>
<section class="feature-grid">${cards.map(card => `<a class="feature-card" href="${card.href}"${card.adminOnly ? ' data-admin-only' : ''}><span class="feature-icon">${icon(card.icon)}</span><div class="feature-copy"><span class="feature-label">${escapeHtml(card.label)}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></div><span class="feature-arrow" aria-hidden="true">→</span></a>`).join('')}</section>` : `<section class="page-heading"><span class="overline">${escapeHtml(profile.name)}</span><h1>${escapeHtml(pageName(page))}</h1><p>${escapeHtml(pageDescription(page))}</p></section><section id="app" class="app-panel" aria-live="polite" aria-busy="true"><div class="skeleton-stack" aria-label="正在加载"><span></span><span></span><span></span></div></section>`}
<footer class="site-footer"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.host)}</span></footer>
</main>
${mobileNavigation(mobilePrimary, mobileMore, page)}
<dialog id="nav-sheet" class="bottom-sheet"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-header"><h2>更多</h2><button class="icon-button" type="button" data-close-sheet aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>${navLinks(mobileMore, page, 'sheet-navigation')}</dialog>
<dialog id="confirm-dialog" class="confirm-dialog"><form method="dialog"><div class="dialog-copy"><h2 id="confirm-title">确认操作</h2><p id="confirm-message"></p></div><div class="dialog-actions"><button class="button text" value="cancel">取消</button><button id="confirm-accept" class="button filled" value="confirm">确认</button></div></form></dialog>
<div id="toast" class="snackbar" role="status" aria-live="polite"></div><script type="module" src="/assets/app.js"></script></body></html>`;
}

function pageName(page: string): string {
  return ({ login: '登录', chat: '聊天', social: '动态', tools: '工具', mail: '邮件', mirror: '镜像', store: '应用', admin: '管理' } as Record<string, string>)[page] ?? page;
}

function pageDescription(page: string): string {
  return ({
    login: '使用你的站点账号继续。第一次加入时需要邀请码。',
    chat: '和朋友创建房间，继续上次的对话。',
    social: '分享近况，并选择哪些人可以看到。',
    tools: '编码、哈希和文本处理等随手可用的小工具。',
    mail: '查看收到的邮件，需要时从这里发送消息。',
    mirror: '为固定 HTTPS 网站申请一个独立访问地址。',
    store: '把常用网页应用安装到设备，或者从这里直接打开。',
    admin: '管理成员、域名和站点状态。'
  } as Record<string, string>)[page] ?? '';
}

export const APP_CSS = `
:root{
  color-scheme:light;
  --surface:#fffbfe;
  --surface-container-lowest:#ffffff;
  --surface-container-low:#f7f2fa;
  --surface-container:#f3edf7;
  --surface-container-high:#ece6f0;
  --surface-container-highest:#e6e0e9;
  --on-surface:#1d1b20;
  --on-surface-variant:#49454f;
  --outline:#79747e;
  --outline-variant:#cac4d0;
  --scrim:rgba(0,0,0,.36);
  --shadow:rgba(29,27,32,.12);
  --error:#b3261e;
  --primary:color-mix(in srgb,var(--accent,#6750a4) 38%,#6750a4);
  --on-primary:#ffffff;
  --primary-container:color-mix(in srgb,var(--accent,#6750a4) 16%,#eee7f5);
  --on-primary-container:#251934;
  --secondary-container:color-mix(in srgb,var(--accent,#6750a4) 8%,#eee8f0);
  --success-container:#d8f2db;
  --radius-xs:8px;
  --radius-sm:12px;
  --radius-md:16px;
  --radius-lg:24px;
  --radius-xl:32px;
  font-family:Roboto,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC","PingFang SC",sans-serif;
  font-synthesis:none;
  accent-color:var(--primary);
}
:root[data-theme="dark"]{
  color-scheme:dark;
  --surface:#141218;
  --surface-container-lowest:#0f0d13;
  --surface-container-low:#1d1b20;
  --surface-container:#211f26;
  --surface-container-high:#2b2930;
  --surface-container-highest:#36343b;
  --on-surface:#e6e0e9;
  --on-surface-variant:#cac4d0;
  --outline:#938f99;
  --outline-variant:#49454f;
  --scrim:rgba(0,0,0,.64);
  --shadow:rgba(0,0,0,.28);
  --error:#ffb4ab;
  --primary:color-mix(in srgb,var(--accent,#d0bcff) 55%,#d0bcff);
  --on-primary:#2c1740;
  --primary-container:color-mix(in srgb,var(--accent,#6750a4) 25%,#352a40);
  --on-primary-container:#f2e7ff;
  --secondary-container:color-mix(in srgb,var(--accent,#6750a4) 12%,#302d36);
  --success-container:#173b20;
}
@media(prefers-color-scheme:dark){
  :root[data-theme="system"]{
    color-scheme:dark;
    --surface:#141218;
    --surface-container-lowest:#0f0d13;
    --surface-container-low:#1d1b20;
    --surface-container:#211f26;
    --surface-container-high:#2b2930;
    --surface-container-highest:#36343b;
    --on-surface:#e6e0e9;
    --on-surface-variant:#cac4d0;
    --outline:#938f99;
    --outline-variant:#49454f;
    --scrim:rgba(0,0,0,.64);
    --shadow:rgba(0,0,0,.28);
    --error:#ffb4ab;
    --primary:color-mix(in srgb,var(--accent,#d0bcff) 55%,#d0bcff);
    --on-primary:#2c1740;
    --primary-container:color-mix(in srgb,var(--accent,#6750a4) 25%,#352a40);
    --on-primary-container:#f2e7ff;
    --secondary-container:color-mix(in srgb,var(--accent,#6750a4) 12%,#302d36);
    --success-container:#173b20;
  }
}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{min-width:320px;background:var(--surface);color:var(--on-surface);scrollbar-gutter:stable}
body{margin:0;min-width:320px;min-height:100dvh;background:var(--surface);color:var(--on-surface);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
button,input,textarea,select{font:inherit}
button{color:inherit}
a{color:inherit}
svg{display:block;width:1em;height:1em;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
:focus-visible{outline:3px solid color-mix(in srgb,var(--primary) 48%,transparent);outline-offset:2px}

.top-app-bar{position:sticky;top:0;z-index:40;background:var(--surface);border-bottom:1px solid var(--outline-variant)}
.top-bar-inner{width:min(1180px,100%);min-height:72px;margin:0 auto;padding:8px 24px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:20px}
.brand{min-width:0;display:flex;align-items:center;gap:12px;text-decoration:none}
.brand-mark{width:40px;height:40px;flex:0 0 auto;border-radius:14px;background:var(--primary-container);position:relative;overflow:hidden}
.brand-mark::before{content:"";position:absolute;width:22px;height:22px;border-radius:50%;left:8px;top:9px;background:var(--primary)}
.brand-mark::after{content:"";position:absolute;width:18px;height:18px;border-radius:50%;left:15px;top:5px;background:var(--primary-container)}
.brand-copy{min-width:0;display:grid;line-height:1.15}
.brand-copy strong{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;font-weight:650;letter-spacing:-.02em}
.brand-copy small{max-width:180px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--on-surface-variant);font-size:11px}
.desktop-navigation{min-width:0;display:flex;justify-content:center;gap:2px;overflow-x:auto;scrollbar-width:none}
.desktop-navigation::-webkit-scrollbar{display:none}
.desktop-navigation a{min-width:max-content;min-height:44px;display:flex;align-items:center;gap:7px;padding:0 13px;border-radius:999px;color:var(--on-surface-variant);font-size:13px;font-weight:600;text-decoration:none}
.desktop-navigation a:hover{background:var(--surface-container-low)}
.desktop-navigation a[aria-current="page"]{background:var(--secondary-container);color:var(--on-surface)}
.desktop-navigation .nav-icon{font-size:18px}
.top-actions{min-width:0;display:flex;align-items:center;justify-content:flex-end;gap:6px}
.icon-button{width:44px;height:44px;flex:0 0 auto;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:transparent;color:var(--on-surface-variant);font-size:20px;cursor:pointer;transition:background-color .14s ease,transform .14s ease}
.icon-button:hover{background:var(--surface-container-high)}
.icon-button:active{transform:scale(.96)}
.account{min-width:0;min-height:44px;display:flex;align-items:center;gap:6px}
.account-placeholder{color:var(--on-surface-variant);font-size:12px;white-space:nowrap}
.account-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

.main-content{width:min(1120px,calc(100% - 48px));margin:0 auto;padding:40px 0 56px}
.hero{position:relative;min-height:300px;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,32%);align-items:center;gap:32px;padding:clamp(30px,5vw,56px);border-radius:var(--radius-xl);background:var(--surface-container-low);overflow:hidden}
.hero-copy{position:relative;z-index:1;min-width:0}
.hero-shape{position:relative;min-height:210px;display:grid;place-items:center}
.hero-shape::before,.hero-shape::after,.hero-shape span{content:"";position:absolute;border-radius:999px}
.hero-shape::before{width:190px;height:190px;background:var(--primary-container)}
.hero-shape::after{width:116px;height:116px;right:8%;top:8%;background:color-mix(in srgb,var(--primary) 34%,var(--surface-container-high))}
.hero-shape span{width:92px;height:92px;left:10%;bottom:7%;background:var(--surface-container-highest)}
.overline{display:block;margin-bottom:8px;color:var(--primary);font-size:12px;font-weight:750;letter-spacing:.08em}
.hero h1,.page-heading h1{margin:0;overflow-wrap:anywhere;font-weight:520;letter-spacing:-.035em}
.hero h1{font-size:clamp(42px,6vw,64px);line-height:1.04}
.lede{max-width:620px;margin:18px 0 0;color:var(--on-surface-variant);font-size:clamp(16px,1.7vw,19px);line-height:1.65}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
.section-heading{margin:40px 4px 18px}
.section-heading h2{margin:0;font-size:28px;line-height:1.2;font-weight:560;letter-spacing:-.025em}
.feature-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(250px,100%),1fr));gap:14px}
.feature-card{min-width:0;min-height:190px;display:flex;flex-direction:column;position:relative;padding:22px;border-radius:var(--radius-lg);background:var(--surface-container);text-decoration:none;overflow:hidden;transition:background-color .15s ease,transform .15s ease,box-shadow .15s ease}
.feature-card:nth-child(3n+2){background:var(--primary-container)}
.feature-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px var(--shadow)}
.feature-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:15px;background:color-mix(in srgb,var(--surface-container-lowest) 58%,transparent);color:var(--primary);font-size:22px}
.feature-copy{min-width:0;margin-top:auto;padding-top:26px;padding-right:38px}
.feature-label{color:var(--on-surface-variant);font-size:12px;font-weight:650}
.feature-card h3{margin:3px 0 5px;font-size:24px;line-height:1.2;font-weight:600;letter-spacing:-.025em}
.feature-card p{margin:0;color:var(--on-surface-variant);overflow-wrap:anywhere}
.feature-arrow{position:absolute;right:20px;bottom:18px;font-size:20px;color:var(--on-surface-variant)}

.page-heading{max-width:760px;margin:4px 0 28px}
.page-heading h1{font-size:clamp(36px,5vw,52px);line-height:1.08}
.page-heading p{max-width:650px;margin:12px 0 0;color:var(--on-surface-variant);font-size:16px}
.app-panel{min-width:0;min-height:280px}
.skeleton-stack{display:grid;gap:12px;padding:22px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.skeleton-stack span{height:70px;border-radius:var(--radius-md);background:var(--surface-container-high)}
.skeleton-stack span:nth-child(2){height:108px}

.stack{min-width:0;display:grid;gap:14px}
.split{min-width:0;display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:16px;align-items:start}
.panel{min-width:0;padding:22px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.panel.elevated{background:var(--surface-container-lowest);box-shadow:0 2px 10px var(--shadow)}
.panel h2,.panel h3{margin:0 0 6px;overflow-wrap:anywhere;font-weight:600;letter-spacing:-.02em}
.panel>.panel-description{margin:0 0 18px;color:var(--on-surface-variant)}
.muted{color:var(--on-surface-variant)}
.tiny{font-size:12px}
.row{min-width:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.row>*{min-width:0}
.row.between{justify-content:space-between}
.list{min-width:0;display:grid;gap:8px}
.list-item{min-width:0;display:block;width:100%;padding:14px 16px;border:0;border-radius:var(--radius-md);background:var(--surface-container);color:inherit;text-align:left;text-decoration:none;cursor:pointer;overflow-wrap:anywhere}
.list-item:hover{background:var(--surface-container-high)}
.list-item.active{background:var(--primary-container)}
.empty-state{min-width:0;min-height:150px;display:grid;place-items:center;padding:26px;border-radius:var(--radius-lg);background:var(--surface-container);text-align:center}
.empty-state .empty-icon{width:46px;height:46px;display:grid;place-items:center;margin-bottom:9px;border-radius:16px;background:var(--primary-container);font-size:20px}
.empty-state h3{margin:0 0 4px}
.empty-state p{max-width:400px;margin:0;color:var(--on-surface-variant);overflow-wrap:anywhere}

form{min-width:0;display:grid;gap:14px}
.field{min-width:0;display:grid;gap:7px}
.field-label{font-size:13px;font-weight:650}
.field-help{color:var(--on-surface-variant);font-size:12px;line-height:1.5}
.field-control{min-width:0;position:relative}
input,textarea,select{width:100%;min-width:0;min-height:54px;padding:13px 15px;border:1px solid var(--outline);border-radius:var(--radius-sm);outline:0;background:var(--surface-container-lowest);color:var(--on-surface);transition:border-color .13s ease,box-shadow .13s ease}
textarea{min-height:120px;resize:vertical}
input::placeholder,textarea::placeholder{color:color-mix(in srgb,var(--on-surface-variant) 70%,transparent)}
input:hover,textarea:hover,select:hover{border-color:var(--on-surface)}
input:focus,textarea:focus,select:focus{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 18%,transparent)}

.button,button.button{min-height:46px;max-width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 20px;border:0;border-radius:999px;font-weight:650;text-decoration:none;white-space:normal;text-align:center;cursor:pointer;transition:background-color .14s ease,box-shadow .14s ease,transform .14s ease}
.button:hover{box-shadow:0 2px 8px var(--shadow)}
.button:active{transform:scale(.98)}
.button:disabled,button:disabled{opacity:.52;cursor:not-allowed;box-shadow:none}
.button.filled,.primary{background:var(--primary);color:var(--on-primary)}
.button.tonal{background:var(--primary-container);color:var(--on-primary-container)}
.button.text{background:transparent;color:var(--primary);box-shadow:none}
.button.outlined{border:1px solid var(--outline);background:transparent;color:var(--primary)}
.danger{border:1px solid color-mix(in srgb,var(--error) 42%,transparent)!important;background:transparent!important;color:var(--error)!important}

.messages{min-width:0;min-height:280px;max-height:560px;display:flex;flex-direction:column;gap:8px;padding:6px 2px;overflow:auto;overscroll-behavior:contain}
.message{align-self:flex-start;max-width:min(78%,580px);padding:11px 14px;border-radius:20px 20px 20px 6px;background:var(--surface-container-high);overflow-wrap:anywhere}
.message.mine{align-self:flex-end;border-radius:20px 20px 6px 20px;background:var(--primary-container)}
.message header{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px;color:var(--on-surface-variant);font-size:11px}
.message p{margin:0;white-space:pre-wrap;word-break:break-word}
.post{min-width:0;padding:20px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.post header{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--on-surface-variant);font-size:12px}
.post .body{margin:14px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7}
.pill{max-width:100%;min-height:28px;display:inline-flex;align-items:center;padding:0 10px;border-radius:999px;background:var(--secondary-container);color:var(--on-surface-variant);font-size:11px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill.success{background:var(--success-container)}
.pill.error{background:color-mix(in srgb,var(--error) 12%,var(--surface-container));color:var(--error)}
.tool-grid{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.output{max-width:100%;min-height:80px;margin:12px 0 0;padding:14px;border-radius:var(--radius-md);background:var(--surface-container-lowest);color:var(--on-surface);font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word;overflow:auto}
.callout{min-width:0;padding:15px 17px;border-radius:var(--radius-md);background:var(--primary-container);color:var(--on-primary-container);line-height:1.65;overflow-wrap:anywhere}
.table-wrap{max-width:100%;overflow:auto;border-radius:var(--radius-md);background:var(--surface-container-lowest);overscroll-behavior-inline:contain}
table{width:100%;min-width:560px;border-collapse:collapse;font-size:13px}
th,td{padding:12px 13px;border-bottom:1px solid var(--outline-variant);text-align:left;vertical-align:top;white-space:nowrap}
th{color:var(--on-surface-variant);font-weight:650}
.status-grid{min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.status-card{min-width:0;padding:16px;border-radius:var(--radius-md);background:var(--surface-container)}
.status-card strong{display:block;margin-top:3px;font-size:17px;overflow-wrap:anywhere}
.status-dot{display:inline-block;width:8px;height:8px;margin-right:6px;border-radius:50%;background:var(--outline)}
.status-dot.ok{background:#2e7d32}
.status-dot.warn{background:#b26a00}

.snackbar{position:fixed;z-index:90;left:50%;bottom:24px;width:max-content;max-width:min(560px,calc(100% - 28px));padding:13px 17px;border-radius:14px;background:#322f35;color:#f5eff7;box-shadow:0 8px 24px rgba(0,0,0,.24);opacity:0;transform:translate(-50%,12px);pointer-events:none;transition:opacity .16s ease,transform .16s ease;overflow-wrap:anywhere}
.snackbar.show{opacity:1;transform:translate(-50%,0)}
.snackbar.error{background:#7b2f2a}
.site-footer{display:flex;justify-content:space-between;gap:16px;padding:42px 4px 0;color:var(--on-surface-variant);font-size:12px}

.bottom-navigation{display:none}
.bottom-sheet,.confirm-dialog{border:0;color:var(--on-surface);background:var(--surface-container-high);box-shadow:0 14px 44px var(--shadow)}
dialog::backdrop{background:var(--scrim)}
.bottom-sheet{width:min(560px,100%);max-width:none;margin:auto 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0}
.sheet-handle{width:32px;height:4px;margin:0 auto 13px;border-radius:99px;background:var(--outline)}
.sheet-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 2px 10px}
.sheet-header h2{margin:0;font-size:24px;font-weight:560}
.sheet-navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sheet-navigation a{min-width:0;min-height:72px;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:18px;background:var(--surface-container);text-decoration:none}
.sheet-navigation a[aria-current="page"]{background:var(--primary-container);color:var(--on-primary-container)}
.sheet-navigation .nav-icon{font-size:21px}
.confirm-dialog{width:min(440px,calc(100% - 28px));padding:0;border-radius:28px}
.confirm-dialog form{padding:24px}
.dialog-copy h2{margin:0 0 8px;font-size:24px;font-weight:560}
.dialog-copy p{margin:0;color:var(--on-surface-variant);white-space:pre-wrap;overflow-wrap:anywhere}
.dialog-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:24px}

[data-admin-only]{display:none!important}
body.is-admin [data-admin-only]{display:flex!important}

body[data-page="login"] .page-heading{margin-inline:auto;text-align:center}
body[data-page="login"] .page-heading p{margin-inline:auto}
body[data-page="login"] .app-panel{max-width:900px;margin-inline:auto}
body[data-page="login"] .split{grid-template-columns:minmax(0,440px) minmax(0,320px);justify-content:center}
body[data-page="login"] .split>.panel:first-child{background:var(--surface-container-lowest);box-shadow:0 2px 12px var(--shadow)}

@media(max-width:980px){
  .top-bar-inner{grid-template-columns:minmax(0,1fr) auto;padding-inline:18px}
  .desktop-navigation{display:none}
  .brand-copy strong{max-width:220px}
  .main-content{width:min(900px,calc(100% - 36px));padding-top:30px;padding-bottom:110px}
  .bottom-navigation{position:fixed;z-index:50;left:50%;bottom:max(8px,env(safe-area-inset-bottom));width:min(620px,calc(100% - 16px));min-height:72px;display:flex;align-items:stretch;transform:translateX(-50%);padding:4px;border:1px solid var(--outline-variant);border-radius:26px;background:var(--surface-container-high);box-shadow:0 4px 18px var(--shadow)}
  .bottom-navigation>a,.bottom-navigation>button{min-width:0;flex:1 1 0;min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px 2px;border:0;border-radius:22px;background:transparent;color:var(--on-surface-variant);font-size:10px;font-weight:600;text-decoration:none;cursor:pointer}
  .bottom-navigation .nav-icon{width:48px;height:30px;display:grid;place-items:center;border-radius:18px;font-size:20px}
  .bottom-navigation a[aria-current="page"] .nav-icon,.bottom-more.active .nav-icon{background:var(--primary-container);color:var(--on-primary-container)}
  .split{grid-template-columns:1fr}
  body[data-page="login"] .split{grid-template-columns:minmax(0,560px);justify-content:center}
  body[data-page="login"] .split>.panel:nth-child(2){background:transparent;padding-inline:4px}
  .snackbar{bottom:96px}
}

@media(max-width:680px){
  body{font-size:14px}
  .top-bar-inner{min-height:64px;padding:7px 12px;gap:8px}
  .brand{gap:9px}
  .brand-mark{width:36px;height:36px;border-radius:12px}
  .brand-copy strong{max-width:150px;font-size:16px}
  .brand-copy small{display:none}
  .top-actions{gap:2px}
  .account-name{display:none}
  .account .pill{padding-inline:8px}
  .main-content{width:calc(100% - 24px);padding-top:22px}
  .hero{min-height:0;grid-template-columns:1fr;padding:28px 22px;border-radius:26px}
  .hero h1{font-size:clamp(38px,12vw,50px)}
  .hero-shape{display:none}
  .lede{font-size:16px}
  .section-heading{margin-top:32px}
  .section-heading h2{font-size:25px}
  .feature-grid{grid-template-columns:1fr}
  .feature-card{min-height:164px;padding:20px}
  .feature-copy{padding-top:20px}
  .page-heading{margin-bottom:22px}
  .page-heading h1{font-size:38px}
  .panel{padding:18px;border-radius:20px}
  .tool-grid{grid-template-columns:1fr}
  .message{max-width:90%}
  .row .button{flex:1 1 auto}
  .site-footer{flex-direction:column;gap:2px;padding-top:34px}
  .sheet-navigation{grid-template-columns:1fr}
  .confirm-dialog form{padding:20px}
}

@media(max-width:390px){
  .brand-copy strong{max-width:105px}
  .icon-button{width:40px;height:40px}
  .top-actions .button{padding-inline:14px}
  .main-content{width:calc(100% - 20px)}
  .bottom-navigation{width:calc(100% - 10px);bottom:max(5px,env(safe-area-inset-bottom));border-radius:22px}
  .bottom-navigation>a,.bottom-navigation>button{min-height:60px;border-radius:18px}
  .bottom-navigation .nav-icon{width:42px}
}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}
}
`;

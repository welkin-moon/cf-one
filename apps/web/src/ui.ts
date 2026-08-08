import type { Feature, SiteProfile } from './config';
import { escapeHtml } from './security';

type IconName = 'home' | 'chat' | 'social' | 'tools' | 'mail' | 'mirror' | 'store' | 'admin';
type NavItem = [Feature | 'home', string, string, IconName];

export const UI_ASSET_VERSION = '20260808-1540-v5';

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

const CARDS: Record<Feature, { title: string; text: string; href: string; icon: IconName; adminOnly?: boolean }> = {
  chat: { title: '聊天', text: '创建房间，和朋友继续上次的对话。', href: '/app/chat', icon: 'chat' },
  social: { title: '动态', text: '分享近况，也可以只留给自己。', href: '/app/social', icon: 'social' },
  tools: { title: '工具', text: '编码、哈希和文本处理等随手可用的小工具。', href: '/app/tools', icon: 'tools' },
  mail: { title: '邮件', text: '查看收到的邮件，需要时直接发送。', href: '/app/mail', icon: 'mail' },
  mirror: { title: '镜像', text: '为固定 HTTPS 网站申请一个独立访问地址。', href: '/app/mirror', icon: 'mirror' },
  store: { title: '应用', text: '把常用网页应用安装到设备或直接打开。', href: '/app/store', icon: 'store' },
  admin: { title: '管理', text: '管理成员、域名和站点状态。', href: '/app/admin', icon: 'admin', adminOnly: true }
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
  const publicMore = more.some(([feature]) => feature !== 'admin');
  const adminOnlyMore = more.length > 0 && !publicMore;
  const destinations = primary.map(([feature, href, label, iconName]) => {
    const adminOnly = feature === 'admin' ? ' data-admin-only' : '';
    return `<a href="${href}"${feature === page ? ' aria-current="page"' : ''}${adminOnly}><span class="nav-icon">${icon(iconName)}</span><span class="nav-label">${label}</span></a>`;
  }).join('');
  const moreButton = `<button id="more-nav" class="bottom-more${moreActive ? ' active' : ''}" type="button" aria-label="更多功能"${adminOnlyMore ? ' data-admin-more hidden' : publicMore ? '' : ' hidden'}><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></span><span class="nav-label">更多</span></button>`;
  return `<nav class="bottom-navigation" aria-label="移动导航">${destinations}${moreButton}</nav>`;
}

export function appPage(profile: SiteProfile, path: string): string {
  const page = currentPage(path);
  const links = NAV.filter(([feature]) => feature === 'home' || profile.features.includes(feature as Feature));
  const cards = profile.features.map(feature => ({ feature, ...CARDS[feature] })).filter(card => Boolean(card.title));
  const primaryHref = profile.features.includes('chat') ? '/app/chat' : (cards.find(card => !card.adminOnly)?.href ?? '/app/tools');
  const nonAdmin = links.filter(([feature]) => feature !== 'admin');
  const mobilePrimary = nonAdmin.slice(0, 4);
  const mobileMore = links.filter(([feature]) => !mobilePrimary.some(([primary]) => primary === feature));
  const title = page === 'home' ? profile.name : `${pageName(page)} · ${profile.name}`;
  const script = page === 'login' ? `/assets/auth.js?v=${UI_ASSET_VERSION}` : `/assets/app.js?v=${UI_ASSET_VERSION}`;
  const seed = escapeHtml(profile.accent);

  const content = page === 'home'
    ? `<section class="hero"><div class="hero-copy"><span class="overline">${escapeHtml(profile.eyebrow)}</span><h1>${escapeHtml(profile.name)}</h1><p class="lede">${escapeHtml(profile.tagline)}</p><div class="hero-actions"><a class="button filled" href="${primaryHref}">开始使用</a><a class="button tonal" href="/app/tools">打开工具</a></div></div><div class="hero-orbit" aria-hidden="true"><span></span><span></span></div></section><section class="section-heading"><div><span class="overline">常用功能</span><h2>今天想做什么？</h2></div></section><section class="feature-grid">${cards.map(card => `<a class="feature-card" href="${card.href}"${card.adminOnly ? ' data-admin-only' : ''}><span class="feature-icon">${icon(card.icon)}</span><div class="feature-copy"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></div><span class="feature-arrow" aria-hidden="true">→</span></a>`).join('')}</section>`
    : `<section class="page-heading"><span class="overline">${escapeHtml(profile.name)}</span><h1>${escapeHtml(pageName(page))}</h1><p>${escapeHtml(pageDescription(page))}</p></section><section id="app" class="app-panel" aria-live="polite" aria-busy="true"><div class="loading-surface" aria-label="正在加载"><span></span><span></span><span></span></div></section>`;

  return `<!doctype html><html lang="zh-CN" data-theme="system" style="--seed:${seed}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><meta id="theme-color" name="theme-color" content="#fffbfe"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/app.css?v=${UI_ASSET_VERSION}"><title>${escapeHtml(title)}</title></head><body data-page="${escapeHtml(page)}" data-host="${escapeHtml(profile.host)}" data-features="${escapeHtml(profile.features.join(','))}"><header class="top-app-bar"><div class="top-bar-inner"><a class="brand" href="/" aria-label="返回首页"><span class="brand-mark" aria-hidden="true"></span><span class="brand-copy"><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(profile.eyebrow)}</small></span></a>${navLinks(links, page, 'desktop-navigation')}<div class="top-actions"><button id="theme-toggle" class="icon-button" type="button" aria-label="切换显示模式" title="切换显示模式">◐</button><div id="account" class="account" aria-live="polite"><span class="account-placeholder">加载中…</span></div></div></div></header><main class="main-content">${content}<footer class="site-footer"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.host)}</span></footer></main>${mobileNavigation(mobilePrimary, mobileMore, page)}<dialog id="nav-sheet" class="bottom-sheet"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-header"><h2>更多</h2><button class="icon-button" type="button" data-close-sheet aria-label="关闭"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>${navLinks(mobileMore, page, 'sheet-navigation')}</dialog><dialog id="confirm-dialog" class="confirm-dialog"><form method="dialog"><div class="dialog-copy"><h2 id="confirm-title">确认操作</h2><p id="confirm-message"></p></div><div class="dialog-actions"><button class="button text" value="cancel">取消</button><button id="confirm-accept" class="button filled" value="confirm">确认</button></div></form></dialog><div id="toast" class="snackbar" role="status" aria-live="polite"></div><script type="module" src="${script}"></script></body></html>`;
}

function pageName(page: string): string {
  return ({ login: '登录', chat: '聊天', social: '动态', tools: '工具', mail: '邮件', mirror: '镜像', store: '应用', admin: '管理' } as Record<string, string>)[page] ?? page;
}

function pageDescription(page: string): string {
  return ({
    login: '使用站点账号继续。已有账号只需要用户名或邮箱与密码。',
    chat: '和朋友创建房间，继续上次的对话。',
    social: '分享近况，并选择哪些人可以看到。',
    tools: '编码、哈希和文本处理等随手可用的小工具。',
    mail: '查看收到的邮件，需要时从这里发送消息。',
    mirror: '为固定 HTTPS 网站申请一个独立访问地址。',
    store: '把常用网页应用安装到设备，或者从这里直接打开。',
    admin: '管理成员、域名和站点状态。'
  } as Record<string, string>)[page] ?? '';
}

export const APP_CSS = String.raw`
:root{
  color-scheme:light;
  --surface:#fffbfe;
  --surface-container-lowest:#ffffff;
  --surface-container-low:#f8f2fa;
  --surface-container:#f2ecf5;
  --surface-container-high:#ebe5ee;
  --surface-container-highest:#e4dfe7;
  --on-surface:#1d1b20;
  --on-surface-variant:#49454f;
  --outline:#79747e;
  --outline-variant:#cac4d0;
  --primary:#6750a4;
  --on-primary:#ffffff;
  --primary-container:#eaddff;
  --on-primary-container:#21005d;
  --secondary-container:#e8def8;
  --error:#b3261e;
  --error-container:#f9dedc;
  --scrim:rgba(0,0,0,.38);
  --shadow:rgba(29,27,32,.14);
  --radius-xs:8px;
  --radius-sm:12px;
  --radius-md:16px;
  --radius-lg:24px;
  --radius-xl:32px;
  font-family:Inter,Roboto,"Noto Sans SC","Microsoft YaHei",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-synthesis:none;
}
@supports(color:color-mix(in srgb,#000,#fff)){
  :root{
    --primary:color-mix(in srgb,var(--seed,#a78bfa) 66%,#3d275f);
    --primary-container:color-mix(in srgb,var(--seed,#a78bfa) 18%,#f8f2fa);
    --secondary-container:color-mix(in srgb,var(--seed,#a78bfa) 10%,#f2ecf5);
  }
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
  --primary:#d0bcff;
  --on-primary:#381e72;
  --primary-container:#4f378b;
  --on-primary-container:#eaddff;
  --secondary-container:#4a4458;
  --error:#f2b8b5;
  --error-container:#8c1d18;
  --scrim:rgba(0,0,0,.68);
  --shadow:rgba(0,0,0,.42);
}
@supports(color:color-mix(in srgb,#000,#fff)){
  :root[data-theme="dark"]{
    --primary:color-mix(in srgb,var(--seed,#a78bfa) 62%,#eaddff);
    --primary-container:color-mix(in srgb,var(--seed,#a78bfa) 30%,#302840);
    --secondary-container:color-mix(in srgb,var(--seed,#a78bfa) 15%,#2b2930);
  }
}
@media(prefers-color-scheme:dark){
  :root[data-theme="system"]{
    color-scheme:dark;
    --surface:#141218;--surface-container-lowest:#0f0d13;--surface-container-low:#1d1b20;--surface-container:#211f26;--surface-container-high:#2b2930;--surface-container-highest:#36343b;--on-surface:#e6e0e9;--on-surface-variant:#cac4d0;--outline:#938f99;--outline-variant:#49454f;--primary:#d0bcff;--on-primary:#381e72;--primary-container:#4f378b;--on-primary-container:#eaddff;--secondary-container:#4a4458;--error:#f2b8b5;--error-container:#8c1d18;--scrim:rgba(0,0,0,.68);--shadow:rgba(0,0,0,.42)
  }
  @supports(color:color-mix(in srgb,#000,#fff)){
    :root[data-theme="system"]{--primary:color-mix(in srgb,var(--seed,#a78bfa) 62%,#eaddff);--primary-container:color-mix(in srgb,var(--seed,#a78bfa) 30%,#302840);--secondary-container:color-mix(in srgb,var(--seed,#a78bfa) 15%,#2b2930)}
  }
}
*{box-sizing:border-box}
*[hidden]{display:none!important}
html{background:var(--surface);color:var(--on-surface);-webkit-text-size-adjust:100%;text-size-adjust:100%;scrollbar-gutter:stable}
body{margin:0;min-height:100dvh;overflow-x:hidden;background:var(--surface);color:var(--on-surface);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
button,input,textarea,select{font:inherit;color:inherit}
button,a,input,textarea,select{-webkit-tap-highlight-color:transparent}
a{color:inherit}
svg{display:block;width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.top-app-bar{position:sticky;z-index:40;top:0;background:var(--surface);border-bottom:1px solid var(--outline-variant)}
.top-bar-inner{width:min(1180px,calc(100% - 40px));min-height:72px;margin:0 auto;display:flex;align-items:center;gap:20px}
.brand{display:flex;align-items:center;gap:12px;min-width:0;flex:0 1 auto;text-decoration:none}
.brand-mark{position:relative;flex:0 0 40px;width:40px;height:40px;border-radius:14px;background:var(--primary-container);overflow:hidden}
.brand-mark::before,.brand-mark::after{content:"";position:absolute;border-radius:999px}
.brand-mark::before{inset:8px;background:var(--primary)}
.brand-mark::after{width:20px;height:20px;right:2px;top:3px;background:var(--primary-container)}
.brand-copy{display:grid;min-width:0;line-height:1.15}
.brand-copy strong{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;font-weight:650;letter-spacing:-.015em}
.brand-copy small{max-width:190px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--on-surface-variant);font-size:13px}
.desktop-navigation{min-width:0;display:flex;align-items:center;gap:2px;margin-left:auto}
.desktop-navigation a{position:relative;min-height:44px;display:flex;align-items:center;gap:7px;padding:0 12px;border-radius:22px;color:var(--on-surface-variant);font-size:14px;font-weight:600;text-decoration:none;white-space:nowrap;transition:background .16s ease,color .16s ease}
.desktop-navigation a:hover{background:var(--surface-container-high);color:var(--on-surface)}
.desktop-navigation a[aria-current="page"]{background:var(--secondary-container);color:var(--on-surface)}
.desktop-navigation .nav-icon{width:19px;height:19px}
.top-actions{display:flex;align-items:center;gap:6px;flex:0 0 auto}
.icon-button{width:48px;height:48px;display:grid;place-items:center;padding:0;border:0;border-radius:50%;background:transparent;color:var(--on-surface-variant);font-size:20px;cursor:pointer;transition:background .16s ease,transform .12s ease}
.icon-button svg{width:22px;height:22px}
.icon-button:hover{background:var(--surface-container-high)}
.icon-button:active{transform:scale(.96)}
.account{min-height:48px;display:flex;align-items:center;gap:6px}
.account-placeholder{color:var(--on-surface-variant);font-size:14px}
.account-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.main-content{width:min(1180px,calc(100% - 40px));margin:0 auto;padding:36px 0 56px;min-width:0}
.hero{position:relative;isolation:isolate;min-height:330px;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(220px,.55fr);align-items:center;gap:28px;padding:clamp(34px,5vw,64px);overflow:hidden;border-radius:var(--radius-xl);background:var(--primary-container);color:var(--on-surface)}
.hero-copy{position:relative;z-index:2;max-width:720px;min-width:0}
.overline{display:block;margin-bottom:10px;color:var(--primary);font-size:13px;font-weight:750;letter-spacing:.075em;text-transform:uppercase}
.hero h1,.page-heading h1{margin:0;font-weight:560;letter-spacing:-.035em;line-height:1.04}
.hero h1{font-size:clamp(48px,6vw,72px)}
.lede{max-width:62ch;margin:20px 0 0;color:var(--on-surface-variant);font-size:clamp(17px,1.8vw,20px);line-height:1.65}
.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}
.hero-orbit{position:relative;justify-self:end;width:min(260px,22vw);aspect-ratio:1;border-radius:50%;background:var(--surface-container-lowest);box-shadow:inset 0 0 0 1px var(--outline-variant)}
.hero-orbit::before,.hero-orbit span{content:"";position:absolute;border-radius:50%}
.hero-orbit::before{inset:20%;background:var(--primary)}
.hero-orbit span:first-child{width:36%;height:36%;right:10%;top:8%;background:var(--primary-container);box-shadow:0 0 0 10px var(--surface-container-lowest)}
.hero-orbit span:last-child{width:15%;height:15%;left:11%;bottom:15%;background:var(--secondary-container)}
.button,button.button{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 22px;border:0;border-radius:999px;font-weight:650;text-decoration:none;cursor:pointer;touch-action:manipulation;transition:background .16s ease,box-shadow .16s ease,transform .12s ease}
.button:hover{box-shadow:0 2px 8px var(--shadow)}
.button:active{transform:scale(.985)}
.button:disabled,button:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.button.filled,.primary{background:var(--primary);color:var(--on-primary)}
.button.tonal{background:var(--secondary-container);color:var(--on-surface)}
.button.text{background:transparent;color:var(--primary);box-shadow:none}
.button.outlined{border:1px solid var(--outline);background:transparent;color:var(--primary)}
.button.danger,.danger{border:1px solid var(--error);background:transparent!important;color:var(--error)!important}
.section-heading{margin:42px 2px 18px}
.section-heading h2{margin:0;font-size:30px;font-weight:560;letter-spacing:-.025em}
.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.feature-card{position:relative;min-width:0;min-height:178px;display:grid;grid-template-columns:52px minmax(0,1fr) auto;align-items:start;gap:16px;padding:22px;border-radius:var(--radius-lg);background:var(--surface-container-low);text-decoration:none;overflow:hidden;transition:background .16s ease,transform .16s ease,box-shadow .16s ease}
.feature-card:hover{background:var(--surface-container);transform:translateY(-1px);box-shadow:0 4px 16px var(--shadow)}
.feature-icon{width:52px;height:52px;display:grid;place-items:center;padding:13px;border-radius:18px;background:var(--secondary-container);color:var(--primary)}
.feature-copy{min-width:0}
.feature-card h3{margin:1px 0 7px;font-size:22px;font-weight:620;letter-spacing:-.02em}
.feature-card p{margin:0;color:var(--on-surface-variant);font-size:15px;line-height:1.6;overflow-wrap:anywhere}
.feature-arrow{align-self:end;justify-self:end;color:var(--primary);font-size:22px;line-height:1}
.page-heading{max-width:760px;margin:14px 0 28px}
.page-heading h1{font-size:clamp(38px,5vw,54px)}
.page-heading p{max-width:65ch;margin:14px 0 0;color:var(--on-surface-variant);font-size:16px;line-height:1.65}
.app-panel{min-width:0;min-height:320px}
.loading-surface{display:grid;gap:12px;padding:26px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.loading-surface span{display:block;height:72px;border-radius:var(--radius-md);background:var(--surface-container-high)}
.loading-surface span:nth-child(2){height:112px}
.stack{display:grid;gap:16px;min-width:0}
.split{display:grid;grid-template-columns:minmax(300px,360px) minmax(0,1fr);gap:16px;align-items:start;min-width:0}
.panel{min-width:0;padding:24px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.panel.elevated{background:var(--surface-container-lowest);box-shadow:0 2px 12px var(--shadow)}
.panel h2,.panel h3{margin:0 0 7px;font-weight:620;letter-spacing:-.02em}
.panel h2{font-size:24px}
.panel>.panel-description{margin:0 0 20px;color:var(--on-surface-variant);overflow-wrap:anywhere}
.muted{color:var(--on-surface-variant)}
.tiny{font-size:13px}
.row{min-width:0;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.row.between{justify-content:space-between}
.list{min-width:0;display:grid;gap:8px}
.list-item{min-width:0;width:100%;display:block;padding:15px 16px;border:0;border-radius:var(--radius-md);background:var(--surface-container);color:inherit;text-align:left;text-decoration:none;cursor:pointer;overflow-wrap:anywhere;transition:background .15s ease,transform .12s ease}
.list-item:hover{background:var(--surface-container-high)}
.list-item:active{transform:scale(.995)}
.list-item.active{background:var(--primary-container)}
.empty-state{min-height:150px;display:grid;place-items:center;padding:28px;border-radius:var(--radius-lg);background:var(--surface-container);text-align:center}
.empty-state .empty-icon{width:48px;height:48px;display:grid;place-items:center;margin-bottom:10px;border-radius:16px;background:var(--primary-container);color:var(--primary);font-size:20px}
.empty-state h3{margin:0 0 5px}.empty-state p{max-width:42ch;margin:0;color:var(--on-surface-variant);overflow-wrap:anywhere}
form{min-width:0;display:grid;gap:16px}
.field{min-width:0;display:grid;gap:7px}
.field-label{font-size:14px;font-weight:650}
.field-help{color:var(--on-surface-variant);font-size:13px;line-height:1.5}
.field-control{position:relative;min-width:0}
input,textarea,select{width:100%;min-width:0;min-height:56px;padding:14px 16px;border:1px solid var(--outline);border-radius:var(--radius-sm);outline:0;background:var(--surface-container-lowest);color:var(--on-surface);font-size:16px;transition:border-color .15s ease,box-shadow .15s ease,background .15s ease}
textarea{min-height:128px;resize:vertical}
input::placeholder,textarea::placeholder{color:var(--on-surface-variant);opacity:.72}
input:hover,textarea:hover,select:hover{border-color:var(--on-surface)}
input:focus,textarea:focus,select:focus{border:2px solid var(--primary);padding:13px 15px;box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 12%,transparent)}
.password-control input{padding-right:72px}
.password-control input:focus{padding-right:71px}
.password-toggle{position:absolute;right:6px;top:50%;min-width:56px;min-height:44px;transform:translateY(-50%);border:0;border-radius:22px;background:transparent;color:var(--primary);font-size:14px;font-weight:650;cursor:pointer}
.password-toggle:hover{background:var(--secondary-container)}
.auth-layout{width:min(100%,480px);margin:18px auto 0}
.auth-card{padding:clamp(24px,5vw,36px);border-radius:var(--radius-xl);background:var(--surface-container-low)}
.auth-card h2{margin:0;font-size:30px;font-weight:600;letter-spacing:-.025em}
.auth-card>p{margin:10px 0 24px;color:var(--on-surface-variant);line-height:1.65}
.auth-message{min-height:0;color:var(--on-surface-variant);font-size:14px;line-height:1.5;overflow-wrap:anywhere}
.auth-message:not(:empty){padding:12px 14px;border-radius:var(--radius-sm);background:var(--surface-container)}
.auth-message.error{background:var(--error-container);color:var(--error)}
.auth-message.success{background:var(--primary-container);color:var(--on-surface)}
.callout{padding:15px 16px;border-radius:var(--radius-md);background:var(--secondary-container);color:var(--on-surface-variant);line-height:1.6;overflow-wrap:anywhere}
.messages{min-width:0;min-height:300px;max-height:560px;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:8px 2px;overscroll-behavior:contain}
.message{align-self:flex-start;max-width:min(82%,580px);padding:11px 14px;border-radius:20px 20px 20px 6px;background:var(--surface-container-high);overflow-wrap:anywhere}
.message.mine{align-self:flex-end;border-radius:20px 20px 6px 20px;background:var(--primary-container)}
.message header{display:flex;gap:8px;margin-bottom:4px;color:var(--on-surface-variant);font-size:13px}.message p{margin:0;white-space:pre-wrap;word-break:break-word}
.post{min-width:0;padding:20px;border-radius:var(--radius-lg);background:var(--surface-container-low)}
.post header{display:flex;justify-content:space-between;gap:12px;color:var(--on-surface-variant);font-size:13px}.post .body{margin:14px 0;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65}
.pill{min-height:32px;max-width:220px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border-radius:999px;background:var(--secondary-container);color:var(--on-surface-variant);font-size:13px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pill.success{background:var(--primary-container);color:var(--on-surface)}.pill.error{background:var(--error-container);color:var(--error)}
.status-dot{flex:0 0 9px;width:9px;height:9px;border-radius:50%;background:var(--outline)}.status-dot.ok{background:#2e7d32}.status-dot.warn{background:#b26a00}
.tool-grid{min-width:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.output{min-width:0;min-height:84px;margin:14px 0 0;padding:14px;border-radius:var(--radius-md);background:var(--surface-container-lowest);color:var(--on-surface);font:13px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
.table-wrap{max-width:100%;overflow:auto;border-radius:var(--radius-md);background:var(--surface-container-lowest);overscroll-behavior-inline:contain}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:13px 14px;border-bottom:1px solid var(--outline-variant);text-align:left;white-space:nowrap}th{color:var(--on-surface-variant);font-weight:650}
.status-grid{min-width:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.status-card{min-width:0;padding:18px;border-radius:var(--radius-md);background:var(--surface-container)}.status-card strong{display:block;margin-top:4px;font-size:18px;overflow-wrap:anywhere}
.site-footer{display:flex;justify-content:space-between;gap:20px;padding:44px 2px 4px;color:var(--on-surface-variant);font-size:13px}
.bottom-navigation{display:none}
.bottom-sheet,.confirm-dialog{border:0;color:var(--on-surface);background:var(--surface-container-high);box-shadow:0 12px 42px var(--shadow)}
dialog::backdrop{background:var(--scrim)}
.bottom-sheet{width:min(560px,100%);max-width:none;margin:auto 0 0;padding:10px 18px calc(22px + env(safe-area-inset-bottom));border-radius:28px 28px 0 0}
.sheet-handle{width:32px;height:4px;margin:0 auto 14px;border-radius:99px;background:var(--outline)}
.sheet-header{display:flex;align-items:center;justify-content:space-between;padding:0 2px 10px}.sheet-header h2{margin:0;font-size:24px;font-weight:600}
.sheet-navigation{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.sheet-navigation a{min-width:0;min-height:72px;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:20px;background:var(--surface-container);text-decoration:none;font-size:15px;font-weight:600}
.sheet-navigation a[aria-current="page"]{background:var(--primary-container)}.sheet-navigation .nav-icon{flex:0 0 24px;width:24px;height:24px}
.confirm-dialog{width:min(440px,calc(100% - 32px));padding:0;border-radius:28px}.confirm-dialog form{padding:26px}.dialog-copy h2{margin:0 0 9px;font-size:24px}.dialog-copy p{margin:0;color:var(--on-surface-variant);white-space:pre-wrap;overflow-wrap:anywhere}.dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}
.snackbar{position:fixed;z-index:90;left:50%;bottom:24px;width:max-content;max-width:min(560px,calc(100% - 32px));padding:14px 18px;border-radius:14px;background:#322f35;color:#f5eff7;box-shadow:0 8px 28px rgba(0,0,0,.28);opacity:0;transform:translate(-50%,16px);pointer-events:none;overflow-wrap:anywhere;transition:opacity .18s ease,transform .18s ease}.snackbar.show{opacity:1;transform:translate(-50%,0)}.snackbar.error{background:#7c2e2a}
[data-admin-only]{display:none}
body.is-admin .desktop-navigation [data-admin-only],body.is-admin .bottom-navigation [data-admin-only],body.is-admin .sheet-navigation [data-admin-only]{display:flex}
body.is-admin .feature-grid [data-admin-only]{display:grid}
:focus-visible{outline:3px solid var(--primary);outline-offset:2px}
body[data-page="login"] .desktop-navigation,body[data-page="login"] .bottom-navigation{display:none!important}
body[data-page="login"] .page-heading{display:none}
body[data-page="login"] .main-content{padding-top:clamp(28px,6vw,72px)}
@media(max-width:1050px){
  .desktop-navigation{display:none}
  .main-content{padding-bottom:calc(108px + env(safe-area-inset-bottom))}
  .bottom-navigation{position:fixed;z-index:50;left:0;right:0;bottom:0;min-height:80px;display:flex;align-items:flex-start;gap:0;padding:8px 8px calc(8px + env(safe-area-inset-bottom));border-top:1px solid var(--outline-variant);background:var(--surface-container);box-shadow:0 -2px 12px var(--shadow)}
  .bottom-navigation>a,.bottom-more{min-width:0;min-height:64px;flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:4px 2px;border:0;border-radius:18px;background:transparent;color:var(--on-surface-variant);font-size:12px;font-weight:650;text-decoration:none;cursor:pointer}
  .bottom-navigation .nav-icon{width:56px;height:32px;display:grid;place-items:center;padding:6px 17px;border-radius:18px}
  .bottom-navigation a[aria-current="page"] .nav-icon,.bottom-more.active .nav-icon{background:var(--primary-container);color:var(--on-surface)}
  .bottom-navigation a[aria-current="page"],.bottom-more.active{color:var(--on-surface)}
  .bottom-navigation svg{width:20px;height:20px}
  .feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .split{grid-template-columns:1fr}
}
@media(max-width:700px){
  .top-bar-inner,.main-content{width:min(100% - 28px,1180px)}
  .top-bar-inner{min-height:64px;gap:10px}
  .brand-mark{flex-basis:36px;width:36px;height:36px;border-radius:12px}
  .brand-copy strong{font-size:17px}.brand-copy small{display:none}
  .main-content{padding-top:22px}
  .hero{min-height:0;grid-template-columns:1fr;padding:30px 24px;border-radius:26px}
  .hero h1{font-size:42px}.lede{font-size:17px;margin-top:16px}.hero-actions{margin-top:22px}
  .hero-orbit{display:none}
  .section-heading{margin-top:32px}.section-heading h2{font-size:26px}
  .feature-grid{grid-template-columns:1fr;gap:10px}
  .feature-card{min-height:0;grid-template-columns:48px minmax(0,1fr) auto;padding:18px;border-radius:20px}
  .feature-icon{width:48px;height:48px;padding:12px;border-radius:16px}.feature-card h3{font-size:20px}.feature-card p{font-size:14px}
  .page-heading{margin-top:4px}.page-heading h1{font-size:38px}.page-heading p{font-size:15px}
  .panel{padding:20px;border-radius:20px}.panel h2{font-size:22px}
  .tool-grid,.status-grid{grid-template-columns:1fr}
  .auth-layout{margin-top:6px}.auth-card{border-radius:24px}
  .message{max-width:92%}
  .site-footer{padding-top:34px}
  .snackbar{bottom:calc(96px + env(safe-area-inset-bottom))}
}
@media(max-width:480px){
  .top-bar-inner,.main-content{width:min(100% - 20px,1180px)}
  .brand-copy strong{max-width:118px}
  .account-name{display:none}.pill{max-width:88px}.top-actions{gap:2px}.icon-button{width:44px;height:44px}
  .account .button{min-height:44px;padding:0 15px}
  .hero{padding:26px 20px}.hero h1{font-size:38px}.button,button.button{min-height:46px;padding-inline:18px}
  .feature-card{grid-template-columns:44px minmax(0,1fr) auto;gap:13px;padding:16px}.feature-icon{width:44px;height:44px;padding:11px}.feature-arrow{font-size:19px}
  .bottom-navigation{padding-inline:2px}.bottom-navigation>a,.bottom-more{font-size:12px}.bottom-navigation .nav-icon{width:48px;padding-inline:13px}
  .sheet-navigation{grid-template-columns:1fr}
  .dialog-actions{flex-wrap:wrap}.dialog-actions .button{flex:1 1 auto}
}
@media(hover:none){.feature-card:hover{transform:none;box-shadow:none}.button:hover{box-shadow:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;

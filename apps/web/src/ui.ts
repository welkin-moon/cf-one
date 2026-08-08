import type { Feature, SiteProfile } from './config';
import { escapeHtml } from './security';

type IconName = 'home' | 'files' | 'tools' | 'mail' | 'mirror' | 'store' | 'admin';
type NavItem = [Feature | 'home', string, string, IconName];

export const UI_ASSET_VERSION = '20260808-1923-v6';

const ICONS: Record<IconName, string> = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11.1 12 4l8.5 7.1v8.4a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1Z"/></svg>',
  files: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z"/></svg>',
  tools: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M7 14v6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
  mirror: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 14.5 7 17a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M14.5 9.5 17 7a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0M8.5 15.5l7-7"/></svg>',
  store: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  admin: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.2 13.3v-2.6l-2-.7a6 6 0 0 0-.6-1.4l.9-1.9-1.9-1.9-1.9.9a6 6 0 0 0-1.4-.6l-.7-2H9l-.7 2a6 6 0 0 0-1.4.6L5 4.8 3.1 6.7 4 8.6a6 6 0 0 0-.6 1.4l-2 .7v2.6l2 .7a6 6 0 0 0 .6 1.4l-.9 1.9L5 19.2l1.9-.9a6 6 0 0 0 1.4.6l.7 2h2.6l.7-2a6 6 0 0 0 1.4-.6l1.9.9 1.9-1.9-.9-1.9a6 6 0 0 0 .6-1.4Z"/></svg>'
};

const NAV: NavItem[] = [
  ['home', '/', '首页', 'home'],
  ['files', '/app/files', '文件', 'files'],
  ['tools', '/app/tools', '工具', 'tools'],
  ['mail', '/app/mail', '邮件', 'mail'],
  ['mirror', '/app/mirror', '镜像', 'mirror'],
  ['store', '/app/store', '应用', 'store'],
  ['admin', '/app/admin', '管理', 'admin']
];

const CARDS: Record<Feature, { title: string; text: string; href: string; icon: IconName; adminOnly?: boolean }> = {
  files: { title: '文件', text: '保存文件、查看容量，并按需要选择兼容下载。', href: '/app/files', icon: 'files' },
  tools: { title: '工具', text: '编码、哈希和文本处理等随手可用的小工具。', href: '/app/tools', icon: 'tools' },
  mail: { title: '邮件', text: '查看收到的邮件，需要时直接发送。', href: '/app/mail', icon: 'mail' },
  mirror: { title: '镜像', text: '为固定 HTTPS 网站申请一个独立访问地址。', href: '/app/mirror', icon: 'mirror' },
  store: { title: '应用', text: '把常用网页应用安装到设备或直接打开。', href: '/app/store', icon: 'store' },
  admin: { title: '管理', text: '管理成员、存储额度、域名和站点状态。', href: '/app/admin', icon: 'admin', adminOnly: true }
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
  const destinations = primary.map(([feature, href, label, iconName]) => `<a href="${href}"${feature === page ? ' aria-current="page"' : ''}><span class="nav-icon">${icon(iconName)}</span><span class="nav-label">${label}</span></a>`).join('');
  return `<nav class="bottom-navigation" aria-label="移动导航">${destinations}<button id="more-nav" class="bottom-more${moreActive ? ' active' : ''}" type="button" aria-label="更多功能"><span class="nav-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></span><span class="nav-label">更多</span></button></nav>`;
}

export function appPage(profile: SiteProfile, path: string): string {
  const page = currentPage(path);
  const links = NAV.filter(([feature]) => feature === 'home' || profile.features.includes(feature as Feature));
  const cards = profile.features.map(feature => ({ feature, ...CARDS[feature] }));
  const primaryHref = profile.features.includes('files') ? '/app/files' : (cards.find(card => !card.adminOnly)?.href ?? '/app/tools');
  const nonAdmin = links.filter(([feature]) => feature !== 'admin');
  const mobilePrimary = nonAdmin.slice(0, 4);
  const mobileMore = links.filter(([feature]) => !mobilePrimary.some(([primary]) => primary === feature));
  const title = page === 'home' ? profile.name : `${pageName(page)} · ${profile.name}`;
  const script = page === 'login' ? `/assets/auth.js?v=${UI_ASSET_VERSION}` : `/assets/app.js?v=${UI_ASSET_VERSION}`;
  const seed = escapeHtml(profile.accent);

  const content = page === 'home'
    ? `<section class="hero"><span class="overline">${escapeHtml(profile.eyebrow)}</span><h1>${escapeHtml(profile.name)}</h1><p class="lede">${escapeHtml(profile.tagline)}</p><div class="hero-actions"><a class="button filled" href="${primaryHref}">开始使用</a><a class="button tonal" href="/app/tools">打开工具</a></div></section><section class="section-heading"><span class="overline">常用功能</span><h2>今天想做什么？</h2></section><section class="feature-grid">${cards.map(card => `<a class="feature-card" href="${card.href}"${card.adminOnly ? ' data-admin-only' : ''}><span class="feature-icon">${icon(card.icon)}</span><div><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></div><span class="feature-arrow" aria-hidden="true">→</span></a>`).join('')}</section>`
    : `<section class="page-heading"><span class="overline">${escapeHtml(profile.name)}</span><h1>${escapeHtml(pageName(page))}</h1><p>${escapeHtml(pageDescription(page))}</p></section><section id="app" class="app-panel" aria-live="polite" aria-busy="true"><div class="loading-surface" aria-label="正在加载"><span></span><span></span><span></span></div></section>`;

  return `<!doctype html><html lang="zh-CN" data-theme="system" style="--seed:${seed}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light dark"><meta id="theme-color" name="theme-color" content="#fffbfe"><link rel="manifest" href="/manifest.webmanifest"><link rel="stylesheet" href="/assets/app.css?v=${UI_ASSET_VERSION}"><title>${escapeHtml(title)}</title></head><body data-page="${escapeHtml(page)}" data-host="${escapeHtml(profile.host)}"><header class="top-app-bar"><div class="top-bar-inner"><a class="brand" href="/" aria-label="返回首页"><span class="brand-mark" aria-hidden="true"></span><span class="brand-copy"><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(profile.eyebrow)}</small></span></a>${navLinks(links, page, 'desktop-navigation')}<div class="top-actions"><button id="theme-toggle" class="icon-button" type="button" aria-label="切换显示模式">◐</button><div id="account" class="account" aria-live="polite"><span class="account-placeholder">加载中…</span></div></div></div></header><main class="main-content">${content}<footer class="site-footer"><span>${escapeHtml(profile.name)}</span><span>${escapeHtml(profile.host)}</span></footer></main>${mobileNavigation(mobilePrimary, mobileMore, page)}<dialog id="nav-sheet" class="bottom-sheet"><div class="sheet-handle" aria-hidden="true"></div><div class="sheet-header"><h2>更多</h2><button class="icon-button" type="button" data-close-sheet aria-label="关闭">×</button></div>${navLinks(mobileMore, page, 'sheet-navigation')}</dialog><dialog id="confirm-dialog" class="confirm-dialog"><form method="dialog"><div class="dialog-copy"><h2 id="confirm-title">确认操作</h2><p id="confirm-message"></p></div><div class="dialog-actions"><button class="button text" value="cancel">取消</button><button id="confirm-accept" class="button filled" value="confirm">确认</button></div></form></dialog><div id="toast" class="snackbar" role="status" aria-live="polite"></div><script type="module" src="${script}"></script></body></html>`;
}

function pageName(page: string): string {
  return ({ login: '登录', files: '文件', tools: '工具', mail: '邮件', mirror: '镜像', store: '应用', admin: '管理' } as Record<string, string>)[page] ?? page;
}

function pageDescription(page: string): string {
  return ({
    login: '使用站点账号继续。',
    files: '保存个人文件，查看容量并选择合适的下载路径。',
    tools: '编码、哈希和文本处理等随手可用的小工具。',
    mail: '查看收到的邮件，需要时从这里发送消息。',
    mirror: '为固定 HTTPS 网站申请一个独立访问地址。',
    store: '把常用网页应用安装到设备，或者从这里直接打开。',
    admin: '管理成员、存储额度、域名和站点状态。'
  } as Record<string, string>)[page] ?? '';
}

export const APP_CSS = String.raw`
*{box-sizing:border-box}*[hidden]{display:none!important}
:root{color-scheme:light;--surface:#fffbfe;--surface-low:#f7f2fa;--surface-high:#eee8f0;--surface-top:#fff;--on:#1d1b20;--muted:#49454f;--outline:#79747e;--outline-soft:#cac4d0;--primary:#6750a4;--on-primary:#fff;--primary-container:#eaddff;--on-primary-container:#21005d;--secondary-container:#e8def8;--danger:#ba1a1a;--danger-container:#ffdad6;--success:#296a37;--shadow:0 1px 2px rgba(0,0,0,.08),0 1px 4px rgba(0,0,0,.04);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
:root[data-theme="dark"]{color-scheme:dark;--surface:#141218;--surface-low:#1d1b20;--surface-high:#2b292f;--surface-top:#211f26;--on:#e6e1e5;--muted:#cac4d0;--outline:#938f99;--outline-soft:#49454f;--primary:#d0bcff;--on-primary:#381e72;--primary-container:#4f378b;--on-primary-container:#eaddff;--secondary-container:#4a4458;--danger:#ffb4ab;--danger-container:#93000a;--success:#8bd69a;--shadow:none}
@media(prefers-color-scheme:dark){:root[data-theme="system"]{color-scheme:dark;--surface:#141218;--surface-low:#1d1b20;--surface-high:#2b292f;--surface-top:#211f26;--on:#e6e1e5;--muted:#cac4d0;--outline:#938f99;--outline-soft:#49454f;--primary:#d0bcff;--on-primary:#381e72;--primary-container:#4f378b;--on-primary-container:#eaddff;--secondary-container:#4a4458;--danger:#ffb4ab;--danger-container:#93000a;--success:#8bd69a;--shadow:none}}
html{background:var(--surface);color:var(--on);min-width:320px}body{margin:0;min-height:100vh;background:var(--surface);font-size:16px;line-height:1.5;overflow-x:hidden}a{color:inherit}button,input,textarea,select{font:inherit}svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}body:not(.is-admin) [data-admin-only]{display:none!important}
.top-app-bar{position:sticky;top:0;z-index:20;background:var(--surface);border-bottom:1px solid var(--outline-soft)}.top-bar-inner{max-width:1180px;min-height:72px;margin:auto;padding:8px 24px;display:flex;align-items:center;gap:18px}.brand{display:flex;align-items:center;gap:12px;text-decoration:none;min-width:180px}.brand-mark{width:36px;height:36px;border-radius:12px;background:var(--primary-container);position:relative;flex:none}.brand-mark:after{content:"";position:absolute;width:16px;height:16px;border-radius:50%;background:var(--primary);left:10px;top:10px}.brand-copy{display:grid;line-height:1.2}.brand-copy small{color:var(--muted);font-size:12px;margin-top:3px}.desktop-navigation{display:flex;align-items:center;gap:4px;min-width:0;flex:1}.desktop-navigation a{min-height:44px;padding:0 14px;border-radius:22px;display:flex;align-items:center;gap:8px;text-decoration:none;color:var(--muted);font-weight:600;font-size:14px;white-space:nowrap}.desktop-navigation a:hover{background:var(--surface-high)}.desktop-navigation a[aria-current="page"]{background:var(--secondary-container);color:var(--on)}.desktop-navigation .nav-icon{display:none}.top-actions,.account{display:flex;align-items:center;gap:8px}.account-name{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.account-placeholder{color:var(--muted);font-size:13px}
.main-content{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:44px 0 100px}.hero{max-width:760px;padding:44px 0 34px}.overline{display:block;color:var(--primary);font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.hero h1,.page-heading h1{font-size:clamp(36px,6vw,64px);line-height:1.04;letter-spacing:-.04em;margin:10px 0 16px}.lede,.page-heading p{font-size:clamp(17px,2.4vw,21px);color:var(--muted);max-width:680px;margin:0}.hero-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px}.section-heading{margin:26px 0 18px}.section-heading h2{font-size:28px;margin:5px 0}.feature-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.feature-card{min-width:0;padding:20px;border-radius:24px;background:var(--surface-low);text-decoration:none;display:grid;grid-template-columns:48px minmax(0,1fr) 24px;gap:16px;align-items:start;border:1px solid transparent}.feature-card:hover{background:var(--surface-high);border-color:var(--outline-soft)}.feature-card h3{margin:2px 0 5px;font-size:18px}.feature-card p{margin:0;color:var(--muted);font-size:14px;overflow-wrap:anywhere}.feature-icon{width:48px;height:48px;border-radius:16px;background:var(--primary-container);color:var(--on-primary-container);display:grid;place-items:center}.feature-arrow{color:var(--muted);font-size:22px}.page-heading{padding:20px 0 28px}.page-heading h1{font-size:clamp(34px,5vw,52px)}.app-panel{min-height:180px}
.stack{display:grid;gap:14px}.split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}.panel{min-width:0;background:var(--surface-low);border-radius:24px;padding:22px}.panel h2{font-size:21px;margin:0 0 4px}.panel h3{margin:0}.panel-description{margin:0 0 18px;color:var(--muted)}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;min-width:0}.row.between{justify-content:space-between}.muted{color:var(--muted)}.tiny{font-size:13px}.callout{padding:13px 15px;border-radius:14px;background:var(--secondary-container);color:var(--on);overflow-wrap:anywhere}.list{display:grid;gap:8px;margin-top:12px}.list-item{min-width:0;border:0;background:var(--surface-top);padding:14px 16px;border-radius:16px;text-align:left;text-decoration:none;color:var(--on);box-shadow:var(--shadow);overflow-wrap:anywhere}.list-item.active{outline:2px solid var(--primary)}.list-item .row+.row,.list-item>div+div{margin-top:7px}.empty-state{padding:26px 14px;text-align:center;color:var(--muted)}.empty-state h3{color:var(--on);margin:8px 0 3px}.empty-state p{margin:0}.empty-icon{font-size:24px}.output{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface-top);padding:14px;border-radius:14px;margin:12px 0 0}.tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
form{display:grid;gap:14px}.field{display:grid;gap:7px}.field-label{font-size:13px;font-weight:700;color:var(--muted)}.field-help{font-size:12px;color:var(--muted)}input,textarea,select{width:100%;min-width:0;min-height:56px;border:1px solid var(--outline);border-radius:16px;background:var(--surface-top);color:var(--on);padding:13px 15px;font-size:16px;outline:none}textarea{min-height:120px;resize:vertical}input:focus,textarea:focus,select:focus{border:2px solid var(--primary);padding:12px 14px}.button,button.button{border:0;min-height:48px;border-radius:24px;padding:0 18px;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;font-weight:700;cursor:pointer;white-space:nowrap}.button:disabled{opacity:.55;cursor:default}.button.filled{background:var(--primary);color:var(--on-primary)}.button.tonal{background:var(--secondary-container);color:var(--on)}.button.text{background:transparent;color:var(--primary)}.button.danger{background:var(--danger-container);color:var(--danger)}.icon-button{width:44px;height:44px;border:0;border-radius:50%;display:grid;place-items:center;background:transparent;color:var(--on);cursor:pointer}.icon-button:hover{background:var(--surface-high)}.pill{display:inline-flex;align-items:center;gap:7px;min-height:32px;padding:0 11px;border-radius:16px;background:var(--surface-high);font-size:13px}.pill.success{color:var(--success)}.pill.error{color:var(--danger)}.status-dot{width:8px;height:8px;border-radius:50%;background:var(--outline)}.status-dot.ok{background:var(--success)}.status-dot.warn{background:#e3a008}
.quota{display:grid;gap:8px}.quota-line{height:10px;background:var(--surface-high);border-radius:999px;overflow:hidden}.quota-line span{display:block;height:100%;background:var(--primary);border-radius:inherit;max-width:100%}.quota-meta{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:13px}.upload-card{display:grid;gap:9px}.upload-progress{height:8px;background:var(--surface-high);border-radius:999px;overflow:hidden}.upload-progress span{display:block;height:100%;background:var(--primary);transition:width .2s ease}.file-name{font-weight:700;overflow-wrap:anywhere}.file-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.storage-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.status-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.status-card{background:var(--surface-top);padding:15px;border-radius:16px}.status-card strong{display:flex;align-items:center;gap:8px;margin-top:5px}.table-wrap{overflow:auto;max-width:100%}table{width:100%;border-collapse:collapse;min-width:640px}th,td{text-align:left;padding:12px;border-bottom:1px solid var(--outline-soft);vertical-align:top;overflow-wrap:anywhere}th{font-size:12px;color:var(--muted)}
.loading-surface{display:flex;gap:8px;padding:30px}.loading-surface span{width:10px;height:10px;border-radius:50%;background:var(--outline)}.snackbar{position:fixed;z-index:80;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;pointer-events:none;max-width:min(520px,calc(100% - 32px));padding:13px 18px;border-radius:16px;background:#322f35;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.24);transition:opacity .18s ease,transform .18s ease}.snackbar.show{opacity:1;transform:translate(-50%,0)}.snackbar.error{background:#8c1d18}.confirm-dialog,.bottom-sheet{border:0;background:var(--surface-top);color:var(--on);box-shadow:0 14px 50px rgba(0,0,0,.24)}.confirm-dialog{width:min(460px,calc(100% - 32px));border-radius:28px;padding:0}.confirm-dialog form{padding:24px}.dialog-copy p{color:var(--muted);white-space:pre-wrap}.dialog-actions{display:flex;justify-content:flex-end;gap:8px}.bottom-sheet{width:min(520px,100%);margin:auto auto 0;border-radius:28px 28px 0 0;padding:10px 18px max(20px,env(safe-area-inset-bottom))}.bottom-sheet::backdrop,.confirm-dialog::backdrop{background:rgba(0,0,0,.36)}.sheet-handle{width:36px;height:4px;border-radius:3px;background:var(--outline);margin:2px auto 12px}.sheet-header{display:flex;align-items:center;justify-content:space-between}.sheet-header h2{margin:0}.sheet-navigation{display:grid;gap:5px;margin-top:10px}.sheet-navigation a{min-height:54px;padding:0 14px;border-radius:16px;display:flex;align-items:center;gap:12px;text-decoration:none}.sheet-navigation a[aria-current="page"]{background:var(--secondary-container)}.bottom-navigation{display:none}.site-footer{display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:12px;margin-top:64px;padding-top:20px;border-top:1px solid var(--outline-soft)}
@media(max-width:980px){.desktop-navigation{display:none}.top-bar-inner{min-height:64px;padding:8px 18px}.brand{min-width:0;flex:1}.brand-copy small{display:none}.main-content{width:min(720px,calc(100% - 28px));padding-top:30px;padding-bottom:110px}.feature-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bottom-navigation{position:fixed;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));left:12px;right:12px;bottom:max(10px,env(safe-area-inset-bottom));z-index:30;min-height:72px;padding:5px;border:1px solid var(--outline-soft);border-radius:24px;background:var(--surface-top);box-shadow:0 8px 30px rgba(0,0,0,.16)}.bottom-navigation a,.bottom-more{border:0;background:transparent;color:var(--muted);text-decoration:none;border-radius:18px;display:grid;place-items:center;align-content:center;gap:2px;min-width:0;padding:5px 2px}.bottom-navigation a[aria-current="page"],.bottom-more.active{color:var(--on);background:var(--secondary-container)}.bottom-navigation .nav-icon{height:28px;display:grid;place-items:center}.bottom-navigation .nav-label{font-size:11px;font-weight:700;overflow:hidden;text-overflow:ellipsis;max-width:100%}.split,.storage-grid{grid-template-columns:1fr}.snackbar{bottom:96px}}
@media(max-width:600px){.top-actions .pill{display:none}.main-content{width:calc(100% - 24px);padding-top:22px}.hero{padding-top:28px}.hero h1,.page-heading h1{font-size:38px}.feature-grid,.tool-grid,.status-grid{grid-template-columns:1fr}.feature-card{padding:16px;border-radius:20px;grid-template-columns:44px minmax(0,1fr) 18px;gap:12px}.feature-icon{width:44px;height:44px;border-radius:14px}.panel{padding:18px;border-radius:20px}.row.mobile-stack{align-items:stretch;flex-direction:column}.file-actions .button{flex:1}.site-footer{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

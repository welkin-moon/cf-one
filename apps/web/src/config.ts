import type { Env } from './env';
import { HttpError } from './http';

export type Feature = 'chat' | 'social' | 'tools' | 'mail' | 'mirror' | 'admin' | 'store';

export interface SiteProfile {
  host: string;
  name: string;
  eyebrow: string;
  tagline: string;
  accent: string;
  features: Feature[];
}

const DEFAULTS: Record<string, Omit<SiteProfile, 'host'>> = {
  'lunarlab.uk': {
    name: 'Lunar Lab',
    eyebrow: 'LUNAR EDGE WORKSPACE',
    tagline: '导航、朋友聊天、动态、邮件与边缘工具，都收在同一片月光里。',
    accent: '#a78bfa',
    features: ['chat', 'social', 'tools', 'mail', 'mirror', 'admin', 'store']
  },
  '20100823.xyz': {
    name: '20100823',
    eyebrow: 'PERSONAL INDEX',
    tagline: '一个更轻、更私人的入口：导航、实用工具与可安装网页应用。',
    accent: '#67e8f9',
    features: ['tools', 'store', 'admin']
  }
};

function isFeature(value: unknown): value is Feature {
  return typeof value === 'string' && ['chat', 'social', 'tools', 'mail', 'mirror', 'admin', 'store'].includes(value);
}

export function siteProfile(request: Request, env: Env): SiteProfile {
  const host = new URL(request.url).hostname.toLowerCase();
  const fallback = DEFAULTS[host] ?? DEFAULTS['lunarlab.uk']!;
  let overrides: Record<string, Partial<SiteProfile>> = {};
  try {
    overrides = JSON.parse(env.SITE_CONFIG || '{}') as Record<string, Partial<SiteProfile>>;
  } catch {
    throw new HttpError(500, 'SITE_CONFIG is invalid JSON');
  }
  const selected = overrides[host] ?? {};
  return {
    host,
    name: typeof selected.name === 'string' ? selected.name.slice(0, 80) : (host === 'lunarlab.uk' && env.APP_NAME ? env.APP_NAME : fallback.name),
    eyebrow: typeof selected.eyebrow === 'string' ? selected.eyebrow.slice(0, 100) : fallback.eyebrow,
    tagline: typeof selected.tagline === 'string' ? selected.tagline.slice(0, 240) : fallback.tagline,
    accent: typeof selected.accent === 'string' && /^#[0-9a-f]{6}$/i.test(selected.accent) ? selected.accent : fallback.accent,
    features: Array.isArray(selected.features) ? selected.features.filter(isFeature) : fallback.features
  };
}

export function requireFeature(profile: SiteProfile, feature: Feature): void {
  if (!profile.features.includes(feature)) throw new HttpError(404, 'feature is not enabled on this domain');
}

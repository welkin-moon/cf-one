import type { Env } from './env';
import { HttpError } from './http';

export type Feature = 'tools' | 'files' | 'mail' | 'mirror' | 'admin' | 'store';

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
    eyebrow: '你的私人空间',
    tagline: '文件、工具、邮件、镜像和常用应用，都收在一个地方。',
    accent: '#a78bfa',
    features: ['files', 'tools', 'mail', 'mirror', 'admin', 'store']
  },
  '20100823.xyz': {
    name: '20100823',
    eyebrow: '个人主页',
    tagline: '一个安静、轻量的私人入口，放常用工具和应用。',
    accent: '#67e8f9',
    features: ['tools', 'store', 'admin']
  }
};

function isFeature(value: unknown): value is Feature {
  return typeof value === 'string' && ['tools', 'files', 'mail', 'mirror', 'admin', 'store'].includes(value);
}

export function siteProfile(request: Request, env: Env): SiteProfile {
  const host = new URL(request.url).hostname.toLowerCase();
  const fallback = DEFAULTS[host] ?? DEFAULTS['lunarlab.uk']!;
  let overrides: Record<string, Partial<SiteProfile>> = {};
  try {
    overrides = JSON.parse(env.SITE_CONFIG || '{}') as Record<string, Partial<SiteProfile>>;
  } catch {
    throw new HttpError(500, 'site configuration is invalid');
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

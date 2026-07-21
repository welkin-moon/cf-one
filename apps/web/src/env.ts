export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  MEDIA: R2Bucket;
  APP_NAME: string;
  SESSION_SECRET: string;
  INVITE_CODE: string;
  ADMIN_EMAILS: string;
  USER_ALLOWLIST: string;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  MIRROR_TARGETS: string;
}

export interface Session {
  sub: string;
  email: string;
  role: 'member' | 'admin';
  exp: number;
  device: string;
}

export interface MirrorTarget {
  origin: string;
  allowCookies?: boolean;
}

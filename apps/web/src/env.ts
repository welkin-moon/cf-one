export interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  LEGACY_MF01SM: { fetch(request: Request): Promise<Response> };
  CACHE: KVNamespace;
  STORAGE_USER_RATE_LIMITER: RateLimiterBinding;
  STORAGE_GLOBAL_RATE_LIMITER: RateLimiterBinding;
  MEDIA?: R2Bucket;
  EMAIL?: EmailSender;
  APP_NAME: string;
  SESSION_SECRET: string;
  CREDENTIAL_SECRET?: string;
  INVITE_CODE: string;
  OWNER_PASSWORD: string;
  MAIL_RECIPIENTS: string;
  EMAIL_DESTINATIONS: string;
  MANAGED_ZONES: string;
  DEVICE_BINDING: 'soft' | 'strict';
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  SITE_CONFIG: string;
}

export interface Session {
  sub: string;
  email: string;
  role: 'member' | 'admin';
  exp: number;
  device: string;
  csrf: string;
  deviceChanged?: boolean;
}

export interface MirrorTarget {
  origin: string;
  allowCookies?: boolean;
  allowAuthorization?: boolean;
  rewriteHtml?: boolean;
  label?: string;
}

export interface EmailSender {
  send(message: {
    to: string | string[];
    from: string;
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string;
  }): Promise<unknown>;
}

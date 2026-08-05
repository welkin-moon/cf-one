export type NodeRole = 'user' | 'relay' | 'circle';

export type EventType =
  | 'identity.create'
  | 'identity.delegate'
  | 'identity.revoke'
  | 'node.set'
  | 'profile.set'
  | 'post.declare'
  | 'post.revise'
  | 'post.withdraw'
  | 'reply.declare'
  | 'reaction.declare'
  | 'follow.declare'
  | 'tag.attach'
  | 'circle.create'
  | 'circle.submit'
  | 'circle.admit'
  | 'circle.moderate'
  | 'circle.checkpoint'
  | 'relay.announce'
  | 'relay.attest'
  | 'relay.label';

export interface SignedEvent<T = unknown> {
  v: 1;
  id: string;
  actor: string;
  seq: number;
  prev: string | null;
  type: EventType;
  createdAt: string;
  payload: T;
  delegate?: string;
  signature: string;
}

export interface ObjectPointer {
  object: string;
  author: string;
  source: string;
  contentHash: string;
  createdAt: string;
  audience: 'public' | 'followers' | 'mutuals' | 'friends' | 'list' | 'direct';
  tags: string[];
}

export interface RelayAnnotation {
  target: string;
  issuer: string;
  kind: 'attestation' | 'trust' | 'spam' | 'value' | 'content';
  labels: string[];
  confidence?: number;
  expiresAt?: string;
  signature: string;
}

export interface NodeManifest {
  protocol: 'califa/1';
  role: NodeRole;
  network: string;
  name: string;
  endpoints: {
    manifest: string;
    health: string;
    api: string;
    compatibility: string;
  };
  capabilities: string[];
  clientCompatibility: {
    protocolVersions: number[];
    contentEnvelope: 'encrypted-object-v1';
    eventFormat: 'signed-event-v1';
  };
}

export function roleCapabilities(role: NodeRole): string[] {
  if (role === 'user') {
    return [
      'identity',
      'encrypted-content-origin',
      'github-write-control',
      'scheduled-archive',
      'relay-batch-push',
      'mcp-compatible-api'
    ];
  }
  if (role === 'relay') {
    return [
      'pointer-push',
      'tag-index',
      'trusted-interactions',
      'attestations',
      'value-labels',
      'no-content-cache'
    ];
  }
  return [
    'circle-identity',
    'submission-index',
    'admission-events',
    'moderation-events',
    'multi-operator-checkpoints',
    'no-content-ownership'
  ];
}

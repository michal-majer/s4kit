import type {
  ApiKey,
  Instance,
  SystemService,
  InstanceService,
  EntityPermissions,
  SecureLogData,
} from '@s4kit/shared/types';

// Re-export shared types
export type {
  ApiKey,
  Instance,
  SystemService,
  InstanceService,
  EntityPermissions,
  SecureLogData,
  ErrorCategory,
  ResolvedAuth,
} from '@s4kit/shared/types';

// Hono context variables for proxy routes
export type Variables = {
  apiKey: ApiKey;
  instance: Instance;
  systemService: SystemService;
  instanceService: InstanceService;
  entityPermissions: EntityPermissions;
  logData?: SecureLogData;
};

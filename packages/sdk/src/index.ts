// ============================================================================
// S4Kit SDK - The simplest way to integrate with SAP S/4HANA
// ============================================================================

// Core client
export { S4Kit, createClient } from './client';

// Types
export type {
  // Config
  S4KitConfig,

  // Query options
  QueryOptions,
  OrderByClause,
  ExpandOptions,
  ListResponse,
  ODataResponse,
  PaginateOptions,

  // Entity handling
  EntityHandler,
  EntityKey,
  CompositeKey,
  DeepInsertData,

  // Batch operations
  BatchOperation,
  BatchGet,
  BatchCreate,
  BatchUpdate,
  BatchDelete,
  BatchResult,
  Changeset,

  // Errors
  ODataError,
  ODataErrorDetail,
  IS4KitError,

  // Interceptors
  RequestInterceptor,
  ResponseInterceptor,
  ErrorInterceptor,
  InterceptedRequest,
  InterceptedResponse,

  // Filter types
  FilterOperator,
  LogicalOperator,

  // Fluent query
  FluentQuery,
} from './types';

// Error classes
export {
  S4KitError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ServerError,
  BatchError,
  parseHttpError,
  parseODataError,
  isRetryable,
  isS4KitError,
} from './errors';

// Query building
export {
  buildQuery,
  createFilter,
  FilterBuilder,
  query,
  QueryBuilder,
  formatKey,
  buildFunctionParams,
} from './query-builder';

// Typed helpers
export {
  // Individual functions
  typedList,
  typedListWithCount,
  typedGet,
  typedCount,
  typedCreate,
  typedCreateDeep,
  typedUpdate,
  typedReplace,
  typedDelete,

  // Wrappers
  useEntity,
  createRepository,
} from './typed-helpers';

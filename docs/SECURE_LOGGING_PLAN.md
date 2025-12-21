# S4Kit Secure Logging - Enterprise-Ready Plan

## Executive Summary

**Critical Issue**: The current logging implementation stores request/response bodies in the `request_logs` table (lines 178-179 of `schema.ts`). This poses significant security and compliance risks for enterprise SAP deployments.

**SAP Data Sensitivity Context**:
- Business Partner data contains PII (names, addresses, tax IDs)
- Sales Orders contain pricing, discounts, customer relationships
- Financial data includes bank accounts, payment terms
- HR data contains employee SSN, salaries, health info
- Material/BOM data may contain trade secrets

---

## Current State Analysis

### What's Being Logged (schema.ts:170-184)

```typescript
requestLogs = pgTable('request_logs', {
  id, apiKeyId, method, path, statusCode,
  responseTime, sapResponseTime,
  requestBody: jsonb(),    // ⚠️ RISK: Full SAP payloads
  responseBody: jsonb(),   // ⚠️ RISK: Full SAP responses
  requestHeaders, responseHeaders,
  errorMessage, createdAt
});
```

### Body Capture Logic (proxy.ts:149-156)

```typescript
c.set('logData', {
  requestBody: JSON.stringify(body).length > 10000
    ? { truncated: true, size: ... }
    : requestBody,  // Full body if < 10KB
  responseBody: responseBodyForLog ? ... : undefined,
});
```

### Security Controls in Place
- ✅ Header sanitization (auth tokens masked)
- ✅ 10KB truncation limit
- ✅ Fire-and-forget (no blocking)
- ❌ **No body redaction**
- ❌ **No encryption at rest**
- ❌ **No retention policies**
- ❌ **No access controls**

---

## Risk Assessment

| Risk | Severity | Current State |
|------|----------|---------------|
| PII Exposure (GDPR Art. 5) | **Critical** | Storing full bodies |
| Data Breach Amplification | **High** | Logs become attack target |
| SOC2 Type II Audit Failure | **High** | No data minimization |
| HIPAA Violation (if HR data) | **Critical** | PHI in response bodies |
| Insider Threat | **Medium** | Anyone with DB access sees all |
| Log Forensics Abuse | **Medium** | Logs could reconstruct transactions |

---

## Proposed Architecture

### Tier 1: Metadata-Only Logging (Default - Zero Trust)

**Never store bodies by default.** Capture only operational metadata:

```typescript
interface SecureRequestLog {
  // Identity
  id: string;
  apiKeyId: string;
  organizationId: string;

  // Request Metadata (no content)
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  entity: string;           // Parsed entity name
  operation: string;        // 'read' | 'create' | 'update' | 'delete'

  // Performance
  statusCode: number;
  responseTime: number;     // Total latency
  sapResponseTime: number;  // SAP backend time

  // Size metrics (not content)
  requestSize: number;      // Bytes
  responseSize: number;     // Bytes
  recordCount?: number;     // Number of records returned

  // Error handling (safe)
  success: boolean;
  errorCode?: string;       // OData error code only
  errorCategory?: string;   // 'auth' | 'permission' | 'validation' | 'server'

  // Audit trail
  clientIp: string;         // Hashed or masked
  userAgent?: string;
  requestId: string;        // Correlation ID
  createdAt: Date;
}
```

### Tier 2: Configurable Logging Levels

Organization-level and API-key-level settings:

```typescript
type LogLevel = 'minimal' | 'standard' | 'extended' | 'debug';

interface LoggingConfig {
  level: LogLevel;

  // What to capture at each level
  minimal: {
    // Only: method, path, status, timing, sizes
    captureHeaders: false,
    captureBody: false,
    captureErrors: 'code_only',
  },

  standard: {
    // + sanitized headers, error messages
    captureHeaders: 'sanitized',
    captureBody: false,
    captureErrors: 'message',
  },

  extended: {
    // + body hashes for integrity verification
    captureHeaders: 'sanitized',
    captureBody: 'hash_only',  // SHA-256 of body
    captureErrors: 'full',
  },

  debug: {
    // Temporary full capture - requires explicit enable
    captureHeaders: 'full',
    captureBody: 'redacted',   // PII scrubbed
    captureErrors: 'full',
    autoDisableAfter: '24h',   // Safety limit
    requiresApproval: true,
  }
}
```

### Tier 3: Body Security Options (When Required)

For customers who must capture bodies for compliance/debugging:

#### Option A: Hash-Only Mode
```typescript
{
  requestBodyHash: sha256(JSON.stringify(body)),
  responseBodyHash: sha256(JSON.stringify(response)),
  // Allows verification without storing content
}
```

#### Option B: Redacted Mode with PII Detection
```typescript
// Automatic redaction of known SAP PII fields
const PII_PATTERNS = {
  emailAddress: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi,
  phoneNumber: /\+?[0-9]{10,15}/g,
  taxId: /\b[0-9]{2}-[0-9]{7}\b/g,
  bankAccount: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}/g,
  // SAP-specific fields
  sapPiiFields: [
    'EmailAddress', 'TelephoneNumber', 'FaxNumber',
    'BankAccount', 'TaxNumber', 'SocialSecurityNumber',
    'BirthDate', 'Salary', 'PersonnelNumber'
  ]
};

function redactBody(body: any): any {
  // Deep clone and replace PII with [REDACTED]
}
```

#### Option C: Encrypted Separate Storage
```typescript
// Bodies stored in separate encrypted table
// with different access controls and retention
encryptedLogs = pgTable('encrypted_audit_logs', {
  id: uuid(),
  logId: uuid().references(requestLogs.id),
  encryptedPayload: bytea(),  // AES-256-GCM encrypted
  keyVersion: integer(),      // For key rotation
  expiresAt: timestamp(),     // Auto-delete
});
```

---

## Database Schema Changes

### Phase 1: Remove Body Columns (Breaking Change)

```sql
-- Migration: Remove sensitive columns
ALTER TABLE request_logs DROP COLUMN request_body;
ALTER TABLE request_logs DROP COLUMN response_body;

-- Add safe metadata columns
ALTER TABLE request_logs ADD COLUMN entity varchar(100);
ALTER TABLE request_logs ADD COLUMN operation varchar(20);
ALTER TABLE request_logs ADD COLUMN request_size integer;
ALTER TABLE request_logs ADD COLUMN response_size integer;
ALTER TABLE request_logs ADD COLUMN record_count integer;
ALTER TABLE request_logs ADD COLUMN success boolean NOT NULL DEFAULT true;
ALTER TABLE request_logs ADD COLUMN error_code varchar(50);
ALTER TABLE request_logs ADD COLUMN error_category varchar(20);
ALTER TABLE request_logs ADD COLUMN client_ip_hash varchar(64);
ALTER TABLE request_logs ADD COLUMN request_id varchar(36);
```

### Phase 2: Add Logging Configuration

```typescript
// Add to apiKeys table
loggingLevel: varchar('logging_level', { length: 20 }).default('standard'),
debugLoggingUntil: timestamp('debug_logging_until'), // Auto-expire debug mode

// Add to organizations table
defaultLoggingLevel: varchar('default_logging_level', { length: 20 }).default('standard'),
loggingRetentionDays: integer('logging_retention_days').default(90),
```

### Phase 3: Separate Audit Storage (Optional)

```typescript
// For customers requiring body capture
auditPayloads = pgTable('audit_payloads', {
  id: uuid().defaultRandom().primaryKey(),
  logId: uuid().references(() => requestLogs.id, { onDelete: 'cascade' }),
  payloadType: varchar('payload_type', { length: 10 }), // 'request' | 'response'

  // Security options (only one populated based on config)
  contentHash: varchar('content_hash', { length: 64 }),     // SHA-256
  redactedContent: jsonb('redacted_content'),               // PII scrubbed
  encryptedContent: bytea('encrypted_content'),             // AES-256-GCM
  encryptionKeyId: varchar('encryption_key_id', { length: 36 }),

  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Index for TTL cleanup
CREATE INDEX idx_audit_payloads_expires ON audit_payloads(expires_at);
```

---

## Implementation Phases

### Phase 1: Immediate Security (Week 1)
1. **Remove body storage** - Delete `requestBody` and `responseBody` columns
2. **Add size metrics** - Track bytes instead of content
3. **Add success flag** - Boolean for quick filtering
4. **Hash client IPs** - Privacy-preserving analytics

### Phase 2: Operational Improvements (Week 2-3)
1. **Add entity/operation parsing** - Extract from path
2. **Add request ID** - Correlation for distributed tracing
3. **Add error categorization** - Structured error handling
4. **Improve error messages** - Safe extraction without body data

### Phase 3: Enterprise Features (Week 4-6)
1. **Configurable log levels** - Per-org and per-key settings
2. **Log retention policies** - Automatic TTL cleanup
3. **Debug mode with auto-disable** - Safe temporary verbose logging
4. **Access controls** - Role-based log visibility

### Phase 4: Advanced Capabilities (Future)
1. **SIEM integration** - Export to Splunk, Datadog, etc.
2. **Real-time streaming** - WebSocket/SSE for dashboards
3. **Aggregated analytics** - Charts without raw data exposure
4. **Audit log of log access** - Who viewed what logs

---

## API Design

### Logs Endpoint Enhancement

```typescript
// GET /admin/logs
interface LogsQuery {
  // Filters
  apiKeyId?: string;
  organizationId?: string;
  entity?: string;
  operation?: 'read' | 'create' | 'update' | 'delete';
  statusCode?: number | { min?: number; max?: number };
  success?: boolean;
  errorCategory?: string;

  // Date range
  from?: string;  // ISO date
  to?: string;

  // Pagination
  limit?: number;
  offset?: number;
  cursor?: string;  // For efficient pagination

  // Sorting
  sortBy?: 'createdAt' | 'responseTime' | 'statusCode';
  sortOrder?: 'asc' | 'desc';
}

// Response
interface LogsResponse {
  data: SecureRequestLog[];
  pagination: {
    total: number;
    hasMore: boolean;
    cursor?: string;
  };
  aggregations?: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
  };
}
```

### Log Analytics Endpoint (New)

```typescript
// GET /admin/logs/analytics
interface LogAnalyticsQuery {
  organizationId?: string;
  apiKeyId?: string;
  from: string;
  to: string;
  groupBy: 'hour' | 'day' | 'week' | 'entity' | 'operation' | 'statusCode';
}

// Response with aggregated data only - no raw exposure
interface LogAnalytics {
  buckets: Array<{
    key: string;
    count: number;
    successCount: number;
    errorCount: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    totalRequestBytes: number;
    totalResponseBytes: number;
  }>;
  summary: {
    totalRequests: number;
    uniqueApiKeys: number;
    uniqueEntities: number;
    successRate: number;
    avgResponseTime: number;
  };
}
```

---

## Frontend Requirements

### Logs Page (/logs)

1. **Filterable list view**
   - Date range picker
   - API key selector
   - Entity filter
   - Status code filter
   - Success/failure toggle

2. **Log detail view**
   - Request metadata
   - Timing breakdown
   - Error details (code + category)
   - **No body content displayed**

3. **Analytics dashboard**
   - Request volume over time
   - Success rate chart
   - Response time percentiles
   - Top entities by volume
   - Error distribution

### API Key View Enhancement

Add "Recent Activity" section:
- Last 10 requests summary
- Success rate for this key
- Avg response time
- Link to filtered logs view

---

## Compliance Mapping

| Requirement | Solution |
|-------------|----------|
| GDPR Art. 5 (Data Minimization) | Metadata-only logging by default |
| GDPR Art. 17 (Right to Erasure) | Retention policies + bulk delete |
| SOC2 CC6.1 (Logical Access) | Role-based log access |
| SOC2 CC7.2 (Monitoring) | Real-time analytics without raw data |
| HIPAA Security Rule | Encrypted audit storage option |
| PCI DSS 10.2 | Audit trail without card data |

---

## Migration Strategy

### For Existing Installations

1. **Backup existing logs** (encrypted export)
2. **Run migration** to remove body columns
3. **Update application** with new logging middleware
4. **Communicate changes** to API key holders

### Breaking Changes

- `requestBody` and `responseBody` fields removed from API response
- Frontend components using these fields need updates
- Any integrations parsing bodies from logs need migration

---

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 1: Remove Bodies | 2-3 days | **Critical** |
| Phase 2: Operational | 1 week | High |
| Phase 3: Enterprise | 2 weeks | Medium |
| Phase 4: Advanced | Ongoing | Low |

---

## Recommendation

**Implement Phase 1 immediately.** The current body storage is a liability that:
- Exposes sensitive SAP data
- Creates compliance risk
- Increases database storage costs
- Provides minimal debugging value (bodies change constantly)

Metadata-only logging provides 95% of the operational value with 0% of the risk.

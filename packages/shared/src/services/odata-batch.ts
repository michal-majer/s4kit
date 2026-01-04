/**
 * OData $batch utilities for building and parsing multipart/mixed requests
 *
 * OData batch format uses multipart/mixed with:
 * - Batch boundary: outer container for all operations
 * - Changeset boundary: atomic unit (all operations succeed or all fail)
 *
 * Operations within a changeset are executed as a single transaction.
 * If any operation fails, the entire changeset is rolled back by the server.
 */

// ============================================================================
// Types
// ============================================================================

export interface BatchOperation {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  contentId?: string;
}

export interface BatchResponse {
  contentId?: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface ParsedBatchResponse {
  responses: BatchResponse[];
  hasErrors: boolean;
}

// ============================================================================
// Batch Request Building
// ============================================================================

/**
 * Generate a unique boundary string
 */
function generateBoundary(prefix: string): string {
  const random = Math.random().toString(36).substring(2, 15);
  const timestamp = Date.now().toString(36);
  return `${prefix}_${random}${timestamp}`;
}

/**
 * Serialize a single operation as an HTTP request within the batch
 */
function serializeOperation(op: BatchOperation, contentId: number): string {
  const lines: string[] = [];

  // HTTP request line
  lines.push(`${op.method} ${op.path} HTTP/1.1`);

  // Headers
  if (op.method !== 'GET' && op.method !== 'DELETE') {
    lines.push('Content-Type: application/json');
  }
  lines.push('Accept: application/json');

  // Add custom headers
  if (op.headers) {
    for (const [key, value] of Object.entries(op.headers)) {
      lines.push(`${key}: ${value}`);
    }
  }

  // Empty line before body
  lines.push('');

  // Body (for POST, PUT, PATCH)
  if (op.body !== undefined) {
    lines.push(JSON.stringify(op.body));
  }

  return lines.join('\r\n');
}

/**
 * Build a changeset (atomic group of operations)
 */
function buildChangeset(operations: BatchOperation[], changesetBoundary: string): string {
  const parts: string[] = [];

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]!;
    const contentId = i + 1;

    parts.push(`--${changesetBoundary}`);
    parts.push('Content-Type: application/http');
    parts.push('Content-Transfer-Encoding: binary');
    parts.push(`Content-ID: ${contentId}`);
    parts.push('');
    parts.push(serializeOperation(op, contentId));
  }

  parts.push(`--${changesetBoundary}--`);

  return parts.join('\r\n');
}

/**
 * Build a complete OData $batch request body
 *
 * @param operations - Array of operations to include
 * @param atomic - If true, wrap all operations in a single changeset (transaction)
 * @returns Object with body string and Content-Type header value
 */
export function buildBatchRequest(
  operations: BatchOperation[],
  atomic: boolean
): { body: string; contentType: string; batchBoundary: string } {
  const batchBoundary = generateBoundary('batch');
  const parts: string[] = [];

  if (atomic) {
    // Wrap all operations in a single changeset for atomicity
    const changesetBoundary = generateBoundary('changeset');

    parts.push(`--${batchBoundary}`);
    parts.push(`Content-Type: multipart/mixed; boundary=${changesetBoundary}`);
    parts.push('');
    parts.push(buildChangeset(operations, changesetBoundary));
  } else {
    // Each operation is independent (no changeset = no atomicity)
    // For non-atomic, we still use changesets but one per operation
    // This allows the server to process them independently
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i]!;
      const changesetBoundary = generateBoundary('changeset');

      parts.push(`--${batchBoundary}`);
      parts.push(`Content-Type: multipart/mixed; boundary=${changesetBoundary}`);
      parts.push('');
      parts.push(buildChangeset([op], changesetBoundary));
    }
  }

  parts.push(`--${batchBoundary}--`);

  return {
    body: parts.join('\r\n'),
    contentType: `multipart/mixed; boundary=${batchBoundary}`,
    batchBoundary,
  };
}

// ============================================================================
// Batch Response Parsing
// ============================================================================

/**
 * Extract boundary from Content-Type header
 */
function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=([^;,\s]+)/i);
  return match ? match[1]!.replace(/^["']|["']$/g, '') : null;
}

/**
 * Split multipart body into parts by boundary
 */
function splitByBoundary(body: string, boundary: string): string[] {
  // Normalize line endings
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by boundary
  const parts = normalized.split(new RegExp(`--${escapeRegex(boundary)}(?:--)?`));

  // Filter out empty parts and the preamble/epilogue
  return parts
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('--'));
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse a single HTTP response from the batch
 */
function parseHttpResponse(content: string): BatchResponse {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split headers and body
  const headerBodySplit = normalized.indexOf('\n\n');
  const headerSection = headerBodySplit > 0 ? normalized.substring(0, headerBodySplit) : normalized;
  const bodySection = headerBodySplit > 0 ? normalized.substring(headerBodySplit + 2).trim() : '';

  const lines = headerSection.split('\n');

  // Find the HTTP status line (might be after Content-Type headers)
  let statusLine = '';
  let statusLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.startsWith('HTTP/')) {
      statusLine = lines[i]!;
      statusLineIndex = i;
      break;
    }
  }

  // Parse status
  let status = 200;
  let statusText = 'OK';
  if (statusLine) {
    const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)\s*(.*)/);
    if (statusMatch) {
      status = parseInt(statusMatch[1]!, 10);
      statusText = statusMatch[2] || '';
    }
  }

  // Parse headers (after status line)
  const headers: Record<string, string> = {};
  let contentId: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i === statusLineIndex) continue; // Skip status line

    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;

      if (key === 'content-id') {
        contentId = value;
      }
    }
  }

  // Parse body as JSON if possible
  let body: unknown = undefined;
  if (bodySection) {
    try {
      body = JSON.parse(bodySection);
    } catch {
      // If not JSON, keep as string
      body = bodySection;
    }
  }

  return {
    contentId,
    status,
    statusText,
    headers,
    body,
  };
}

/**
 * Parse a changeset response (may contain multiple responses)
 */
function parseChangesetResponse(content: string, changesetBoundary: string): BatchResponse[] {
  console.log(`[odata-batch] Parsing changeset with boundary: ${changesetBoundary}`);
  const parts = splitByBoundary(content, changesetBoundary);
  console.log(`[odata-batch] Found ${parts.length} parts in changeset`);
  const responses: BatchResponse[] = [];

  for (let partIndex = 0; partIndex < parts.length; partIndex++) {
    const part = parts[partIndex]!;
    console.log(`[odata-batch] Changeset part ${partIndex}:\n${part.substring(0, 300)}...`);

    // Each part should contain headers and an HTTP response
    // Skip Content-Type/Content-Transfer-Encoding headers to get to the HTTP response
    const lines = part.split('\n');
    let httpResponseStart = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line === '' || line.startsWith('HTTP/')) {
        httpResponseStart = i;
        break;
      }
    }

    const httpContent = lines.slice(httpResponseStart).join('\n');
    console.log(`[odata-batch] HTTP content for part ${partIndex}:\n${httpContent.substring(0, 300)}...`);

    if (httpContent.trim()) {
      const parsed = parseHttpResponse(httpContent);
      console.log(`[odata-batch] Parsed response ${partIndex}: status=${parsed.status}, body=${JSON.stringify(parsed.body)?.substring(0, 100)}`);
      responses.push(parsed);
    }
  }

  return responses;
}

/**
 * Parse a complete OData $batch response
 *
 * @param responseBody - The multipart/mixed response body
 * @param contentType - The Content-Type header (contains boundary)
 * @returns Parsed responses with status for each operation
 */
export function parseBatchResponse(
  responseBody: string,
  contentType: string
): ParsedBatchResponse {
  console.log(`[odata-batch] parseBatchResponse called with contentType: ${contentType}`);
  const batchBoundary = extractBoundary(contentType);
  console.log(`[odata-batch] Extracted batch boundary: ${batchBoundary}`);

  if (!batchBoundary) {
    throw new Error('Could not extract batch boundary from Content-Type');
  }

  const responses: BatchResponse[] = [];
  const parts = splitByBoundary(responseBody, batchBoundary);
  console.log(`[odata-batch] Found ${parts.length} batch parts`);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    console.log(`[odata-batch] Batch part ${i} (first 200 chars):\n${part.substring(0, 200)}...`);

    // Check if this part is a changeset
    const contentTypeMatch = part.match(/Content-Type:\s*multipart\/mixed;\s*boundary=([^\s\n]+)/i);

    if (contentTypeMatch) {
      // This is a changeset - parse nested responses
      const changesetBoundary = contentTypeMatch[1]!.replace(/^["']|["']$/g, '');
      const changesetResponses = parseChangesetResponse(part, changesetBoundary);
      responses.push(...changesetResponses);
    } else {
      // This is a direct response (GET or error)
      const httpResponse = parseHttpResponse(part);
      if (httpResponse.status > 0) {
        responses.push(httpResponse);
      }
    }
  }

  const hasErrors = responses.some(r => r.status >= 400);

  return {
    responses,
    hasErrors,
  };
}

/**
 * Check if a service supports OData $batch
 * This is a simple heuristic - most OData services support it
 */
export function buildBatchPath(servicePath: string): string {
  // Remove trailing slash and append $batch
  const cleanPath = servicePath.replace(/\/+$/, '');
  return `${cleanPath}/$batch`;
}

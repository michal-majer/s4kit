/**
 * XSUAA OAuth Provider for better-auth
 *
 * Extracts XSUAA credentials from VCAP_SERVICES and configures
 * better-auth custom OAuth provider for SAP BTP authentication.
 */

export interface XsuaaOAuthConfig {
  clientId: string;
  clientSecret: string;
  /** Authorization endpoint URL */
  authorizationUrl: string;
  /** Token endpoint URL */
  tokenUrl: string;
  /** User info endpoint URL */
  userinfoUrl: string;
  /** XSUAA app name for scope mapping */
  xsappname: string;
  /** Identity zone for multi-tenant scenarios */
  identityZone?: string;
}

interface XsuaaCredentials {
  clientid: string;
  clientsecret: string;
  url: string;
  identityzone?: string;
  identityzoneid?: string;
  xsappname?: string;
  uaadomain?: string;
  tenantmode?: string;
  subaccountid?: string;
  zoneid?: string;
  verificationkey?: string;
}

interface VcapServices {
  xsuaa?: Array<{
    name?: string;
    label?: string;
    plan?: string;
    credentials: XsuaaCredentials;
  }>;
  [key: string]: unknown;
}

/**
 * Parse XSUAA credentials from VCAP_SERVICES environment variable
 */
function parseXsuaaFromVcap(): XsuaaCredentials | null {
  const vcapServices = process.env.VCAP_SERVICES;
  if (!vcapServices) return null;

  try {
    const parsed = JSON.parse(vcapServices) as VcapServices;

    // Look for xsuaa service
    if (parsed.xsuaa && parsed.xsuaa.length > 0) {
      const xsuaa = parsed.xsuaa[0]!;
      const creds = xsuaa.credentials;

      // Validate required fields
      if (creds.clientid && creds.clientsecret && creds.url) {
        return creds;
      }
    }

    return null;
  } catch (error) {
    console.error('[XSUAA] Failed to parse VCAP_SERVICES:', error);
    return null;
  }
}

/**
 * Get XSUAA OAuth configuration for better-auth
 *
 * Returns null if XSUAA is not configured (running outside BTP or no xsuaa service bound)
 */
export function getXsuaaOAuthConfig(): XsuaaOAuthConfig | null {
  const creds = parseXsuaaFromVcap();
  if (!creds) return null;

  // Normalize base URL (remove trailing slash)
  const baseUrl = creds.url.replace(/\/$/, '');

  return {
    clientId: creds.clientid,
    clientSecret: creds.clientsecret,
    authorizationUrl: `${baseUrl}/oauth/authorize`,
    tokenUrl: `${baseUrl}/oauth/token`,
    userinfoUrl: `${baseUrl}/userinfo`,
    xsappname: creds.xsappname || 's4kit',
    identityZone: creds.identityzone || creds.zoneid,
  };
}

/**
 * Check if XSUAA service is available
 */
export function isXsuaaAvailable(): boolean {
  return parseXsuaaFromVcap() !== null;
}

/**
 * Get XSUAA xsappname for scope mapping
 *
 * Scopes in XSUAA are formatted as: $XSAPPNAME.scope_name
 */
export function getXsappname(): string | null {
  const creds = parseXsuaaFromVcap();
  return creds?.xsappname || null;
}

/**
 * Map XSUAA scopes to S4Kit roles
 *
 * @param scopes - Array of scopes from XSUAA token
 * @returns S4Kit role: 'owner' | 'admin' | 'developer'
 */
export function mapXsuaaScopesToRole(scopes: string[]): 'owner' | 'admin' | 'developer' {
  const xsappname = getXsappname() || 's4kit';

  // Check scopes in priority order
  if (scopes.includes(`${xsappname}.owner`)) {
    return 'owner';
  }
  if (scopes.includes(`${xsappname}.admin`)) {
    return 'admin';
  }

  // Default to developer (read-only access)
  return 'developer';
}

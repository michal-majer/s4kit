/**
 * Service Binding Parser
 *
 * Parses VCAP_SERVICES and SAP BTP service binding JSON formats
 * to extract OAuth credentials for XSUAA and other authentication services.
 */

export interface ParsedBinding {
  /** OAuth token endpoint URL */
  tokenUrl: string;
  /** Client ID */
  clientId: string;
  /** Client Secret (plain text, needs to be encrypted before storage) */
  clientSecret: string;
  /** OAuth scope (optional) */
  scope?: string;
  /** Identity zone / tenant (optional) */
  identityZone?: string;
  /** Original binding type detected */
  bindingType: 'xsuaa' | 'destination' | 'connectivity' | 'unknown';
}

export type BindingFormat = 'vcap_services' | 'service_binding' | 'unknown';

/**
 * XSUAA credentials structure from VCAP_SERVICES or service binding
 */
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
  'credential-type'?: string;
}

/**
 * Destination service credentials structure
 */
interface DestinationCredentials {
  clientid: string;
  clientsecret: string;
  url: string;
  uri?: string;
  identityzone?: string;
}

/**
 * VCAP_SERVICES structure
 */
interface VcapServices {
  xsuaa?: Array<{
    name?: string;
    label?: string;
    credentials: XsuaaCredentials;
  }>;
  destination?: Array<{
    name?: string;
    label?: string;
    credentials: DestinationCredentials;
  }>;
  connectivity?: Array<{
    name?: string;
    label?: string;
    credentials: any;
  }>;
  [key: string]: any;
}

/**
 * Service binding JSON structure (direct export from BTP cockpit)
 */
interface ServiceBinding {
  clientid?: string;
  clientsecret?: string;
  url?: string;
  identityzone?: string;
  // Nested credentials format
  credentials?: XsuaaCredentials | DestinationCredentials;
}

/**
 * Detect the format of the provided JSON
 */
export function detectBindingFormat(json: string): BindingFormat {
  try {
    const parsed = JSON.parse(json);

    // Check if it's VCAP_SERVICES format (has service type keys like 'xsuaa', 'destination')
    if (parsed.xsuaa || parsed.destination || parsed.connectivity) {
      return 'vcap_services';
    }

    // Check if it's a direct service binding (has credentials at root or nested)
    if (parsed.clientid || parsed.credentials?.clientid) {
      return 'service_binding';
    }

    // Check for array format (sometimes VCAP_SERVICES is just the service array)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].credentials) {
      return 'vcap_services';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Parse VCAP_SERVICES JSON format
 *
 * @param json - VCAP_SERVICES JSON string
 * @param preferredService - Preferred service type to extract ('xsuaa' | 'destination')
 */
export function parseVcapServices(json: string, preferredService?: string): ParsedBinding | null {
  try {
    const parsed = JSON.parse(json) as VcapServices;

    // Try XSUAA first (most common for CAP applications)
    if ((!preferredService || preferredService === 'xsuaa') && parsed.xsuaa && parsed.xsuaa.length > 0) {
      const xsuaa = parsed.xsuaa[0]!;
      const creds = xsuaa.credentials;

      if (!creds.clientid || !creds.clientsecret || !creds.url) {
        return null;
      }

      return {
        tokenUrl: buildTokenUrl(creds.url),
        clientId: creds.clientid,
        clientSecret: creds.clientsecret,
        identityZone: creds.identityzone || creds.zoneid,
        bindingType: 'xsuaa',
      };
    }

    // Try destination service
    if ((!preferredService || preferredService === 'destination') && parsed.destination && parsed.destination.length > 0) {
      const dest = parsed.destination[0]!;
      const creds = dest.credentials;

      if (!creds.clientid || !creds.clientsecret || !creds.url) {
        return null;
      }

      return {
        tokenUrl: buildTokenUrl(creds.url),
        clientId: creds.clientid,
        clientSecret: creds.clientsecret,
        identityZone: creds.identityzone,
        bindingType: 'destination',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse direct service binding JSON format
 *
 * @param json - Service binding JSON string (exported from BTP cockpit)
 */
export function parseServiceBinding(json: string): ParsedBinding | null {
  try {
    const parsed = JSON.parse(json) as ServiceBinding;

    // Check for credentials at root level
    if (parsed.clientid && parsed.clientsecret && parsed.url) {
      return {
        tokenUrl: buildTokenUrl(parsed.url),
        clientId: parsed.clientid,
        clientSecret: parsed.clientsecret,
        identityZone: parsed.identityzone,
        bindingType: detectServiceType(parsed),
      };
    }

    // Check for nested credentials
    if (parsed.credentials) {
      const creds = parsed.credentials;

      if (!creds.clientid || !creds.clientsecret || !creds.url) {
        return null;
      }

      return {
        tokenUrl: buildTokenUrl(creds.url),
        clientId: creds.clientid,
        clientSecret: creds.clientsecret,
        identityZone: creds.identityzone,
        bindingType: detectServiceType(creds),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Auto-detect format and parse service binding
 *
 * @param json - JSON string (VCAP_SERVICES or service binding)
 * @param preferredService - Preferred service type for VCAP_SERVICES
 */
export function parseBinding(json: string, preferredService?: string): ParsedBinding | null {
  const format = detectBindingFormat(json);

  switch (format) {
    case 'vcap_services':
      return parseVcapServices(json, preferredService);
    case 'service_binding':
      return parseServiceBinding(json);
    default:
      // Try both parsers as fallback
      return parseServiceBinding(json) || parseVcapServices(json, preferredService);
  }
}

/**
 * Build OAuth token URL from XSUAA/UAA base URL
 */
function buildTokenUrl(baseUrl: string): string {
  // Remove trailing slash
  const url = baseUrl.replace(/\/$/, '');

  // If already ends with /oauth/token, return as is
  if (url.endsWith('/oauth/token')) {
    return url;
  }

  // Append /oauth/token
  return `${url}/oauth/token`;
}

/**
 * Detect service type from credentials
 */
function detectServiceType(creds: any): ParsedBinding['bindingType'] {
  // XSUAA typically has xsappname or identityzone
  if (creds.xsappname || creds.identityzoneid || creds.zoneid) {
    return 'xsuaa';
  }

  // Destination service typically has uri field
  if (creds.uri) {
    return 'destination';
  }

  // Check URL pattern
  if (creds.url) {
    if (creds.url.includes('authentication.')) {
      return 'xsuaa';
    }
    if (creds.url.includes('destination.')) {
      return 'destination';
    }
    if (creds.url.includes('connectivity.')) {
      return 'connectivity';
    }
  }

  return 'unknown';
}

/**
 * Validate parsed binding has required fields
 */
export function validateBinding(binding: ParsedBinding | null): binding is ParsedBinding {
  if (!binding) return false;
  return !!(binding.tokenUrl && binding.clientId && binding.clientSecret);
}

/**
 * Service Binding Parser singleton
 */
export const serviceBindingParser = {
  detectFormat: detectBindingFormat,
  parseVcapServices,
  parseServiceBinding,
  parseBinding,
  validateBinding,
};

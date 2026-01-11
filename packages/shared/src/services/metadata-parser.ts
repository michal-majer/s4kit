/**
 * OData $metadata parser (shared between backend and proxy)
 * Fetches and parses OData service metadata to extract entity information
 */

import { XMLParser } from 'fast-xml-parser';
import { encryption } from './encryption';

/**
 * Fetch OAuth token directly (no caching)
 * Used for metadata fetching which is infrequent
 */
async function fetchOAuthToken(config: {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  grantType?: string;
}): Promise<string> {
  const formData = new URLSearchParams();
  formData.append('grant_type', config.grantType || 'client_credentials');
  if (config.scope) {
    formData.append('scope', config.scope);
  }

  const basicAuth = btoa(`${config.clientId}:${config.clientSecret}`);

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
      'Accept': 'application/json',
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth token request failed: ${response.status} - ${errorText}`);
  }

  const tokenResponse = await response.json() as { access_token: string };
  return tokenResponse.access_token;
}

/**
 * Build a properly normalized URL from baseUrl and servicePath.
 * Handles the case where baseUrl accidentally includes part of the service path,
 * preventing duplicate path segments.
 *
 * Example:
 *   baseUrl: "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/"
 *   servicePath: "/sap/opu/odata/sap/API_BUSINESS_PARTNER"
 *   Result: "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata/sap/API_BUSINESS_PARTNER"
 *   (not: ".../sap/opu/odata/sap/sap/opu/odata/sap/API_BUSINESS_PARTNER")
 */
export function buildServiceUrl(rawBaseUrl: string, rawServicePath: string, suffix: string = ''): string {
  let baseUrl = rawBaseUrl.replace(/\/$/, '');
  const servicePath = rawServicePath.replace(/^\//, '').replace(/\/$/, '');

  // Check if baseUrl ends with a prefix of servicePath (overlap detection)
  // This handles cases where users include "/sap/opu/odata/sap/" in their base URL
  const servicePathSegments = servicePath.split('/');
  for (let i = servicePathSegments.length - 1; i > 0; i--) {
    const prefix = servicePathSegments.slice(0, i).join('/');
    if (prefix && (baseUrl.endsWith('/' + prefix) || baseUrl.endsWith(prefix))) {
      // Remove overlapping prefix from baseUrl
      baseUrl = baseUrl.slice(0, baseUrl.length - prefix.length).replace(/\/$/, '');
      break;
    }
  }

  return `${baseUrl}/${servicePath}${suffix}`;
}

export interface ODataEntity {
  name: string;
  entityType?: string;
}

export interface ODataProperty {
  name: string;
  type: string;
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ODataNavigationProperty {
  name: string;
  type: string;
  isCollection: boolean;
  targetEntity: string;
}

export interface ODataEntityType {
  name: string;
  fullName: string;
  properties: ODataProperty[];
  keyProperties: string[];
  navigationProperties: ODataNavigationProperty[];
}

export interface ODataMetadataResult {
  entities: ODataEntity[];
  raw?: string;
  error?: string;
  odataVersion?: 'v2' | 'v4';
}

export interface ODataMetadataFull {
  entities: ODataEntity[];
  entityTypes: ODataEntityType[];
  raw?: string;
  error?: string;
  odataVersion?: 'v2' | 'v4';
}

export interface MetadataAuthConfig {
  type: string;
  username?: string | null;
  password?: string | null;
  config?: any;
  credentials?: any;
}

interface FetchMetadataOptions {
  baseUrl: string;
  servicePath: string;
  auth?: MetadataAuthConfig | null;
}

/**
 * Extract entity sets from OData $metadata XML
 */
function parseMetadataXml(xml: string): ODataEntity[] {
  const entities: ODataEntity[] = [];

  const entitySetRegex = /<EntitySet\s+([^>]+)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = entitySetRegex.exec(xml)) !== null) {
    const attrs = match[1];
    if (!attrs) continue;

    const nameMatch = attrs.match(/Name\s*=\s*["']([^"']+)["']/i);
    if (!nameMatch || !nameMatch[1]) continue;

    const typeMatch = attrs.match(/EntityType\s*=\s*["']([^"']+)["']/i);

    entities.push({
      name: nameMatch[1],
      entityType: typeMatch?.[1] || undefined
    });
  }

  return entities;
}

/**
 * Detect OData version from $metadata XML
 */
function detectODataVersion(xml: string): 'v2' | 'v4' {
  if (xml.includes('http://docs.oasis-open.org/odata/ns/edmx')) {
    return 'v4';
  }
  if (/Version\s*=\s*["']4\.\d+["']/i.test(xml)) {
    return 'v4';
  }
  return 'v2';
}

/**
 * Extract Schema elements from parsed XML
 */
function extractSchemas(parsed: any): any[] {
  const schemas: any[] = [];

  if (parsed['edmx:Edmx']?.['edmx:DataServices']?.['Schema']) {
    const schemaData = parsed['edmx:Edmx']['edmx:DataServices']['Schema'];
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }

  if (parsed.Schema) {
    const schemaData = parsed.Schema;
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }

  if (parsed['edmx:DataServices']?.['Schema']) {
    const schemaData = parsed['edmx:DataServices']['Schema'];
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }

  return schemas.filter(Boolean);
}

/**
 * Parse full OData metadata XML to extract EntityType definitions with properties
 */
function parseFullMetadataXml(xml: string): ODataMetadataFull {
  const entities = parseMetadataXml(xml);
  const odataVersion = detectODataVersion(xml);
  const entityTypes: ODataEntityType[] = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseAttributeValue: true,
      trimValues: true,
    });

    const parsed = parser.parse(xml);
    const schemas = extractSchemas(parsed);

    for (const schema of schemas) {
      const schemaNamespace = schema['@_Namespace'] || schema['@_xmlns'] || '';
      const schemaEntityTypes = schema.EntityType || (Array.isArray(schema.EntityType) ? schema.EntityType : [schema.EntityType].filter(Boolean));

      if (!schemaEntityTypes) continue;

      const entityTypeArray = Array.isArray(schemaEntityTypes) ? schemaEntityTypes : [schemaEntityTypes];

      for (const entityType of entityTypeArray) {
        if (!entityType || !entityType['@_Name']) continue;

        const entityTypeName = entityType['@_Name'];
        const fullName = schemaNamespace ? `${schemaNamespace}.${entityTypeName}` : entityTypeName;

        const properties: ODataProperty[] = [];
        const propertyArray = entityType.Property
          ? (Array.isArray(entityType.Property) ? entityType.Property : [entityType.Property])
          : [];

        for (const prop of propertyArray) {
          if (!prop || !prop['@_Name']) continue;

          const propType = prop['@_Type'] || '';
          const nullable = prop['@_Nullable'] !== false && prop['@_Nullable'] !== 'false';

          properties.push({
            name: prop['@_Name'],
            type: propType,
            nullable,
            maxLength: prop['@_MaxLength'] ? parseInt(prop['@_MaxLength'], 10) : undefined,
            precision: prop['@_Precision'] ? parseInt(prop['@_Precision'], 10) : undefined,
            scale: prop['@_Scale'] ? parseInt(prop['@_Scale'], 10) : undefined,
          });
        }

        const keyProperties: string[] = [];
        if (entityType.Key) {
          const keyRefs = entityType.Key.PropertyRef
            ? (Array.isArray(entityType.Key.PropertyRef) ? entityType.Key.PropertyRef : [entityType.Key.PropertyRef])
            : [];

          for (const keyRef of keyRefs) {
            if (keyRef['@_Name']) {
              keyProperties.push(keyRef['@_Name']);
            }
          }
        }

        const navigationProperties: ODataNavigationProperty[] = [];
        const navPropertyArray = entityType.NavigationProperty
          ? (Array.isArray(entityType.NavigationProperty) ? entityType.NavigationProperty : [entityType.NavigationProperty])
          : [];

        for (const navProp of navPropertyArray) {
          if (!navProp || !navProp['@_Name']) continue;

          let isCollection = false;
          let targetEntity = '';

          const navType = navProp['@_Type'] || '';
          if (navType) {
            isCollection = navType.startsWith('Collection(');
            const targetType = isCollection
              ? navType.slice(11, -1)
              : navType;
            targetEntity = targetType.split('.').pop() || targetType;
          } else {
            const toRole = navProp['@_ToRole'] || '';
            targetEntity = toRole;
            isCollection = toRole !== entityTypeName && (toRole.endsWith('s') || toRole.endsWith('ies'));
          }

          if (targetEntity) {
            navigationProperties.push({
              name: navProp['@_Name'],
              type: navType || navProp['@_Relationship'] || '',
              isCollection,
              targetEntity,
            });
          }
        }

        entityTypes.push({
          name: entityTypeName,
          fullName,
          properties,
          keyProperties,
          navigationProperties,
        });
      }
    }
  } catch (error: any) {
    console.error('Error parsing full metadata XML:', error);
  }

  return {
    entities,
    entityTypes,
    raw: xml,
    odataVersion,
  };
}

/**
 * Build auth headers from resolved auth config
 */
async function buildAuthHeaders(
  auth: MetadataAuthConfig | null | undefined,
  metadataUrl: string
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Accept': 'application/xml'
  };

  if (!auth || auth.type === 'none') {
    return headers;
  }

  const authType = auth.type || 'basic';

  if (authType === 'basic') {
    const username = auth.username ? encryption.decrypt(auth.username) : '';
    const password = auth.password ? encryption.decrypt(auth.password) : '';
    headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
  } else if (authType === 'custom') {
    const authConfig = auth.config as any;
    const credentials = auth.credentials as any;

    if (authConfig?.headerName && credentials?.headerValue) {
      const headerName = authConfig.headerName;
      const headerValue = encryption.decrypt(credentials.headerValue);
      headers[headerName] = headerValue;
    } else {
      throw new Error('Custom authentication header name and value not found');
    }
  } else if (authType === 'oauth2') {
    const authConfig = auth.config as any;
    const credentials = auth.credentials as any;

    if (!authConfig?.tokenUrl || !authConfig?.clientId) {
      throw new Error('OAuth2 tokenUrl and clientId are required');
    }
    if (!credentials?.clientSecret) {
      throw new Error('OAuth2 clientSecret is required');
    }

    const accessToken = await fetchOAuthToken({
      tokenUrl: authConfig.tokenUrl,
      clientId: authConfig.clientId,
      clientSecret: encryption.decrypt(credentials.clientSecret),
      scope: authConfig.scope,
      grantType: authConfig.grantType || 'client_credentials',
    });
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    throw new Error(`Authentication type '${authType}' is not supported`);
  }

  return headers;
}

export const metadataParser = {
  /**
   * Fetch and parse $metadata from an OData service
   */
  fetchMetadata: async (options: FetchMetadataOptions): Promise<ODataMetadataResult> => {
    try {
      const metadataUrl = buildServiceUrl(options.baseUrl, options.servicePath, '/$metadata');

      const headers = await buildAuthHeaders(options.auth, metadataUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(metadataUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const xml = await response.text();
      const entities = parseMetadataXml(xml);
      const odataVersion = detectODataVersion(xml);

      return {
        entities,
        raw: xml,
        odataVersion,
      };
    } catch (error: any) {
      console.error('Failed to fetch $metadata:', error);
      return {
        entities: [],
        error: error.message || 'Failed to fetch metadata'
      };
    }
  },

  /**
   * Fetch metadata using raw credentials (not encrypted)
   * Used when testing connection before saving
   */
  fetchMetadataWithRawCredentials: async (options: {
    baseUrl: string;
    servicePath: string;
    authType?: string;
    username?: string;
    password?: string;
  }): Promise<ODataMetadataResult> => {
    try {
      const metadataUrl = buildServiceUrl(options.baseUrl, options.servicePath, '/$metadata');

      const headers: Record<string, string> = {
        'Accept': 'application/xml'
      };

      if (options.authType !== 'none' && options.username && options.password) {
        headers['Authorization'] = `Basic ${btoa(`${options.username}:${options.password}`)}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(metadataUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const xml = await response.text();
      const entities = parseMetadataXml(xml);
      const odataVersion = detectODataVersion(xml);

      return {
        entities,
        raw: xml,
        odataVersion,
      };
    } catch (error: any) {
      console.error('Failed to fetch $metadata:', error);
      return {
        entities: [],
        error: error.message || 'Failed to fetch metadata'
      };
    }
  },

  /**
   * Parse metadata XML directly (for testing or cached metadata)
   */
  parseMetadata: (xml: string): ODataEntity[] => {
    return parseMetadataXml(xml);
  },

  /**
   * Detect OData version from metadata XML
   */
  detectVersion: (xml: string): 'v2' | 'v4' => {
    return detectODataVersion(xml);
  },

  /**
   * Fetch and parse full metadata including EntityType definitions
   */
  fetchFullMetadata: async (options: FetchMetadataOptions): Promise<ODataMetadataFull> => {
    try {
      const metadataUrl = buildServiceUrl(options.baseUrl, options.servicePath, '/$metadata');

      const headers = await buildAuthHeaders(options.auth, metadataUrl);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(metadataUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const xml = await response.text();
      return parseFullMetadataXml(xml);
    } catch (error: any) {
      console.error('Failed to fetch full $metadata:', error);
      return {
        entities: [],
        entityTypes: [],
        error: error.message || 'Failed to fetch metadata'
      };
    }
  },

  /**
   * Parse full metadata XML directly (for testing or cached metadata)
   */
  parseFullMetadata: (xml: string): ODataMetadataFull => {
    return parseFullMetadataXml(xml);
  }
};

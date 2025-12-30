/**
 * OData $metadata parser for proxy service
 * Fetches and parses OData service metadata to extract entity information
 */

import ky from 'ky';
import { XMLParser } from 'fast-xml-parser';
import { encryption } from '@s4kit/shared/services';
import { oauthTokenService, type OAuthTokenConfig } from './oauth-token.ts';

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

export interface ODataEntityType {
  name: string;
  fullName: string;
  properties: ODataProperty[];
  keyProperties: string[];
}

export interface ODataMetadataFull {
  entities: ODataEntity[];
  entityTypes: ODataEntityType[];
  raw?: string;
  error?: string;
  odataVersion?: 'v2' | 'v4';
}

interface FetchMetadataOptions {
  baseUrl: string;
  servicePath: string;
  auth?: {
    type: string;
    username?: string | null;
    password?: string | null;
    config?: any;
    credentials?: any;
  };
}

/**
 * Extract entity sets from OData $metadata XML
 */
function parseMetadataXml(xml: string): ODataEntity[] {
  const entities: ODataEntity[] = [];

  // Match all EntitySet elements
  const entitySetRegex = /<EntitySet\s+([^>]+)\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = entitySetRegex.exec(xml)) !== null) {
    const attrs = match[1];
    if (!attrs) continue;

    // Extract Name attribute
    const nameMatch = attrs.match(/Name\s*=\s*["']([^"']+)["']/i);
    if (!nameMatch || !nameMatch[1]) continue;

    // Extract EntityType attribute
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

        entityTypes.push({
          name: entityTypeName,
          fullName,
          properties,
          keyProperties,
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

export const metadataParser = {
  /**
   * Fetch and parse full metadata including EntityType definitions
   */
  fetchFullMetadata: async (options: FetchMetadataOptions): Promise<ODataMetadataFull> => {
    try {
      const baseUrl = options.baseUrl.replace(/\/$/, '');
      const servicePath = options.servicePath.replace(/^\//, '').replace(/\/$/, '');
      const metadataUrl = `${baseUrl}/${servicePath}/$metadata`;

      const headers: Record<string, string> = {
        'Accept': 'application/xml'
      };

      if (options.auth && options.auth.type !== 'none') {
        const authType = options.auth.type || 'basic';

        if (authType === 'api_key') {
          const credentials = options.auth.credentials as any;
          const authConfig = options.auth.config as any;

          if (credentials?.apiKey) {
            const apiKey = encryption.decrypt(credentials.apiKey);
            const headerName = authConfig?.headerName || 'X-API-Key';
            headers[headerName] = apiKey;
          } else {
            throw new Error('API Key not found in auth credentials');
          }
        } else if (authType === 'basic') {
          const username = options.auth.username ? encryption.decrypt(options.auth.username) : '';
          const password = options.auth.password ? encryption.decrypt(options.auth.password) : '';
          headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        } else if (authType === 'custom') {
          const authConfig = options.auth.config as any;
          const credentials = options.auth.credentials as any;

          if (authConfig?.headerName && credentials?.headerValue) {
            const headerName = authConfig.headerName;
            const headerValue = encryption.decrypt(credentials.headerValue);
            headers[headerName] = headerValue;
          } else {
            throw new Error(`Custom auth incomplete`);
          }
        } else if (authType === 'oauth2') {
          const authConfig = options.auth.config as any;
          const credentials = options.auth.credentials as any;

          if (!authConfig?.tokenUrl || !authConfig?.clientId) {
            throw new Error('OAuth2 tokenUrl and clientId are required');
          }
          if (!credentials?.clientSecret) {
            throw new Error('OAuth2 clientSecret is required');
          }

          const oauthConfig: OAuthTokenConfig = {
            tokenUrl: authConfig.tokenUrl,
            clientId: authConfig.clientId,
            clientSecret: encryption.decrypt(credentials.clientSecret),
            scope: authConfig.scope,
            grantType: authConfig.grantType || 'client_credentials',
          };

          const accessToken = await oauthTokenService.getToken(oauthConfig, `oauth:metadata:${metadataUrl}`);
          headers['Authorization'] = `Bearer ${accessToken}`;
        }
      }

      const response = await ky.get(metadataUrl, {
        headers,
        timeout: 30000
      });

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
};

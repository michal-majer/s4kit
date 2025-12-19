/**
 * OData $metadata parser
 * Fetches and parses OData service metadata to extract entity information
 */

import ky from 'ky';
import { XMLParser } from 'fast-xml-parser';
import { encryption } from './encryption';

export interface ODataEntity {
  name: string;
  entityType?: string;
}

export interface ODataProperty {
  name: string;
  type: string; // Edm.String, Edm.Int32, etc.
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

export interface ODataEntityType {
  name: string;
  fullName: string; // Full namespace-qualified name
  properties: ODataProperty[];
  keyProperties: string[]; // Property names that form the key
}

export interface ODataMetadataResult {
  entities: ODataEntity[];
  raw?: string;
  error?: string;
}

export interface ODataMetadataFull {
  entities: ODataEntity[];
  entityTypes: ODataEntityType[];
  raw?: string;
  error?: string;
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
 * Supports both OData v2 and v4 formats
 */
function parseMetadataXml(xml: string): ODataEntity[] {
  const entities: ODataEntity[] = [];
  
  // Match EntitySet elements - works for both v2 and v4
  // v2: <EntitySet Name="A_BusinessPartner" EntityType="API_BUSINESS_PARTNER.A_BusinessPartnerType"/>
  // v4: <EntitySet Name="A_BusinessPartner" EntityType="com.sap.gateway.srvd.api_business_partner.v0001.A_BusinessPartnerType"/>
  const entitySetRegex = /<EntitySet\s+[^>]*Name\s*=\s*["']([^"']+)["'][^>]*(?:EntityType\s*=\s*["']([^"']+)["'])?[^>]*\/?>/gi;
  
  let match: RegExpExecArray | null;
  while ((match = entitySetRegex.exec(xml)) !== null) {
    if (match[1]) {
      entities.push({
        name: match[1],
        entityType: match[2] || undefined
      });
    }
  }
  
  // Also match standalone EntitySet elements with EntityType as attribute or nested
  // Some formats have closing tags: <EntitySet Name="..." EntityType="..."></EntitySet>
  const entitySetRegex2 = /<EntitySet\s+[^>]*EntityType\s*=\s*["']([^"']+)["'][^>]*Name\s*=\s*["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = entitySetRegex2.exec(xml)) !== null) {
    // Check if not already added
    if (match[2] && !entities.find(e => e.name === match![2])) {
      entities.push({
        name: match[2],
        entityType: match[1]
      });
    }
  }
  
  return entities;
}

/**
 * Parse full OData metadata XML to extract EntityType definitions with properties
 */
function parseFullMetadataXml(xml: string): ODataMetadataFull {
  const entities = parseMetadataXml(xml);
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
    
    // Handle both OData v2 and v4 structures
    // OData v4: parsed['edmx:Edmx']?.['edmx:DataServices']?.['Schema']
    // OData v2: parsed['edmx:Edmx']?.['edmx:DataServices']?.['Schema']
    // Or direct Schema element
    
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
        
        // Extract properties
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
        
        // Extract key properties
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
    // Return partial result with entities but empty entityTypes
  }
  
  return {
    entities,
    entityTypes,
    raw: xml,
  };
}

/**
 * Extract Schema elements from parsed XML (handles different OData versions)
 */
function extractSchemas(parsed: any): any[] {
  const schemas: any[] = [];
  
  // Try OData v4 structure: edmx:Edmx -> edmx:DataServices -> Schema[]
  if (parsed['edmx:Edmx']?.['edmx:DataServices']?.['Schema']) {
    const schemaData = parsed['edmx:Edmx']['edmx:DataServices']['Schema'];
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }
  
  // Try direct Schema element
  if (parsed.Schema) {
    const schemaData = parsed.Schema;
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }
  
  // Try edmx:DataServices -> Schema (without Edmx wrapper)
  if (parsed['edmx:DataServices']?.['Schema']) {
    const schemaData = parsed['edmx:DataServices']['Schema'];
    schemas.push(...(Array.isArray(schemaData) ? schemaData : [schemaData]));
  }
  
  return schemas.filter(Boolean);
}

export const metadataParser = {
  /**
   * Fetch and parse $metadata from an OData service
   */
  fetchMetadata: async (options: FetchMetadataOptions): Promise<ODataMetadataResult> => {
    try {
      // Build the metadata URL
      const baseUrl = options.baseUrl.replace(/\/$/, '');
      const servicePath = options.servicePath.replace(/^\//, '').replace(/\/$/, '');
      const metadataUrl = `${baseUrl}/${servicePath}/$metadata`;
      
      // Build headers
      const headers: Record<string, string> = {
        'Accept': 'application/xml'
      };
      
      // Add auth if provided
      if (options.auth && options.auth.type !== 'none') {
        const authType = options.auth.type || 'basic';
        
        if (authType === 'api_key') {
          // API Key authentication
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
          // Basic authentication
          const username = options.auth.username ? encryption.decrypt(options.auth.username) : '';
          const password = options.auth.password ? encryption.decrypt(options.auth.password) : '';
          headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        } else if (authType === 'custom') {
          // Custom authentication
          const authConfig = options.auth.config as any;
          const credentials = options.auth.credentials as any;
          
          if (authConfig?.headerName && credentials?.headerValue) {
            const headerName = authConfig.headerName;
            const headerValue = encryption.decrypt(credentials.headerValue);
            headers[headerName] = headerValue;
          } else {
            throw new Error('Custom authentication header name and value not found in auth configuration');
          }
        } else {
          throw new Error(`Authentication type '${authType}' is not yet supported for metadata fetching`);
        }
      }
      
      const response = await ky.get(metadataUrl, {
        headers,
        timeout: 30000 // 30 second timeout
      });
      
      const xml = await response.text();
      const entities = parseMetadataXml(xml);
      
      return {
        entities,
        raw: xml
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
      // Build the metadata URL
      const baseUrl = options.baseUrl.replace(/\/$/, '');
      const servicePath = options.servicePath.replace(/^\//, '').replace(/\/$/, '');
      const metadataUrl = `${baseUrl}/${servicePath}/$metadata`;
      
      // Build headers
      const headers: Record<string, string> = {
        'Accept': 'application/xml'
      };
      
      // Add auth if provided
      if (options.authType !== 'none' && options.username && options.password) {
        headers['Authorization'] = `Basic ${btoa(`${options.username}:${options.password}`)}`;
      }
      
      const response = await ky.get(metadataUrl, {
        headers,
        timeout: 30000
      });
      
      const xml = await response.text();
      const entities = parseMetadataXml(xml);
      
      return {
        entities,
        raw: xml
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
   * Fetch and parse full metadata including EntityType definitions
   */
  fetchFullMetadata: async (options: FetchMetadataOptions): Promise<ODataMetadataFull> => {
    try {
      // Build the metadata URL
      const baseUrl = options.baseUrl.replace(/\/$/, '');
      const servicePath = options.servicePath.replace(/^\//, '').replace(/\/$/, '');
      const metadataUrl = `${baseUrl}/${servicePath}/$metadata`;
      
      // Build headers
      const headers: Record<string, string> = {
        'Accept': 'application/xml'
      };
      
      // Add auth if provided
      if (options.auth && options.auth.type !== 'none') {
        const authType = options.auth.type || 'basic';
        
        if (authType === 'api_key') {
          // API Key authentication
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
          // Basic authentication
          const username = options.auth.username ? encryption.decrypt(options.auth.username) : '';
          const password = options.auth.password ? encryption.decrypt(options.auth.password) : '';
          headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
        } else if (authType === 'custom') {
          // Custom authentication
          const authConfig = options.auth.config as any;
          const credentials = options.auth.credentials as any;
          
          if (authConfig?.headerName && credentials?.headerValue) {
            const headerName = authConfig.headerName;
            const headerValue = encryption.decrypt(credentials.headerValue);
            headers[headerName] = headerValue;
          } else {
            throw new Error('Custom authentication header name and value not found in auth configuration');
          }
        } else {
          throw new Error(`Authentication type '${authType}' is not yet supported for metadata fetching`);
        }
      }
      
      const response = await ky.get(metadataUrl, {
        headers,
        timeout: 30000 // 30 second timeout
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

  /**
   * Parse full metadata XML directly (for testing or cached metadata)
   */
  parseFullMetadata: (xml: string): ODataMetadataFull => {
    return parseFullMetadataXml(xml);
  }
};


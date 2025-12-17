/**
 * OData $metadata parser
 * Fetches and parses OData service metadata to extract entity information
 */

import ky from 'ky';
import { encryption } from './encryption';

export interface ODataEntity {
  name: string;
  entityType?: string;
}

export interface ODataMetadataResult {
  entities: ODataEntity[];
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
        const username = options.auth.username ? encryption.decrypt(options.auth.username) : '';
        const password = options.auth.password ? encryption.decrypt(options.auth.password) : '';
        headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
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
  }
};

/**
 * TypeScript type generator for OData entities
 * Converts OData metadata to TypeScript type definitions
 */

import type { ODataEntityType, ODataProperty } from './metadata-parser';

/**
 * Map OData Edm types to TypeScript types
 */
function mapEdmTypeToTypeScript(edmType: string): string {
  // Handle collection types: Collection(Edm.String) -> string[]
  if (edmType.startsWith('Collection(') && edmType.endsWith(')')) {
    const innerType = edmType.slice(11, -1); // Remove "Collection(" and ")"
    return `${mapEdmTypeToTypeScript(innerType)}[]`;
  }

  // Handle complex types (namespace.TypeName)
  if (edmType.includes('.') && !edmType.startsWith('Edm.')) {
    // Extract just the type name (last part after dot)
    const parts = edmType.split('.');
    return parts[parts.length - 1] || 'any';
  }

  // Map primitive Edm types
  const typeMap: Record<string, string> = {
    'Edm.String': 'string',
    'Edm.Boolean': 'boolean',
    'Edm.Int16': 'number',
    'Edm.Int32': 'number',
    'Edm.Int64': 'number',
    'Edm.Decimal': 'number',
    'Edm.Double': 'number',
    'Edm.Single': 'number',
    'Edm.Byte': 'number',
    'Edm.SByte': 'number',
    'Edm.DateTimeOffset': 'string', // ISO date string
    'Edm.Date': 'string',
    'Edm.TimeOfDay': 'string',
    'Edm.Duration': 'string',
    'Edm.Guid': 'string',
    'Edm.Binary': 'string', // Base64 encoded
    'Edm.Stream': 'string', // URL or stream reference
  };

  return typeMap[edmType] || 'any';
}

/**
 * Sanitize entity name for TypeScript (handle special characters)
 */
function sanitizeTypeName(name: string): string {
  // Replace invalid characters, but keep underscores and alphanumeric
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * Generate TypeScript interface for an entity type
 */
function generateEntityInterface(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const lines: string[] = [];
  
  lines.push(`export interface ${interfaceName} {`);
  
  for (const prop of entityType.properties) {
    const tsType = mapEdmTypeToTypeScript(prop.type);
    const optional = prop.nullable ? '?' : '';
    const propName = sanitizeTypeName(prop.name);
    
    // Always add JSDoc comment with OData type and additional metadata
    const comments: string[] = [];
    if (prop.maxLength) comments.push(`maxLength: ${prop.maxLength}`);
    if (prop.precision !== undefined) comments.push(`precision: ${prop.precision}`);
    if (prop.scale !== undefined) comments.push(`scale: ${prop.scale}`);
    
    const commentText = comments.length > 0 
      ? `OData type: ${prop.type} (${comments.join(', ')})`
      : `OData type: ${prop.type}`;
    
    lines.push(`  /** ${commentText} */`);
    lines.push(`  ${propName}${optional}: ${tsType};`);
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate Create request type (excludes key fields, all fields optional)
 */
function generateCreateRequestType(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const requestName = `Create${interfaceName}Request`;
  const lines: string[] = [];
  
  lines.push(`export interface ${requestName} {`);
  
  // Exclude key properties, make all others optional
  const nonKeyProperties = entityType.properties.filter(
    prop => !entityType.keyProperties.includes(prop.name)
  );
  
  if (nonKeyProperties.length === 0) {
    // Empty interface - add a comment
    lines.push('  // No non-key properties available');
  } else {
    for (const prop of nonKeyProperties) {
      const tsType = mapEdmTypeToTypeScript(prop.type);
      const propName = sanitizeTypeName(prop.name);
      
      // All fields optional for create requests
      lines.push(`  ${propName}?: ${tsType};`);
    }
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate Update request type (all fields optional)
 */
function generateUpdateRequestType(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const requestName = `Update${interfaceName}Request`;
  const lines: string[] = [];
  
  lines.push(`export interface ${requestName} {`);
  
  if (entityType.properties.length === 0) {
    // Empty interface - add a comment
    lines.push('  // No properties available');
  } else {
    // All fields optional for update requests
    for (const prop of entityType.properties) {
      const tsType = mapEdmTypeToTypeScript(prop.type);
      const propName = sanitizeTypeName(prop.name);
      
      lines.push(`  ${propName}?: ${tsType};`);
    }
  }
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Generate TypeScript types for a single entity type
 */
function generateTypesForEntity(entityType: ODataEntityType): string {
  const parts: string[] = [];
  
  // Entity interface (for GET responses)
  parts.push(generateEntityInterface(entityType));
  parts.push('');
  
  // Create request type (for POST)
  parts.push(generateCreateRequestType(entityType));
  parts.push('');
  
  // Update request type (for PATCH/PUT)
  parts.push(generateUpdateRequestType(entityType));
  
  return parts.join('\n');
}

/**
 * Generate complete TypeScript declaration file for multiple entity types
 */
export function generateTypeScriptFile(
  entityTypes: ODataEntityType[],
  options?: {
    apiKeyId?: string;
    apiKeyName?: string;
    generatedAt?: Date;
  }
): string {
  const lines: string[] = [];
  
  // Header comment
  lines.push('/**');
  lines.push(' * Generated TypeScript types for S4Kit API');
  if (options?.apiKeyName) {
    lines.push(` * API Key: ${options.apiKeyName}`);
  }
  if (options?.apiKeyId) {
    lines.push(` * API Key ID: ${options.apiKeyId}`);
  }
  lines.push(` * Generated at: ${(options?.generatedAt || new Date()).toISOString()}`);
  lines.push(' * ');
  lines.push(' * This file contains TypeScript type definitions for OData entities');
  lines.push(' * accessible via your API key. Use these types for type-safe API calls.');
  lines.push(' */');
  lines.push('');
  
  // Group entity types by namespace to avoid conflicts
  const entityTypeMap = new Map<string, ODataEntityType[]>();
  
  for (const entityType of entityTypes) {
    const namespace = entityType.fullName.split('.').slice(0, -1).join('.') || 'default';
    if (!entityTypeMap.has(namespace)) {
      entityTypeMap.set(namespace, []);
    }
    entityTypeMap.get(namespace)!.push(entityType);
  }
  
  // Generate types for each entity
  const generatedTypes = new Set<string>();
  
  for (const entityType of entityTypes) {
    const interfaceName = sanitizeTypeName(entityType.name);
    
    // Skip if we've already generated this type (duplicate names)
    if (generatedTypes.has(interfaceName)) {
      continue;
    }
    
    generatedTypes.add(interfaceName);
    lines.push(generateTypesForEntity(entityType));
    lines.push('');
  }
  
  // Add utility types for type-safe field selection
  lines.push('/**');
  lines.push(' * Utility types for type-safe field selection in select arrays');
  lines.push(' * ');
  lines.push(' * Usage example:');
  lines.push(' * import type { A_BusinessPartnerType, SelectFields } from "./s4kit-types";');
  lines.push(' * ');
  lines.push(' * const entities = await client.sap.A_BusinessPartnerType.list({');
  lines.push(' *   select: ["BusinessPartner", "BusinessPartnerFullName"] as SelectFields<A_BusinessPartnerType>');
  lines.push(' * });');
  lines.push(' */');
  lines.push('');
  lines.push('/**');
  lines.push(' * Type helper for type-safe select field arrays');
  lines.push(' * Provides autocomplete for entity field names in select arrays');
  lines.push(' * ');
  lines.push(' * @example');
  lines.push(' * select: ["Field1", "Field2"] as SelectFields<EntityName>');
  lines.push(' */');
  lines.push('export type SelectFields<T> = Array<keyof T>;');
  lines.push('');
  
  // Remove trailing newlines
  return lines.join('\n').trimEnd();
}

/**
 * Filter entity types based on allowed entity names and permissions
 */
export function filterEntityTypes(
  entityTypes: ODataEntityType[],
  allowedEntities: string[],
  permissions: Record<string, string[]> = {}
): ODataEntityType[] {
  // If "*" is in allowed entities, allow all
  if (allowedEntities.includes('*')) {
    return entityTypes;
  }
  
  // Filter by entity name (match by entity set name or entity type name)
  return entityTypes.filter(entityType => {
    // Check if entity type name matches any allowed entity
    const matchesName = allowedEntities.some(allowed => {
      // Exact match
      if (allowed === entityType.name) return true;
      
      // Match without namespace
      const entityTypeShortName = entityType.fullName.split('.').pop() || '';
      if (allowed === entityTypeShortName) return true;
      
      // Match entity set name (often same as entity type name)
      return false;
    });
    
    if (!matchesName) return false;
    
    // If permissions are specified, check if entity has required permissions
    // For now, if entity is in allowed list, include it
    // Permissions are checked at runtime, not during type generation
    return true;
  });
}




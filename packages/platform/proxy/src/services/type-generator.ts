/**
 * TypeScript type generator for OData entities
 * Converts OData metadata to TypeScript type definitions
 */

import type { ODataEntityType, ODataProperty, ODataEntity } from './metadata-parser.ts';

/**
 * Map OData Edm types to TypeScript types
 */
function mapEdmTypeToTypeScript(edmType: string): string {
  if (edmType.startsWith('Collection(') && edmType.endsWith(')')) {
    const innerType = edmType.slice(11, -1);
    return `${mapEdmTypeToTypeScript(innerType)}[]`;
  }

  if (edmType.includes('.') && !edmType.startsWith('Edm.')) {
    const parts = edmType.split('.');
    return parts[parts.length - 1] || 'any';
  }

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
    'Edm.DateTimeOffset': 'string',
    'Edm.Date': 'string',
    'Edm.TimeOfDay': 'string',
    'Edm.Duration': 'string',
    'Edm.Guid': 'string',
    'Edm.Binary': 'string',
    'Edm.Stream': 'string',
  };

  return typeMap[edmType] || 'any';
}

function sanitizeTypeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_');
}

function generateEntityInterface(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const lines: string[] = [];

  lines.push(`export interface ${interfaceName} {`);

  for (const prop of entityType.properties) {
    const tsType = mapEdmTypeToTypeScript(prop.type);
    const optional = prop.nullable ? '?' : '';
    const propName = sanitizeTypeName(prop.name);

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

function generateCreateRequestType(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const requestName = `Create${interfaceName}Request`;
  const lines: string[] = [];

  lines.push(`export interface ${requestName} {`);

  const nonKeyProperties = entityType.properties.filter(
    prop => !entityType.keyProperties.includes(prop.name)
  );

  if (nonKeyProperties.length === 0) {
    lines.push('  // No non-key properties available');
  } else {
    for (const prop of nonKeyProperties) {
      const tsType = mapEdmTypeToTypeScript(prop.type);
      const propName = sanitizeTypeName(prop.name);
      lines.push(`  ${propName}?: ${tsType};`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

function generateUpdateRequestType(entityType: ODataEntityType): string {
  const interfaceName = sanitizeTypeName(entityType.name);
  const requestName = `Update${interfaceName}Request`;
  const lines: string[] = [];

  lines.push(`export interface ${requestName} {`);

  if (entityType.properties.length === 0) {
    lines.push('  // No properties available');
  } else {
    for (const prop of entityType.properties) {
      const tsType = mapEdmTypeToTypeScript(prop.type);
      const propName = sanitizeTypeName(prop.name);
      lines.push(`  ${propName}?: ${tsType};`);
    }
  }

  lines.push('}');

  return lines.join('\n');
}

function generateTypesForEntity(entityType: ODataEntityType): string {
  const parts: string[] = [];

  parts.push(generateEntityInterface(entityType));
  parts.push('');
  parts.push(generateCreateRequestType(entityType));
  parts.push('');
  parts.push(generateUpdateRequestType(entityType));

  return parts.join('\n');
}

/**
 * Generate module augmentation for S4KitClient with typed entity properties
 * This enables Prisma-like DX: client.Customers.list() with full type inference
 *
 * Uses EntitySet names (like 'Customers') for property names since that's what
 * users will use in API calls: client.Customers.list()
 */
function generateClientAugmentation(
  entityTypes: ODataEntityType[],
  entities?: ODataEntity[]
): string {
  const lines: string[] = [];

  lines.push('// ============================================================================');
  lines.push('// Module Augmentation for Prisma-like DX');
  lines.push('// Import this file to enable: client.EntityName.list() with full type inference');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push("import type { EntityHandler } from 's4kit';");
  lines.push('');
  lines.push("declare module 's4kit' {");
  lines.push('  interface S4KitClient {');

  const generatedNames = new Set<string>();

  // If we have entities (EntitySets), use them for property names
  // and map to their corresponding EntityType interfaces
  if (entities && entities.length > 0) {
    for (const entity of entities) {
      if (generatedNames.has(entity.name)) continue;
      generatedNames.add(entity.name);

      // Find the matching EntityType by name
      // EntityType reference formats:
      // - "NorthwindModel.Customer" -> extract "Customer"
      // - Just "Customer"
      let interfaceName: string | null = null;

      if (entity.entityType) {
        const typeName = entity.entityType.split('.').pop() || entity.entityType;
        // Check if we have an interface for this type
        const matchingType = entityTypes.find(et =>
          et.name === typeName || et.fullName === entity.entityType
        );
        if (matchingType) {
          interfaceName = sanitizeTypeName(matchingType.name);
        }
      }

      // If no match via entityType, try to match by removing common suffixes
      // e.g., "Customers" EntitySet -> "Customer" EntityType
      if (!interfaceName) {
        const singularName = entity.name.replace(/ies$/, 'y').replace(/s$/, '');
        const matchingType = entityTypes.find(et =>
          et.name === singularName ||
          et.name === entity.name ||
          sanitizeTypeName(et.name) === singularName
        );
        if (matchingType) {
          interfaceName = sanitizeTypeName(matchingType.name);
        }
      }

      // Final fallback: use 'any' if no matching type found
      if (!interfaceName) {
        interfaceName = 'any';
      }

      lines.push(`    ${entity.name}: EntityHandler<${interfaceName}>;`);
    }
  } else {
    // Fallback: use EntityType names directly (singular form)
    for (const entityType of entityTypes) {
      const interfaceName = sanitizeTypeName(entityType.name);
      if (generatedNames.has(entityType.name)) continue;
      generatedNames.add(entityType.name);
      lines.push(`    ${entityType.name}: EntityHandler<${interfaceName}>;`);
    }
  }

  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}

export function generateTypeScriptFile(
  entityTypes: ODataEntityType[],
  options?: {
    apiKeyId?: string;
    apiKeyName?: string;
    generatedAt?: Date;
    entities?: ODataEntity[];
  }
): string {
  const lines: string[] = [];

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

  const generatedTypes = new Set<string>();

  for (const entityType of entityTypes) {
    const interfaceName = sanitizeTypeName(entityType.name);

    if (generatedTypes.has(interfaceName)) {
      continue;
    }

    generatedTypes.add(interfaceName);
    lines.push(generateTypesForEntity(entityType));
    lines.push('');
  }

  lines.push('/**');
  lines.push(' * Type helper for type-safe select field arrays');
  lines.push(' */');
  lines.push('export type SelectFields<T> = Array<keyof T>;');
  lines.push('');
  lines.push('');

  // Add module augmentation for Prisma-like DX
  lines.push(generateClientAugmentation(entityTypes, options?.entities));
  lines.push('');

  return lines.join('\n').trimEnd();
}

export function filterEntityTypes(
  entityTypes: ODataEntityType[],
  allowedEntities: string[],
  permissions: Record<string, string[]> = {}
): ODataEntityType[] {
  if (allowedEntities.includes('*')) {
    return entityTypes;
  }

  return entityTypes.filter(entityType => {
    const matchesName = allowedEntities.some(allowed => {
      if (allowed === entityType.name) return true;
      const entityTypeShortName = entityType.fullName.split('.').pop() || '';
      if (allowed === entityTypeShortName) return true;
      return false;
    });

    return matchesName;
  });
}

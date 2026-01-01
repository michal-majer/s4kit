/**
 * TypeScript type generator for OData entities (shared between backend and proxy)
 * Converts OData metadata to TypeScript type definitions
 */

import type { ODataEntityType, ODataEntity } from './metadata-parser';

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

function generateEntityInterface(entityType: ODataEntityType, allEntityTypes: ODataEntityType[]): string {
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

  // Add navigation properties
  if (entityType.navigationProperties && entityType.navigationProperties.length > 0) {
    lines.push('');
    lines.push('  // Navigation properties (use with expand)');

    for (const navProp of entityType.navigationProperties) {
      const propName = sanitizeTypeName(navProp.name);
      const targetType = findTargetEntityType(navProp.targetEntity, allEntityTypes);
      const tsType = targetType ? sanitizeTypeName(targetType.name) : 'any';
      const fullType = navProp.isCollection ? `${tsType}[]` : tsType;

      lines.push(`  /** Navigation: ${navProp.isCollection ? 'Collection' : 'Single'} */`);
      lines.push(`  ${propName}?: ${fullType};`);
    }
  }

  // Add phantom property for navigation props (enables expand autocomplete)
  if (entityType.navigationProperties && entityType.navigationProperties.length > 0) {
    const navPropNames = entityType.navigationProperties
      .map(np => `'${sanitizeTypeName(np.name)}'`)
      .join(' | ');
    lines.push('');
    lines.push('  /** @internal Phantom property for expand autocomplete - do not use directly */');
    lines.push(`  readonly __navigationProps?: ${navPropNames};`);
  }

  lines.push('}');

  return lines.join('\n');
}

function findTargetEntityType(targetName: string, allEntityTypes: ODataEntityType[]): ODataEntityType | undefined {
  return allEntityTypes.find(et =>
    et.name === targetName ||
    et.fullName.endsWith(`.${targetName}`) ||
    sanitizeTypeName(et.name) === targetName
  );
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

function generateTypesForEntity(entityType: ODataEntityType, allEntityTypes: ODataEntityType[]): string {
  const parts: string[] = [];

  parts.push(generateEntityInterface(entityType, allEntityTypes));
  parts.push('');
  parts.push(generateCreateRequestType(entityType));
  parts.push('');
  parts.push(generateUpdateRequestType(entityType));

  return parts.join('\n');
}

/**
 * Generate module augmentation for S4KitClient with typed entity properties
 * This enables Prisma-like DX: client.Customers.list() with full type inference
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

  if (entities && entities.length > 0) {
    for (const entity of entities) {
      if (generatedNames.has(entity.name)) continue;
      generatedNames.add(entity.name);

      let interfaceName: string | null = null;

      if (entity.entityType) {
        const typeName = entity.entityType.split('.').pop() || entity.entityType;
        const matchingType = entityTypes.find(et =>
          et.name === typeName || et.fullName === entity.entityType
        );
        if (matchingType) {
          interfaceName = sanitizeTypeName(matchingType.name);
        }
      }

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

      if (!interfaceName) {
        interfaceName = 'any';
      }

      lines.push(`    ${entity.name}: EntityHandler<${interfaceName}>;`);
    }
  } else {
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
    lines.push(generateTypesForEntity(entityType, entityTypes));
    lines.push('');
  }

  lines.push('/**');
  lines.push(' * Type helper for type-safe select field arrays');
  lines.push(' */');
  lines.push('export type SelectFields<T> = Array<keyof T>;');
  lines.push('');
  lines.push('');

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

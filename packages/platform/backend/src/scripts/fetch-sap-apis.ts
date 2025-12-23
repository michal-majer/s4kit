/**
 * SAP S/4HANA Cloud OData API Fetcher
 *
 * Fetches all OData APIs from SAP Business Accelerator Hub
 * for both Public and Private editions
 *
 * Usage: bun run src/scripts/fetch-sap-apis.ts
 */

interface SapApiInfo {
  name: string;
  alias: string;
  servicePath: string;
  description: string;
  odataVersion: 'v2' | 'v4';
  defaultEntities: string[];
}

// Actual SAP API response structure
interface CatalogArtifact {
  Name: string;
  Type: string;
  DisplayName: string;
  SubType: string; // 'ODATA', 'ODATAV4', 'SOAP', 'REST', etc.
  Description: string;
  State: string; // 'ACTIVE', 'DEPRECATED', etc.
  Version?: string;
}

interface CatalogResponse {
  d: {
    results: CatalogArtifact[];
    __next?: string;
  };
}

// API details from APIContent.APIs endpoint (has actual ServiceUrl)
interface ApiDetails {
  Name: string;
  Title: string;
  ShortText: string;
  ServiceUrl: string | null;
  ServiceCode: string; // 'ODATA', 'ODATAV4', etc.
  State: string;
}

interface ApiDetailsResponse {
  d: {
    results: ApiDetails[];
    __next?: string;
  };
}

interface EditionConfig {
  packageName: string;
  displayName: string;
  systemType: 's4_public' | 's4_private';
}

const SAP_CATALOG_BASE = 'https://api.sap.com/odata/1.0/catalog.svc';

const EDITIONS: EditionConfig[] = [
  {
    packageName: 'SAPS4HANACloud',
    displayName: 'S/4HANA Cloud Public Edition',
    systemType: 's4_public',
  },
  {
    packageName: 'S4HANAOPAPI',
    displayName: 'S/4HANA Private/On-Premise Edition',
    systemType: 's4_private',
  },
];

// Known aliases for common APIs (override auto-generated)
const KNOWN_ALIASES: Record<string, string> = {
  'API_BUSINESS_PARTNER': 'bp',
  'OP_API_BUSINESS_PARTNER_SRV': 'bp',
  'API_SALES_ORDER_SRV': 'salesorder',
  'OP_API_SALES_ORDER_SRV': 'salesorder',
  'API_PURCHASEORDER_PROCESS_SRV': 'purchaseorder',
  'OP_API_PURCHASEORDER_PROCESS_SRV': 'purchaseorder',
  'API_PRODUCT_SRV': 'product',
  'OP_API_PRODUCT_SRV': 'product',
  'API_BILLING_DOCUMENT_SRV': 'billing',
  'OP_API_BILLING_DOCUMENT_SRV': 'billing',
  'API_OUTBOUND_DELIVERY_SRV': 'outbounddelivery',
  'OP_API_OUTBOUND_DELIVERY_SRV': 'outbounddelivery',
  'API_INBOUND_DELIVERY_SRV': 'inbounddelivery',
  'OP_API_INBOUND_DELIVERY_SRV': 'inbounddelivery',
  'API_GLACCOUNTINCHARTOFACCOUNTS_SRV': 'glaccount',
  'OP_API_GLACCOUNTINCHARTOFACCOUNTS_SRV': 'glaccount',
  'API_COSTCENTER_SRV': 'costcenter',
  'OP_API_COSTCENTER_SRV': 'costcenter',
  'API_JOURNALENTRYITEMBASIC_SRV': 'journalentry',
  'OP_API_JOURNALENTRYITEMBASIC_SRV': 'journalentry',
  'API_BANKDETAIL_SRV': 'bank',
  'OP_API_BANKDETAIL_SRV': 'bank',
  'API_PLANT_SRV': 'plant',
  'OP_API_PLANT_SRV': 'plant',
  'API_MATERIAL_DOCUMENT_SRV': 'materialdoc',
  'API_MATERIAL_STOCK_SRV': 'materialstock',
  'API_SUPPLIERINVOICE_PROCESS_SRV': 'supplierinvoice',
  'API_PRODUCTIONORDER_2': 'prodorder',
  'API_MAINTENANCE_ORDER_SRV': 'maintorder',
};

/**
 * Generate a short alias from API name
 */
function generateAlias(apiName: string): string {
  if (KNOWN_ALIASES[apiName]) {
    return KNOWN_ALIASES[apiName];
  }

  // Remove prefixes and suffixes
  let alias = apiName
    .replace(/^OP_/, '')
    .replace(/^API_/, '')
    .replace(/^CE_/, '')
    .replace(/^sap-s4-OP_/, '')
    .replace(/_SRV$/, '')
    .replace(/_\d+$/, '') // Remove version numbers like _2, _0001
    .replace(/_V\d+$/, '') // Remove version like _V2
    .toLowerCase();

  // Common abbreviations
  alias = alias
    .replace(/document/g, 'doc')
    .replace(/purchase/g, 'purch')
    .replace(/requisition/g, 'req')
    .replace(/configuration/g, 'config')
    .replace(/maintenance/g, 'maint')
    .replace(/management/g, 'mgmt')
    .replace(/accounting/g, 'acct')
    .replace(/valuation/g, 'val')
    .replace(/reservation/g, 'resv')
    .replace(/production/g, 'prod')
    .replace(/customer/g, 'cust')
    .replace(/supplier/g, 'supp')
    .replace(/material/g, 'mat')
    .replace(/delivery/g, 'del')
    .replace(/notification/g, 'notif')
    .replace(/scheduling/g, 'sched')
    .replace(/assignment/g, 'assign')
    .replace(/confirmation/g, 'confirm')
    .replace(/consolidation/g, 'consol')
    .replace(/allocation/g, 'alloc');

  // Remove underscores and truncate if too long
  alias = alias.replace(/_/g, '');
  if (alias.length > 25) {
    alias = alias.substring(0, 25);
  }

  return alias;
}

/**
 * Check if artifact is an OData API (v2 or v4)
 */
function isODataAPI(artifact: CatalogArtifact): boolean {
  return artifact.Type === 'API' && (artifact.SubType === 'ODATA' || artifact.SubType === 'ODATAV4');
}

/**
 * Get OData version from SubType
 */
function getODataVersion(subType: string): 'v2' | 'v4' {
  return subType === 'ODATAV4' ? 'v4' : 'v2';
}

/**
 * Fetch API details from APIContent.APIs endpoint
 * This endpoint contains the actual ServiceUrl for each API
 */
async function fetchApiDetails(): Promise<Map<string, ApiDetails>> {
  const apiMap = new Map<string, ApiDetails>();
  const pageSize = 1000;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const url = `${SAP_CATALOG_BASE}/APIContent.APIs?$format=json&$top=${pageSize}&$skip=${skip}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as ApiDetailsResponse;
      for (const api of data.d.results) {
        apiMap.set(api.Name, api);
      }

      // Check if there are more results
      hasMore = data.d.results.length === pageSize;
      skip += pageSize;
    } catch (error) {
      console.error(`Failed to fetch API details: ${error}`);
      break;
    }
  }

  return apiMap;
}

/**
 * Extract service path from full ServiceUrl
 * Example: "https://sandbox.api.sap.com/s4hanacloud/sap/opu/odata4/sap/api_cost_center/..."
 *       -> "/sap/opu/odata4/sap/api_cost_center/..."
 */
function extractServicePath(serviceUrl: string): string {
  // Match the path starting from /sap/
  const match = serviceUrl.match(/\/sap\/opu\/[^\s]+/);
  if (match) {
    let path = match[0];
    // Ensure path ends with /
    if (!path.endsWith('/')) {
      path += '/';
    }
    return path;
  }
  return serviceUrl;
}

/**
 * Fetch all artifacts from SAP catalog with pagination
 */
async function fetchCatalogArtifacts(packageName: string): Promise<CatalogArtifact[]> {
  const allArtifacts: CatalogArtifact[] = [];
  let nextUrl: string | null = `${SAP_CATALOG_BASE}/ContentEntities.ContentPackages('${packageName}')/Artifacts?$format=json&$top=1000`;

  while (nextUrl) {
    try {
      const response = await fetch(nextUrl, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as CatalogResponse;
      allArtifacts.push(...data.d.results);

      // Handle pagination
      nextUrl = data.d.__next || null;
    } catch (error) {
      console.error(`Failed to fetch catalog: ${error}`);
      break;
    }
  }

  return allArtifacts;
}

/**
 * Process artifacts and convert to SapApiInfo format
 * Uses apiDetailsMap to get actual ServiceUrl from SAP API Hub
 */
function processArtifacts(artifacts: CatalogArtifact[], apiDetailsMap: Map<string, ApiDetails>): SapApiInfo[] {
  // Filter for OData APIs (v2 + v4), exclude deprecated
  const odataApis = artifacts.filter(a =>
    isODataAPI(a) && a.State !== 'DEPRECATED'
  );

  const apis: SapApiInfo[] = [];
  const usedAliases = new Set<string>();

  for (const artifact of odataApis) {
    // Generate unique alias
    let alias = generateAlias(artifact.Name);
    let counter = 1;
    while (usedAliases.has(alias)) {
      alias = `${generateAlias(artifact.Name)}${counter}`;
      counter++;
    }
    usedAliases.add(alias);

    const odataVersion = getODataVersion(artifact.SubType);

    // Get ServiceUrl from API details (preferred) or construct fallback
    const apiDetails = apiDetailsMap.get(artifact.Name);
    let servicePath: string;

    if (apiDetails?.ServiceUrl) {
      // Use actual ServiceUrl from SAP API Hub
      servicePath = extractServicePath(apiDetails.ServiceUrl);
    } else {
      // Fallback: construct path from artifact name
      servicePath = odataVersion === 'v4'
        ? `/sap/opu/odata4/sap/${artifact.Name}`
        : `/sap/opu/odata/sap/${artifact.Name}`;
    }

    apis.push({
      name: artifact.DisplayName || artifact.Name,
      alias,
      servicePath,
      description: artifact.Description || '',
      odataVersion,
      defaultEntities: [],
    });
  }

  return apis;
}

/**
 * Generate TypeScript code for a single edition
 */
function generateEditionCode(apis: SapApiInfo[], edition: EditionConfig): string {
  const sortedApis = apis.sort((a, b) => a.name.localeCompare(b.name));

  const v2Count = apis.filter(a => a.odataVersion === 'v2').length;
  const v4Count = apis.filter(a => a.odataVersion === 'v4').length;

  let code = `// ${edition.displayName} OData APIs
// Total: ${apis.length} (v2: ${v2Count}, v4: ${v4Count})
// Note: Deprecated APIs are excluded

export const ${edition.systemType === 's4_public' ? 's4PublicApis' : 's4PrivateApis'} = [\n`;

  for (const api of sortedApis) {
    const entitiesStr = api.defaultEntities.length > 0
      ? `[${api.defaultEntities.map(e => `'${e}'`).join(', ')}]`
      : '[]';

    // Escape description quotes and newlines
    const safeDesc = api.description
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, ' ')
      .trim();

    code += `  {
    name: '${api.name.replace(/'/g, "\\'")}',
    alias: '${api.alias}',
    servicePath: '${api.servicePath}',
    description: '${safeDesc}',
    odataVersion: '${api.odataVersion}',
    defaultEntities: ${entitiesStr},
  },\n`;
  }

  code += '] as const;\n';

  return code;
}

/**
 * Main entry point
 */
async function main() {
  console.log('SAP S/4HANA Cloud OData API Fetcher');
  console.log('===================================\n');

  // First, fetch API details (contains actual ServiceUrls)
  console.log('Fetching API details (ServiceUrls)...');
  const apiDetailsMap = await fetchApiDetails();
  console.log(`  Fetched ${apiDetailsMap.size} API details\n`);

  const results: Array<{ edition: EditionConfig; apis: SapApiInfo[] }> = [];

  for (const edition of EDITIONS) {
    console.log(`Fetching ${edition.displayName}...`);
    const artifacts = await fetchCatalogArtifacts(edition.packageName);

    if (artifacts.length === 0) {
      console.error(`  No artifacts fetched for ${edition.packageName}`);
      continue;
    }

    // Count all OData APIs including deprecated for stats
    const allODataApis = artifacts.filter(isODataAPI);
    const deprecatedCount = allODataApis.filter(a => a.State === 'DEPRECATED').length;

    const apis = processArtifacts(artifacts, apiDetailsMap);
    const v2Count = apis.filter(a => a.odataVersion === 'v2').length;
    const v4Count = apis.filter(a => a.odataVersion === 'v4').length;

    // Count how many have ServiceUrl from API Hub vs fallback
    const withServiceUrl = apis.filter(a => apiDetailsMap.get(a.alias)?.ServiceUrl).length;

    console.log(`  Total artifacts: ${artifacts.length}`);
    console.log(`  OData APIs: ${apis.length} (v2: ${v2Count}, v4: ${v4Count})`);
    console.log(`  Excluded deprecated: ${deprecatedCount}\n`);

    results.push({ edition, apis });
  }

  // Generate combined output file
  let combinedCode = `// Auto-generated SAP S/4HANA Cloud OData APIs
// Generated on ${new Date().toISOString()}
//
// To regenerate: bun run fetch-sap-apis
// Note: Deprecated APIs are excluded from this catalog
// Entity lists will be populated on-demand when services are configured

export type SapApiDefinition = {
  name: string;
  alias: string;
  servicePath: string;
  description: string;
  odataVersion: 'v2' | 'v4';
  defaultEntities: string[];
};

`;

  for (const { edition, apis } of results) {
    combinedCode += generateEditionCode(apis, edition);
    combinedCode += '\n';
  }

  // Add helper to get APIs by system type
  combinedCode += `// Helper to get APIs by system type
export function getApisForSystemType(systemType: 's4_public' | 's4_private'): readonly SapApiDefinition[] {
  return systemType === 's4_public' ? s4PublicApis : s4PrivateApis;
}

// Combined stats
export const apiStats = {
  s4_public: {
    total: s4PublicApis.length,
    v2: s4PublicApis.filter(a => a.odataVersion === 'v2').length,
    v4: s4PublicApis.filter(a => a.odataVersion === 'v4').length,
  },
  s4_private: {
    total: s4PrivateApis.length,
    v2: s4PrivateApis.filter(a => a.odataVersion === 'v2').length,
    v4: s4PrivateApis.filter(a => a.odataVersion === 'v4').length,
  },
};
`;

  // Output to file
  const outputPath = 'src/scripts/sap-apis-generated.ts';
  await Bun.write(outputPath, combinedCode);

  console.log('===================================');
  console.log('Summary:');
  for (const { edition, apis } of results) {
    console.log(`  ${edition.displayName}: ${apis.length} APIs`);
  }
  console.log(`\nOutput written to: ${outputPath}`);
}

// Run
main();

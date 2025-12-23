# SAP S/4HANA API Catalog Management

This document describes how to maintain and refresh the SAP OData API catalog used by S4Kit.

## Overview

S4Kit maintains a catalog of predefined SAP S/4HANA OData APIs for both editions:

| Edition | System Type | SAP Package | APIs |
|---------|-------------|-------------|------|
| **Public Cloud** | `s4_public` | `SAPS4HANACloud` | ~503 |
| **Private/On-Premise** | `s4_private` | `S4HANAOPAPI` | ~546 |

The APIs are fetched from the [SAP Business Accelerator Hub](https://api.sap.com) and stored in the database as predefined services.

## File Structure

```
src/scripts/
├── fetch-sap-apis.ts      # Script to fetch APIs from SAP Hub
├── sap-apis-generated.ts  # Auto-generated API definitions
└── SAP_APIS.md            # This documentation
```

## Refreshing the API Catalog

### When to Refresh

- SAP releases new APIs (typically quarterly)
- APIs are deprecated or removed
- New OData v4 APIs are added
- Service paths change

### How to Refresh

1. **Fetch latest APIs from SAP Hub:**

   ```bash
   cd packages/platform/backend
   bun run fetch-sap-apis
   ```

   This will:
   - Fetch all OData APIs from `SAPS4HANACloud` (Public Edition)
   - Fetch all OData APIs from `S4HANAOPAPI` (Private Edition)
   - Generate `src/scripts/sap-apis-generated.ts`

2. **Review the changes:**

   ```bash
   git diff src/scripts/sap-apis-generated.ts
   ```

3. **Refresh the API catalog in database:**

   ```bash
   # Safe for production - only updates predefined_services table
   bun run db:refresh-apis
   ```

   > **Note:** This only refreshes the `predefined_services` table. All other data (systems, instances, API keys, logs) is preserved.

   For development, you can also use:
   ```bash
   # WARNING: Deletes ALL data - blocked in production!
   bun run db:reset
   ```

4. **Commit the changes:**

   ```bash
   git add src/scripts/sap-apis-generated.ts
   git commit -m "chore: refresh SAP API catalog"
   ```

## API Data Structure

Each API entry contains:

```typescript
{
  name: string;              // Display name (e.g., "Business Partner API")
  alias: string;             // Short identifier (e.g., "bp")
  servicePath: string;       // OData service path
  description: string;       // API description
  odataVersion: 'v2' | 'v4'; // OData protocol version
  defaultEntities: [];       // Populated on-demand when configured
}
```

> Note: Deprecated APIs are excluded entirely from the catalog.

## Naming Conventions

### Public Edition
- Prefix: `API_`, `CE_`, `SLSPRCG`
- Example: `API_BUSINESS_PARTNER`
- Path: `/sap/opu/odata/sap/API_BUSINESS_PARTNER`

### Private Edition
- Prefix: `OP_API_`, `OP_`
- Example: `OP_API_BUSINESS_PARTNER_SRV`
- Path: `/sap/opu/odata/sap/OP_API_BUSINESS_PARTNER_SRV`

## Data Source

The script fetches from SAP's OData catalog API:

```
https://api.sap.com/odata/1.0/catalog.svc/ContentEntities.ContentPackages('{PACKAGE}')/Artifacts
```

Where `{PACKAGE}` is:
- `SAPS4HANACloud` for Public Edition
- `S4HANAOPAPI` for Private/On-Premise Edition

## Troubleshooting

### No APIs fetched
- Check internet connectivity
- SAP API Hub may be temporarily unavailable
- Try again later

### API count differs from SAP Hub website
- The website shows all API types (SOAP, REST, OData)
- The script only fetches OData v2 and v4 APIs
- Some APIs may be filtered out (non-API artifacts)

### Deprecated APIs
- Deprecated APIs are **excluded** from the catalog entirely
- The script filters out APIs with `State === 'DEPRECATED'`
- Check SAP documentation for successor APIs if needed

## Related Resources

- [SAP Business Accelerator Hub](https://api.sap.com)
- [SAP S/4HANA Cloud Public Edition APIs](https://api.sap.com/package/SAPS4HANACloud)
- [SAP S/4HANA On-Premise APIs](https://api.sap.com/package/S4HANAOPAPI)
- [SAP Cloudification Repository](https://github.com/SAP/abap-atc-cr-cv-s4hc)

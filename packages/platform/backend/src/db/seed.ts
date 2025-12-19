import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

// Demo organization ID - must be a valid UUID format
const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000001';

// Predefined S/4HANA Cloud services data
const s4hanaServicesData = [
  {
    name: 'Business Partner API',
    alias: 'bp',
    servicePath: '/sap/opu/odata/sap/API_BUSINESS_PARTNER',
    description: 'Create, read, update, and delete master data related to Business Partners, Suppliers, and Customers.',
    defaultEntities: ['A_BusinessPartner', 'A_BusinessPartnerAddress', 'A_BusinessPartnerBank', 'A_BusinessPartnerContact', 'A_BusinessPartnerRole', 'A_BPContactToFuncAndDept', 'A_Customer', 'A_Supplier'],
  },
  {
    name: 'Sales Order API',
    alias: 'salesorder',
    servicePath: '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
    description: 'Create, read, update, and delete sales orders.',
    defaultEntities: ['A_SalesOrder', 'A_SalesOrderItem', 'A_SalesOrderItemPartner', 'A_SalesOrderItemPrcgElmnt', 'A_SalesOrderItemText', 'A_SalesOrderPartner', 'A_SalesOrderPrcgElmnt', 'A_SalesOrderScheduleLine', 'A_SalesOrderText'],
  },
  {
    name: 'Purchase Order API',
    alias: 'purchaseorder',
    servicePath: '/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV',
    description: 'Create, read, update, and delete purchase orders.',
    defaultEntities: ['A_PurchaseOrder', 'A_PurchaseOrderItem', 'A_PurchaseOrderScheduleLine', 'A_PurOrdAccountAssignment', 'A_PurOrdPricingElement'],
  },
  {
    name: 'Product Master API',
    alias: 'product',
    servicePath: '/sap/opu/odata/sap/API_PRODUCT_SRV',
    description: 'Create, read, update, and delete product master data.',
    defaultEntities: ['A_Product', 'A_ProductDescription', 'A_ProductPlant', 'A_ProductSalesDelivery', 'A_ProductStorage', 'A_ProductValuation'],
  },
  {
    name: 'Billing Document API',
    alias: 'billing',
    servicePath: '/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV',
    description: 'Read billing documents (invoices, credit/debit memos).',
    defaultEntities: ['A_BillingDocument', 'A_BillingDocumentItem', 'A_BillingDocumentPartner', 'A_BillingDocumentPrcgElmnt'],
  },
  {
    name: 'Outbound Delivery API',
    alias: 'outbounddelivery',
    servicePath: '/sap/opu/odata/sap/API_OUTBOUND_DELIVERY_SRV',
    description: 'Create, read, update outbound deliveries.',
    defaultEntities: ['A_OutbDeliveryHeader', 'A_OutbDeliveryItem', 'A_OutbDeliveryPartner', 'A_OutbDeliveryAddress'],
  },
  {
    name: 'Inbound Delivery API',
    alias: 'inbounddelivery',
    servicePath: '/sap/opu/odata/sap/API_INBOUND_DELIVERY_SRV',
    description: 'Create, read, update inbound deliveries.',
    defaultEntities: ['A_InbDeliveryHeader', 'A_InbDeliveryItem', 'A_InbDeliveryPartner', 'A_InbDeliveryAddress'],
  },
  {
    name: 'GL Account API',
    alias: 'glaccount',
    servicePath: '/sap/opu/odata/sap/API_GLACCOUNTINCHARTOFACCOUNTS_SRV',
    description: 'Read G/L account master data.',
    defaultEntities: ['A_GLAccountInChartOfAccounts', 'A_GLAccountText'],
  },
  {
    name: 'Cost Center API',
    alias: 'costcenter',
    servicePath: '/sap/opu/odata/sap/API_COSTCENTER_SRV',
    description: 'Read cost center master data.',
    defaultEntities: ['A_CostCenter', 'A_CostCenterText'],
  },
  {
    name: 'Journal Entry API',
    alias: 'journalentry',
    servicePath: '/sap/opu/odata/sap/API_JOURNALENTRYITEMBASIC_SRV',
    description: 'Read journal entry line items.',
    defaultEntities: ['A_JournalEntryItemBasic'],
  },
  {
    name: 'Bank API',
    alias: 'bank',
    servicePath: '/sap/opu/odata/sap/API_BANKDETAIL_SRV',
    description: 'Read bank master data.',
    defaultEntities: ['A_BankDetail'],
  },
  {
    name: 'Plant API',
    alias: 'plant',
    servicePath: '/sap/opu/odata/sap/API_PLANT_SRV',
    description: 'Read plant master data.',
    defaultEntities: ['A_Plant'],
  },
];

// System types that get predefined services
const systemTypesWithServices: ('s4_public' | 's4_private')[] = ['s4_public', 's4_private'];

export async function seedDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema });

  console.log('Seeding database...');

  try {
    // Create demo organization if it doesn't exist
    console.log('Creating demo organization...');
    await db.execute(sql`
      INSERT INTO organizations (id, name, created_at)
      VALUES (${DEMO_ORG_ID}, 'Demo Organization', NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Seed predefined services using regular Drizzle insert
    // This preserves the exact data relationships (unlike drizzle-seed which shuffles)
    console.log('Seeding predefined services...');
    
    const predefinedServicesData = systemTypesWithServices.flatMap((systemType) =>
      s4hanaServicesData.map((service) => ({
        systemType,
        name: service.name,
        alias: service.alias,
        servicePath: service.servicePath,
        description: service.description,
        defaultEntities: service.defaultEntities,
      }))
    );

    // Use ON CONFLICT to avoid duplicates when re-running seed
    for (const service of predefinedServicesData) {
      await db.execute(sql`
        INSERT INTO predefined_services (system_type, name, alias, service_path, description, default_entities, created_at)
        VALUES (
          ${service.systemType},
          ${service.name},
          ${service.alias},
          ${service.servicePath},
          ${service.description},
          ${JSON.stringify(service.defaultEntities)}::jsonb,
          NOW()
        )
        ON CONFLICT (system_type, alias) DO NOTHING
      `);
    }

    console.log(`Seeded ${predefinedServicesData.length} predefined services.`);
  } finally {
    await queryClient.end();
  }
}

export async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const queryClient = postgres(databaseUrl);
  const db = drizzle(queryClient, { schema });

  console.log('Resetting database...');

  try {
    // Truncate all tables in correct order (respecting foreign keys)
    await db.execute(sql`TRUNCATE TABLE request_logs CASCADE`);
    await db.execute(sql`TRUNCATE TABLE api_key_access CASCADE`);
    await db.execute(sql`TRUNCATE TABLE api_keys CASCADE`);
    await db.execute(sql`TRUNCATE TABLE instance_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE instances CASCADE`);
    await db.execute(sql`TRUNCATE TABLE system_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE systems CASCADE`);
    await db.execute(sql`TRUNCATE TABLE predefined_services CASCADE`);
    await db.execute(sql`TRUNCATE TABLE organizations CASCADE`);
    console.log('Database reset complete.');
  } finally {
    await queryClient.end();
  }
}

// Run if called directly
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.includes('--reset')) {
    resetDatabase()
      .then(() => seedDatabase())
      .then(() => {
        console.log('Reset and seed complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Failed:', err);
        process.exit(1);
      });
  } else {
    seedDatabase()
      .then(() => {
        console.log('Seed complete');
        process.exit(0);
      })
      .catch((err) => {
        console.error('Seed failed:', err);
        process.exit(1);
      });
  }
}

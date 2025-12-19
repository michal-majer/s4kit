/**
 * Generated TypeScript types for S4Kit API
 * API Key: DemoApplication
 * API Key ID: 59e28498-c0f2-43c7-be6f-1e1f9fbbf932
 * Generated at: 2025-12-19T08:40:42.942Z
 * 
 * This file contains TypeScript type definitions for OData entities
 * accessible via your API key. Use these types for type-safe API calls.
 */

export interface A_OutbDeliveryItemType {
    /** OData type: Edm.Decimal (precision: 13, scale: 3) */
    ActualDeliveredQtyInBaseUnit?: number;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryVersion?: string;
    /** OData type: Edm.Decimal (precision: 13, scale: 3) */
    ActualDeliveryQuantity?: number;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup1?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup2?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup3?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup4?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup5?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalMaterialGroup1?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalMaterialGroup2?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalMaterialGroup3?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalMaterialGroup4?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalMaterialGroup5?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AlternateProductNumber?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BaseUnit?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Batch?: string;
    /** OData type: Edm.String (maxLength: 15) */
    BatchBySupplier?: string;
    /** OData type: Edm.String (maxLength: 18) */
    BatchClassification?: string;
    /** OData type: Edm.String (maxLength: 8) */
    BOMExplosion?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessArea?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ConsumptionPosting?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ControllingArea?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CostCenter?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    CreationDate?: any;
    /** OData type: Edm.Time */
    CreationTime?: any;
    /** OData type: Edm.String (maxLength: 17) */
    CustEngineeringChgStatus?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryDocument: string;
    /** OData type: Edm.String (maxLength: 6) */
    DeliveryDocumentItem: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryDocumentItemCategory?: string;
    /** OData type: Edm.String (maxLength: 40) */
    DeliveryDocumentItemText?: string;
    /** OData type: Edm.String (maxLength: 3) */
    DeliveryGroup?: string;
    /** OData type: Edm.String (maxLength: 3) */
    DeliveryQuantityUnit?: string;
    /** OData type: Edm.String (maxLength: 1) */
    DeliveryRelatedBillingStatus?: string;
    /** OData type: Edm.Decimal (precision: 5) */
    DeliveryToBaseQuantityDnmntr?: number;
    /** OData type: Edm.Decimal (precision: 5) */
    DeliveryToBaseQuantityNmrtr?: number;
    /** OData type: Edm.String (maxLength: 4) */
    DepartmentClassificationByCust?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel?: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division?: string;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    FixedShipgProcgDurationInDays?: number;
    /** OData type: Edm.String (maxLength: 10) */
    GLAccount?: string;
    /** OData type: Edm.String (maxLength: 4) */
    GoodsMovementReasonCode?: string;
    /** OData type: Edm.String (maxLength: 1) */
    GoodsMovementStatus?: string;
    /** OData type: Edm.String (maxLength: 3) */
    GoodsMovementType?: string;
    /** OData type: Edm.String (maxLength: 6) */
    HigherLevelItem?: string;
    /** OData type: Edm.String (maxLength: 12) */
    InspectionLot?: string;
    /** OData type: Edm.String (maxLength: 6) */
    InspectionPartialLot?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IntercompanyBillingStatus?: string;
    /** OData type: Edm.String (maxLength: 18) */
    InternationalArticleNumber?: string;
    /** OData type: Edm.String (maxLength: 1) */
    InventorySpecialStockType?: string;
    /** OData type: Edm.String (maxLength: 10) */
    InventoryValuationType?: string;
    /** OData type: Edm.Boolean */
    IsCompletelyDelivered?: boolean;
    /** OData type: Edm.String (maxLength: 1) */
    IsNotGoodsMovementsRelevant?: string;
    /** OData type: Edm.Boolean */
    IsSeparateValuation?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    IssgOrRcvgBatch?: string;
    /** OData type: Edm.String (maxLength: 40) */
    IssgOrRcvgMaterial?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IssgOrRcvgSpclStockInd?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IssgOrRcvgStockCategory?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IssgOrRcvgValuationType?: string;
    /** OData type: Edm.String (maxLength: 4) */
    IssuingOrReceivingPlant?: string;
    /** OData type: Edm.String (maxLength: 4) */
    IssuingOrReceivingStorageLoc?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ItemBillingBlockReason?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ItemBillingIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ItemDeliveryIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ItemGdsMvtIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ItemGeneralIncompletionStatus?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    ItemGrossWeight?: number;
    /** OData type: Edm.String (maxLength: 1) */
    ItemIsBillingRelevant?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    ItemNetWeight?: number;
    /** OData type: Edm.String (maxLength: 1) */
    ItemPackingIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ItemPickingIncompletionStatus?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    ItemVolume?: number;
    /** OData type: Edm.String (maxLength: 3) */
    ItemVolumeUnit?: string;
    /** OData type: Edm.String (maxLength: 3) */
    ItemWeightUnit?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    LastChangeDate?: any;
    /** OData type: Edm.String (maxLength: 4) */
    LoadingGroup?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    ManufactureDate?: any;
    /** OData type: Edm.String (maxLength: 40) */
    Material?: string;
    /** OData type: Edm.String (maxLength: 35) */
    MaterialByCustomer?: string;
    /** OData type: Edm.String (maxLength: 8) */
    MaterialFreightGroup?: string;
    /** OData type: Edm.String (maxLength: 9) */
    MaterialGroup?: string;
    /** OData type: Edm.Boolean */
    MaterialIsBatchManaged?: boolean;
    /** OData type: Edm.Boolean */
    MaterialIsIntBatchManaged?: boolean;
    /** OData type: Edm.Int32 */
    NumberOfSerialNumbers?: number;
    /** OData type: Edm.String (maxLength: 12) */
    OrderID?: string;
    /** OData type: Edm.String (maxLength: 4) */
    OrderItem?: string;
    /** OData type: Edm.Decimal (precision: 13, scale: 3) */
    OriginalDeliveryQuantity?: number;
    /** OData type: Edm.String (maxLength: 40) */
    OriginallyRequestedMaterial?: string;
    /** OData type: Edm.Decimal (precision: 3, scale: 1) */
    OverdelivTolrtdLmtRatioInPct?: number;
    /** OData type: Edm.String (maxLength: 1) */
    PackingStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PartialDeliveryIsAllowed?: string;
    /** OData type: Edm.String (maxLength: 2) */
    PaymentGuaranteeForm?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PickingConfirmationStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PickingControl?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PickingStatus?: string;
    /** OData type: Edm.String (maxLength: 4) */
    Plant?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PrimaryPostingSwitch?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    ProductAvailabilityDate?: any;
    /** OData type: Edm.Time */
    ProductAvailabilityTime?: any;
    /** OData type: Edm.String (maxLength: 18) */
    ProductConfiguration?: string;
    /** OData type: Edm.String (maxLength: 18) */
    ProductHierarchyNode?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ProfitabilitySegment?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ProfitCenter?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ProofOfDeliveryRelevanceCode?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ProofOfDeliveryStatus?: string;
    /** OData type: Edm.Boolean */
    QuantityIsFixed?: boolean;
    /** OData type: Edm.String (maxLength: 25) */
    ReceivingPoint?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ReferenceDocumentLogicalSystem?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ReferenceSDDocument?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ReferenceSDDocumentCategory?: string;
    /** OData type: Edm.String (maxLength: 6) */
    ReferenceSDDocumentItem?: string;
    /** OData type: Edm.String (maxLength: 10) */
    RetailPromotion?: string;
    /** OData type: Edm.String (maxLength: 1) */
    SalesDocumentItemType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    SalesGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOffice?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SDDocumentCategory?: string;
    /** OData type: Edm.String (maxLength: 1) */
    SDProcessStatus?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    ShelfLifeExpirationDate?: any;
    /** OData type: Edm.DateTime (precision: 7) */
    StatisticsDate?: any;
    /** OData type: Edm.String (maxLength: 1) */
    StockType?: string;
    /** OData type: Edm.String (maxLength: 10) */
    StorageBin?: string;
    /** OData type: Edm.String (maxLength: 4) */
    StorageLocation?: string;
    /** OData type: Edm.String (maxLength: 3) */
    StorageType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    SubsequentMovementType?: string;
    /** OData type: Edm.String (maxLength: 4) */
    TransportationGroup?: string;
    /** OData type: Edm.Decimal (precision: 3, scale: 1) */
    UnderdelivTolrtdLmtRatioInPct?: number;
    /** OData type: Edm.Boolean */
    UnlimitedOverdeliveryIsAllowed?: boolean;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    VarblShipgProcgDurationInDays?: number;
    /** OData type: Edm.String (maxLength: 3) */
    Warehouse?: string;
    /** OData type: Edm.String (maxLength: 1) */
    WarehouseActivityStatus?: string;
    /** OData type: Edm.String (maxLength: 10) */
    WarehouseStagingArea?: string;
    /** OData type: Edm.String (maxLength: 1) */
    WarehouseStockCategory?: string;
    /** OData type: Edm.String (maxLength: 10) */
    WarehouseStorageBin?: string;
  }
  
  export interface CreateA_OutbDeliveryItemTypeRequest {
    ActualDeliveredQtyInBaseUnit?: number;
    DeliveryVersion?: string;
    ActualDeliveryQuantity?: number;
    AdditionalCustomerGroup1?: string;
    AdditionalCustomerGroup2?: string;
    AdditionalCustomerGroup3?: string;
    AdditionalCustomerGroup4?: string;
    AdditionalCustomerGroup5?: string;
    AdditionalMaterialGroup1?: string;
    AdditionalMaterialGroup2?: string;
    AdditionalMaterialGroup3?: string;
    AdditionalMaterialGroup4?: string;
    AdditionalMaterialGroup5?: string;
    AlternateProductNumber?: string;
    BaseUnit?: string;
    Batch?: string;
    BatchBySupplier?: string;
    BatchClassification?: string;
    BOMExplosion?: string;
    BusinessArea?: string;
    ConsumptionPosting?: string;
    ControllingArea?: string;
    CostCenter?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    CustEngineeringChgStatus?: string;
    DeliveryDocumentItemCategory?: string;
    DeliveryDocumentItemText?: string;
    DeliveryGroup?: string;
    DeliveryQuantityUnit?: string;
    DeliveryRelatedBillingStatus?: string;
    DeliveryToBaseQuantityDnmntr?: number;
    DeliveryToBaseQuantityNmrtr?: number;
    DepartmentClassificationByCust?: string;
    DistributionChannel?: string;
    Division?: string;
    FixedShipgProcgDurationInDays?: number;
    GLAccount?: string;
    GoodsMovementReasonCode?: string;
    GoodsMovementStatus?: string;
    GoodsMovementType?: string;
    HigherLevelItem?: string;
    InspectionLot?: string;
    InspectionPartialLot?: string;
    IntercompanyBillingStatus?: string;
    InternationalArticleNumber?: string;
    InventorySpecialStockType?: string;
    InventoryValuationType?: string;
    IsCompletelyDelivered?: boolean;
    IsNotGoodsMovementsRelevant?: string;
    IsSeparateValuation?: boolean;
    IssgOrRcvgBatch?: string;
    IssgOrRcvgMaterial?: string;
    IssgOrRcvgSpclStockInd?: string;
    IssgOrRcvgStockCategory?: string;
    IssgOrRcvgValuationType?: string;
    IssuingOrReceivingPlant?: string;
    IssuingOrReceivingStorageLoc?: string;
    ItemBillingBlockReason?: string;
    ItemBillingIncompletionStatus?: string;
    ItemDeliveryIncompletionStatus?: string;
    ItemGdsMvtIncompletionSts?: string;
    ItemGeneralIncompletionStatus?: string;
    ItemGrossWeight?: number;
    ItemIsBillingRelevant?: string;
    ItemNetWeight?: number;
    ItemPackingIncompletionStatus?: string;
    ItemPickingIncompletionStatus?: string;
    ItemVolume?: number;
    ItemVolumeUnit?: string;
    ItemWeightUnit?: string;
    LastChangeDate?: any;
    LoadingGroup?: string;
    ManufactureDate?: any;
    Material?: string;
    MaterialByCustomer?: string;
    MaterialFreightGroup?: string;
    MaterialGroup?: string;
    MaterialIsBatchManaged?: boolean;
    MaterialIsIntBatchManaged?: boolean;
    NumberOfSerialNumbers?: number;
    OrderID?: string;
    OrderItem?: string;
    OriginalDeliveryQuantity?: number;
    OriginallyRequestedMaterial?: string;
    OverdelivTolrtdLmtRatioInPct?: number;
    PackingStatus?: string;
    PartialDeliveryIsAllowed?: string;
    PaymentGuaranteeForm?: string;
    PickingConfirmationStatus?: string;
    PickingControl?: string;
    PickingStatus?: string;
    Plant?: string;
    PrimaryPostingSwitch?: string;
    ProductAvailabilityDate?: any;
    ProductAvailabilityTime?: any;
    ProductConfiguration?: string;
    ProductHierarchyNode?: string;
    ProfitabilitySegment?: string;
    ProfitCenter?: string;
    ProofOfDeliveryRelevanceCode?: string;
    ProofOfDeliveryStatus?: string;
    QuantityIsFixed?: boolean;
    ReceivingPoint?: string;
    ReferenceDocumentLogicalSystem?: string;
    ReferenceSDDocument?: string;
    ReferenceSDDocumentCategory?: string;
    ReferenceSDDocumentItem?: string;
    RetailPromotion?: string;
    SalesDocumentItemType?: string;
    SalesGroup?: string;
    SalesOffice?: string;
    SDDocumentCategory?: string;
    SDProcessStatus?: string;
    ShelfLifeExpirationDate?: any;
    StatisticsDate?: any;
    StockType?: string;
    StorageBin?: string;
    StorageLocation?: string;
    StorageType?: string;
    SubsequentMovementType?: string;
    TransportationGroup?: string;
    UnderdelivTolrtdLmtRatioInPct?: number;
    UnlimitedOverdeliveryIsAllowed?: boolean;
    VarblShipgProcgDurationInDays?: number;
    Warehouse?: string;
    WarehouseActivityStatus?: string;
    WarehouseStagingArea?: string;
    WarehouseStockCategory?: string;
    WarehouseStorageBin?: string;
  }
  
  export interface UpdateA_OutbDeliveryItemTypeRequest {
    ActualDeliveredQtyInBaseUnit?: number;
    DeliveryVersion?: string;
    ActualDeliveryQuantity?: number;
    AdditionalCustomerGroup1?: string;
    AdditionalCustomerGroup2?: string;
    AdditionalCustomerGroup3?: string;
    AdditionalCustomerGroup4?: string;
    AdditionalCustomerGroup5?: string;
    AdditionalMaterialGroup1?: string;
    AdditionalMaterialGroup2?: string;
    AdditionalMaterialGroup3?: string;
    AdditionalMaterialGroup4?: string;
    AdditionalMaterialGroup5?: string;
    AlternateProductNumber?: string;
    BaseUnit?: string;
    Batch?: string;
    BatchBySupplier?: string;
    BatchClassification?: string;
    BOMExplosion?: string;
    BusinessArea?: string;
    ConsumptionPosting?: string;
    ControllingArea?: string;
    CostCenter?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    CustEngineeringChgStatus?: string;
    DeliveryDocument?: string;
    DeliveryDocumentItem?: string;
    DeliveryDocumentItemCategory?: string;
    DeliveryDocumentItemText?: string;
    DeliveryGroup?: string;
    DeliveryQuantityUnit?: string;
    DeliveryRelatedBillingStatus?: string;
    DeliveryToBaseQuantityDnmntr?: number;
    DeliveryToBaseQuantityNmrtr?: number;
    DepartmentClassificationByCust?: string;
    DistributionChannel?: string;
    Division?: string;
    FixedShipgProcgDurationInDays?: number;
    GLAccount?: string;
    GoodsMovementReasonCode?: string;
    GoodsMovementStatus?: string;
    GoodsMovementType?: string;
    HigherLevelItem?: string;
    InspectionLot?: string;
    InspectionPartialLot?: string;
    IntercompanyBillingStatus?: string;
    InternationalArticleNumber?: string;
    InventorySpecialStockType?: string;
    InventoryValuationType?: string;
    IsCompletelyDelivered?: boolean;
    IsNotGoodsMovementsRelevant?: string;
    IsSeparateValuation?: boolean;
    IssgOrRcvgBatch?: string;
    IssgOrRcvgMaterial?: string;
    IssgOrRcvgSpclStockInd?: string;
    IssgOrRcvgStockCategory?: string;
    IssgOrRcvgValuationType?: string;
    IssuingOrReceivingPlant?: string;
    IssuingOrReceivingStorageLoc?: string;
    ItemBillingBlockReason?: string;
    ItemBillingIncompletionStatus?: string;
    ItemDeliveryIncompletionStatus?: string;
    ItemGdsMvtIncompletionSts?: string;
    ItemGeneralIncompletionStatus?: string;
    ItemGrossWeight?: number;
    ItemIsBillingRelevant?: string;
    ItemNetWeight?: number;
    ItemPackingIncompletionStatus?: string;
    ItemPickingIncompletionStatus?: string;
    ItemVolume?: number;
    ItemVolumeUnit?: string;
    ItemWeightUnit?: string;
    LastChangeDate?: any;
    LoadingGroup?: string;
    ManufactureDate?: any;
    Material?: string;
    MaterialByCustomer?: string;
    MaterialFreightGroup?: string;
    MaterialGroup?: string;
    MaterialIsBatchManaged?: boolean;
    MaterialIsIntBatchManaged?: boolean;
    NumberOfSerialNumbers?: number;
    OrderID?: string;
    OrderItem?: string;
    OriginalDeliveryQuantity?: number;
    OriginallyRequestedMaterial?: string;
    OverdelivTolrtdLmtRatioInPct?: number;
    PackingStatus?: string;
    PartialDeliveryIsAllowed?: string;
    PaymentGuaranteeForm?: string;
    PickingConfirmationStatus?: string;
    PickingControl?: string;
    PickingStatus?: string;
    Plant?: string;
    PrimaryPostingSwitch?: string;
    ProductAvailabilityDate?: any;
    ProductAvailabilityTime?: any;
    ProductConfiguration?: string;
    ProductHierarchyNode?: string;
    ProfitabilitySegment?: string;
    ProfitCenter?: string;
    ProofOfDeliveryRelevanceCode?: string;
    ProofOfDeliveryStatus?: string;
    QuantityIsFixed?: boolean;
    ReceivingPoint?: string;
    ReferenceDocumentLogicalSystem?: string;
    ReferenceSDDocument?: string;
    ReferenceSDDocumentCategory?: string;
    ReferenceSDDocumentItem?: string;
    RetailPromotion?: string;
    SalesDocumentItemType?: string;
    SalesGroup?: string;
    SalesOffice?: string;
    SDDocumentCategory?: string;
    SDProcessStatus?: string;
    ShelfLifeExpirationDate?: any;
    StatisticsDate?: any;
    StockType?: string;
    StorageBin?: string;
    StorageLocation?: string;
    StorageType?: string;
    SubsequentMovementType?: string;
    TransportationGroup?: string;
    UnderdelivTolrtdLmtRatioInPct?: number;
    UnlimitedOverdeliveryIsAllowed?: boolean;
    VarblShipgProcgDurationInDays?: number;
    Warehouse?: string;
    WarehouseActivityStatus?: string;
    WarehouseStagingArea?: string;
    WarehouseStockCategory?: string;
    WarehouseStorageBin?: string;
  }
  
  export interface A_OutbDeliveryHeaderType {
    /** OData type: Edm.String (maxLength: 6) */
    Shippinglocationtimezone: string;
    /** OData type: Edm.String (maxLength: 6) */
    ActualDeliveryRoute?: string;
    /** OData type: Edm.String (maxLength: 6) */
    Receivinglocationtimezone: string;
    /** OData type: Edm.DateTime (precision: 7) */
    ActualGoodsMovementDate?: any;
    /** OData type: Edm.Time */
    ActualGoodsMovementTime?: any;
    /** OData type: Edm.DateTime (precision: 7) */
    BillingDocumentDate?: any;
    /** OData type: Edm.String (maxLength: 35) */
    BillOfLading?: string;
    /** OData type: Edm.Boolean */
    CompleteDeliveryIsDefined?: boolean;
    /** OData type: Edm.Time */
    ConfirmationTime?: any;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    CreationDate?: any;
    /** OData type: Edm.Time */
    CreationTime?: any;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryBlockReason?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    DeliveryDate?: any;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryDocument: string;
    /** OData type: Edm.String (maxLength: 35) */
    DeliveryDocumentBySupplier?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryDocumentType?: string;
    /** OData type: Edm.Boolean */
    DeliveryIsInPlant?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryPriority?: string;
    /** OData type: Edm.Time */
    DeliveryTime?: any;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryVersion?: string;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    DepreciationPercentage?: number;
    /** OData type: Edm.String (maxLength: 1) */
    DistrStatusByDecentralizedWrhs?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    DocumentDate?: any;
    /** OData type: Edm.String (maxLength: 1) */
    ExternalIdentificationType?: string;
    /** OData type: Edm.String (maxLength: 5) */
    ExternalTransportSystem?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FactoryCalendarByCustomer?: string;
    /** OData type: Edm.String (maxLength: 10) */
    GoodsIssueOrReceiptSlipNumber?: string;
    /** OData type: Edm.Time */
    GoodsIssueTime?: any;
    /** OData type: Edm.String (maxLength: 1) */
    HandlingUnitInStock?: string;
    /** OData type: Edm.String (maxLength: 1) */
    HdrGeneralIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    HdrGoodsMvtIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    HeaderBillgIncompletionStatus?: string;
    /** OData type: Edm.String (maxLength: 2) */
    HeaderBillingBlockReason?: string;
    /** OData type: Edm.String (maxLength: 1) */
    HeaderDelivIncompletionStatus?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    HeaderGrossWeight?: number;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    HeaderNetWeight?: number;
    /** OData type: Edm.String (maxLength: 1) */
    HeaderPackingIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    HeaderPickgIncompletionStatus?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    HeaderVolume?: number;
    /** OData type: Edm.String (maxLength: 3) */
    HeaderVolumeUnit?: string;
    /** OData type: Edm.String (maxLength: 3) */
    HeaderWeightUnit?: string;
    /** OData type: Edm.String (maxLength: 3) */
    IncotermsClassification?: string;
    /** OData type: Edm.String (maxLength: 28) */
    IncotermsTransferLocation?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    IntercompanyBillingDate?: any;
    /** OData type: Edm.String (maxLength: 10) */
    InternalFinancialDocument?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IsDeliveryForSingleWarehouse?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IsExportDelivery?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    LastChangeDate?: any;
    /** OData type: Edm.String (maxLength: 12) */
    LastChangedByUser?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    LoadingDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    LoadingPoint?: string;
    /** OData type: Edm.Time */
    LoadingTime?: any;
    /** OData type: Edm.String (maxLength: 20) */
    MeansOfTransport?: string;
    /** OData type: Edm.String (maxLength: 40) */
    MeansOfTransportRefMaterial?: string;
    /** OData type: Edm.String (maxLength: 4) */
    MeansOfTransportType?: string;
    /** OData type: Edm.Boolean */
    OrderCombinationIsAllowed?: boolean;
    /** OData type: Edm.String (maxLength: 12) */
    OrderID?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallDelivConfStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallDelivReltdBillgStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallGoodsMovementStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallIntcoBillingStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallPackingStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallPickingConfStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallPickingStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallProofOfDeliveryStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallSDProcessStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OverallWarehouseActivityStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OvrlItmDelivIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OvrlItmGdsMvtIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OvrlItmGeneralIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OvrlItmPackingIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 1) */
    OvrlItmPickingIncompletionSts?: string;
    /** OData type: Edm.String (maxLength: 6) */
    PaymentGuaranteeProcedure?: string;
    /** OData type: Edm.String (maxLength: 20) */
    PickedItemsLocation?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    PickingDate?: any;
    /** OData type: Edm.Time */
    PickingTime?: any;
    /** OData type: Edm.DateTime (precision: 7) */
    PlannedGoodsIssueDate?: any;
    /** OData type: Edm.DateTime (precision: 7) */
    ProofOfDeliveryDate?: any;
    /** OData type: Edm.String (maxLength: 6) */
    ProposedDeliveryRoute?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ReceivingPlant?: string;
    /** OData type: Edm.String (maxLength: 10) */
    RouteSchedule?: string;
    /** OData type: Edm.String (maxLength: 6) */
    SalesDistrict?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOffice?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SDDocumentCategory?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShipmentBlockReason?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShippingCondition?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ShippingPoint?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShippingType?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ShipToParty?: string;
    /** OData type: Edm.String (maxLength: 10) */
    SoldToParty?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SpecialProcessingCode?: string;
    /** OData type: Edm.String (maxLength: 5) */
    StatisticsCurrency?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Supplier?: string;
    /** OData type: Edm.String (maxLength: 1) */
    TotalBlockStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    TotalCreditCheckStatus?: string;
    /** OData type: Edm.String (maxLength: 5) */
    TotalNumberOfPackage?: string;
    /** OData type: Edm.String (maxLength: 5) */
    TransactionCurrency?: string;
    /** OData type: Edm.String (maxLength: 4) */
    TransportationGroup?: string;
    /** OData type: Edm.DateTime (precision: 7) */
    TransportationPlanningDate?: any;
    /** OData type: Edm.String (maxLength: 1) */
    TransportationPlanningStatus?: string;
    /** OData type: Edm.Time */
    TransportationPlanningTime?: any;
    /** OData type: Edm.String (maxLength: 25) */
    UnloadingPointName?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Warehouse?: string;
    /** OData type: Edm.String (maxLength: 3) */
    WarehouseGate?: string;
    /** OData type: Edm.String (maxLength: 10) */
    WarehouseStagingArea?: string;
  }
  
  export interface CreateA_OutbDeliveryHeaderTypeRequest {
    Shippinglocationtimezone?: string;
    ActualDeliveryRoute?: string;
    Receivinglocationtimezone?: string;
    ActualGoodsMovementDate?: any;
    ActualGoodsMovementTime?: any;
    BillingDocumentDate?: any;
    BillOfLading?: string;
    CompleteDeliveryIsDefined?: boolean;
    ConfirmationTime?: any;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    CustomerGroup?: string;
    DeliveryBlockReason?: string;
    DeliveryDate?: any;
    DeliveryDocumentBySupplier?: string;
    DeliveryDocumentType?: string;
    DeliveryIsInPlant?: boolean;
    DeliveryPriority?: string;
    DeliveryTime?: any;
    DeliveryVersion?: string;
    DepreciationPercentage?: number;
    DistrStatusByDecentralizedWrhs?: string;
    DocumentDate?: any;
    ExternalIdentificationType?: string;
    ExternalTransportSystem?: string;
    FactoryCalendarByCustomer?: string;
    GoodsIssueOrReceiptSlipNumber?: string;
    GoodsIssueTime?: any;
    HandlingUnitInStock?: string;
    HdrGeneralIncompletionStatus?: string;
    HdrGoodsMvtIncompletionStatus?: string;
    HeaderBillgIncompletionStatus?: string;
    HeaderBillingBlockReason?: string;
    HeaderDelivIncompletionStatus?: string;
    HeaderGrossWeight?: number;
    HeaderNetWeight?: number;
    HeaderPackingIncompletionSts?: string;
    HeaderPickgIncompletionStatus?: string;
    HeaderVolume?: number;
    HeaderVolumeUnit?: string;
    HeaderWeightUnit?: string;
    IncotermsClassification?: string;
    IncotermsTransferLocation?: string;
    IntercompanyBillingDate?: any;
    InternalFinancialDocument?: string;
    IsDeliveryForSingleWarehouse?: string;
    IsExportDelivery?: string;
    LastChangeDate?: any;
    LastChangedByUser?: string;
    LoadingDate?: any;
    LoadingPoint?: string;
    LoadingTime?: any;
    MeansOfTransport?: string;
    MeansOfTransportRefMaterial?: string;
    MeansOfTransportType?: string;
    OrderCombinationIsAllowed?: boolean;
    OrderID?: string;
    OverallDelivConfStatus?: string;
    OverallDelivReltdBillgStatus?: string;
    OverallGoodsMovementStatus?: string;
    OverallIntcoBillingStatus?: string;
    OverallPackingStatus?: string;
    OverallPickingConfStatus?: string;
    OverallPickingStatus?: string;
    OverallProofOfDeliveryStatus?: string;
    OverallSDProcessStatus?: string;
    OverallWarehouseActivityStatus?: string;
    OvrlItmDelivIncompletionSts?: string;
    OvrlItmGdsMvtIncompletionSts?: string;
    OvrlItmGeneralIncompletionSts?: string;
    OvrlItmPackingIncompletionSts?: string;
    OvrlItmPickingIncompletionSts?: string;
    PaymentGuaranteeProcedure?: string;
    PickedItemsLocation?: string;
    PickingDate?: any;
    PickingTime?: any;
    PlannedGoodsIssueDate?: any;
    ProofOfDeliveryDate?: any;
    ProposedDeliveryRoute?: string;
    ReceivingPlant?: string;
    RouteSchedule?: string;
    SalesDistrict?: string;
    SalesOffice?: string;
    SalesOrganization?: string;
    SDDocumentCategory?: string;
    ShipmentBlockReason?: string;
    ShippingCondition?: string;
    ShippingPoint?: string;
    ShippingType?: string;
    ShipToParty?: string;
    SoldToParty?: string;
    SpecialProcessingCode?: string;
    StatisticsCurrency?: string;
    Supplier?: string;
    TotalBlockStatus?: string;
    TotalCreditCheckStatus?: string;
    TotalNumberOfPackage?: string;
    TransactionCurrency?: string;
    TransportationGroup?: string;
    TransportationPlanningDate?: any;
    TransportationPlanningStatus?: string;
    TransportationPlanningTime?: any;
    UnloadingPointName?: string;
    Warehouse?: string;
    WarehouseGate?: string;
    WarehouseStagingArea?: string;
  }
  
  export interface UpdateA_OutbDeliveryHeaderTypeRequest {
    Shippinglocationtimezone?: string;
    ActualDeliveryRoute?: string;
    Receivinglocationtimezone?: string;
    ActualGoodsMovementDate?: any;
    ActualGoodsMovementTime?: any;
    BillingDocumentDate?: any;
    BillOfLading?: string;
    CompleteDeliveryIsDefined?: boolean;
    ConfirmationTime?: any;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    CustomerGroup?: string;
    DeliveryBlockReason?: string;
    DeliveryDate?: any;
    DeliveryDocument?: string;
    DeliveryDocumentBySupplier?: string;
    DeliveryDocumentType?: string;
    DeliveryIsInPlant?: boolean;
    DeliveryPriority?: string;
    DeliveryTime?: any;
    DeliveryVersion?: string;
    DepreciationPercentage?: number;
    DistrStatusByDecentralizedWrhs?: string;
    DocumentDate?: any;
    ExternalIdentificationType?: string;
    ExternalTransportSystem?: string;
    FactoryCalendarByCustomer?: string;
    GoodsIssueOrReceiptSlipNumber?: string;
    GoodsIssueTime?: any;
    HandlingUnitInStock?: string;
    HdrGeneralIncompletionStatus?: string;
    HdrGoodsMvtIncompletionStatus?: string;
    HeaderBillgIncompletionStatus?: string;
    HeaderBillingBlockReason?: string;
    HeaderDelivIncompletionStatus?: string;
    HeaderGrossWeight?: number;
    HeaderNetWeight?: number;
    HeaderPackingIncompletionSts?: string;
    HeaderPickgIncompletionStatus?: string;
    HeaderVolume?: number;
    HeaderVolumeUnit?: string;
    HeaderWeightUnit?: string;
    IncotermsClassification?: string;
    IncotermsTransferLocation?: string;
    IntercompanyBillingDate?: any;
    InternalFinancialDocument?: string;
    IsDeliveryForSingleWarehouse?: string;
    IsExportDelivery?: string;
    LastChangeDate?: any;
    LastChangedByUser?: string;
    LoadingDate?: any;
    LoadingPoint?: string;
    LoadingTime?: any;
    MeansOfTransport?: string;
    MeansOfTransportRefMaterial?: string;
    MeansOfTransportType?: string;
    OrderCombinationIsAllowed?: boolean;
    OrderID?: string;
    OverallDelivConfStatus?: string;
    OverallDelivReltdBillgStatus?: string;
    OverallGoodsMovementStatus?: string;
    OverallIntcoBillingStatus?: string;
    OverallPackingStatus?: string;
    OverallPickingConfStatus?: string;
    OverallPickingStatus?: string;
    OverallProofOfDeliveryStatus?: string;
    OverallSDProcessStatus?: string;
    OverallWarehouseActivityStatus?: string;
    OvrlItmDelivIncompletionSts?: string;
    OvrlItmGdsMvtIncompletionSts?: string;
    OvrlItmGeneralIncompletionSts?: string;
    OvrlItmPackingIncompletionSts?: string;
    OvrlItmPickingIncompletionSts?: string;
    PaymentGuaranteeProcedure?: string;
    PickedItemsLocation?: string;
    PickingDate?: any;
    PickingTime?: any;
    PlannedGoodsIssueDate?: any;
    ProofOfDeliveryDate?: any;
    ProposedDeliveryRoute?: string;
    ReceivingPlant?: string;
    RouteSchedule?: string;
    SalesDistrict?: string;
    SalesOffice?: string;
    SalesOrganization?: string;
    SDDocumentCategory?: string;
    ShipmentBlockReason?: string;
    ShippingCondition?: string;
    ShippingPoint?: string;
    ShippingType?: string;
    ShipToParty?: string;
    SoldToParty?: string;
    SpecialProcessingCode?: string;
    StatisticsCurrency?: string;
    Supplier?: string;
    TotalBlockStatus?: string;
    TotalCreditCheckStatus?: string;
    TotalNumberOfPackage?: string;
    TransactionCurrency?: string;
    TransportationGroup?: string;
    TransportationPlanningDate?: any;
    TransportationPlanningStatus?: string;
    TransportationPlanningTime?: any;
    UnloadingPointName?: string;
    Warehouse?: string;
    WarehouseGate?: string;
    WarehouseStagingArea?: string;
  }
  
  export interface A_OutbDeliveryDocFlowType {
    /** OData type: Edm.String (maxLength: 4) */
    Deliveryversion?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PrecedingDocument: string;
    /** OData type: Edm.String (maxLength: 4) */
    PrecedingDocumentCategory?: string;
    /** OData type: Edm.String (maxLength: 6) */
    PrecedingDocumentItem: string;
    /** OData type: Edm.String (maxLength: 10) */
    Subsequentdocument?: string;
    /** OData type: Edm.Decimal (precision: 15, scale: 3) */
    QuantityInBaseUnit?: number;
    /** OData type: Edm.String (maxLength: 6) */
    SubsequentDocumentItem?: string;
    /** OData type: Edm.String (maxLength: 1) */
    SDFulfillmentCalculationRule?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SubsequentDocumentCategory: string;
    /** OData type: Edm.Boolean */
    TransferOrderInWrhsMgmtIsConfd?: boolean;
  }
  
  export interface CreateA_OutbDeliveryDocFlowTypeRequest {
    Deliveryversion?: string;
    PrecedingDocumentCategory?: string;
    Subsequentdocument?: string;
    QuantityInBaseUnit?: number;
    SubsequentDocumentItem?: string;
    SDFulfillmentCalculationRule?: string;
    TransferOrderInWrhsMgmtIsConfd?: boolean;
  }
  
  export interface UpdateA_OutbDeliveryDocFlowTypeRequest {
    Deliveryversion?: string;
    PrecedingDocument?: string;
    PrecedingDocumentCategory?: string;
    PrecedingDocumentItem?: string;
    Subsequentdocument?: string;
    QuantityInBaseUnit?: number;
    SubsequentDocumentItem?: string;
    SDFulfillmentCalculationRule?: string;
    SubsequentDocumentCategory?: string;
    TransferOrderInWrhsMgmtIsConfd?: boolean;
  }
  
  export interface A_MaintenanceItemObjectType {
    /** OData type: Edm.String (maxLength: 40) */
    Assembly: string;
    /** OData type: Edm.String (maxLength: 18) */
    Equipment: string;
    /** OData type: Edm.String (maxLength: 40) */
    FunctionalLocation: string;
    /** OData type: Edm.Int32 */
    MaintenanceItemObject: number;
    /** OData type: Edm.Int32 */
    MaintenanceItemObjectList: number;
    /** OData type: Edm.String (maxLength: 12) */
    MaintenanceNotification: string;
    /** OData type: Edm.String (maxLength: 12) */
    MaintObjectLocAcctAssgmtNmbr: string;
    /** OData type: Edm.String (maxLength: 40) */
    Material: string;
    /** OData type: Edm.String (maxLength: 18) */
    SerialNumber: string;
  }
  
  export interface CreateA_MaintenanceItemObjectTypeRequest {
    Assembly?: string;
    Equipment?: string;
    FunctionalLocation?: string;
    MaintenanceNotification?: string;
    MaintObjectLocAcctAssgmtNmbr?: string;
    Material?: string;
    SerialNumber?: string;
  }
  
  export interface UpdateA_MaintenanceItemObjectTypeRequest {
    Assembly?: string;
    Equipment?: string;
    FunctionalLocation?: string;
    MaintenanceItemObject?: number;
    MaintenanceItemObjectList?: number;
    MaintenanceNotification?: string;
    MaintObjectLocAcctAssgmtNmbr?: string;
    Material?: string;
    SerialNumber?: string;
  }
  
  export interface A_SerialNmbrDeliveryType {
    /** OData type: Edm.DateTime */
    DeliveryDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryDocument: string;
    /** OData type: Edm.String (maxLength: 6) */
    DeliveryDocumentItem: string;
    /** OData type: Edm.Int32 */
    MaintenanceItemObjectList: number;
    /** OData type: Edm.String (maxLength: 4) */
    SDDocumentCategory: string;
  }
  
  export interface CreateA_SerialNmbrDeliveryTypeRequest {
    DeliveryDate?: any;
    DeliveryDocument?: string;
    DeliveryDocumentItem?: string;
    SDDocumentCategory?: string;
  }
  
  export interface UpdateA_SerialNmbrDeliveryTypeRequest {
    DeliveryDate?: any;
    DeliveryDocument?: string;
    DeliveryDocumentItem?: string;
    MaintenanceItemObjectList?: number;
    SDDocumentCategory?: string;
  }
  
  export interface A_OutbDeliveryPartnerType {
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    ContactPerson: string;
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 2) */
    PartnerFunction: string;
    /** OData type: Edm.String (maxLength: 8) */
    Personnel: string;
    /** OData type: Edm.String (maxLength: 10) */
    SDDocument: string;
    /** OData type: Edm.String (maxLength: 6) */
    SDDocumentItem: string;
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
  }
  
  export interface CreateA_OutbDeliveryPartnerTypeRequest {
    AddressID?: string;
    ContactPerson?: string;
    Customer?: string;
    Personnel?: string;
    SDDocumentItem?: string;
    Supplier?: string;
  }
  
  export interface UpdateA_OutbDeliveryPartnerTypeRequest {
    AddressID?: string;
    ContactPerson?: string;
    Customer?: string;
    PartnerFunction?: string;
    Personnel?: string;
    SDDocument?: string;
    SDDocumentItem?: string;
    Supplier?: string;
  }
  
  export interface A_OutbDeliveryAddressType {
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetPrefixName: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetSuffixName: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 6) */
    AddressTimeZone: string;
    /** OData type: Edm.String (maxLength: 20) */
    Building: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerName1: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerName2: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerName3: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerName4: string;
    /** OData type: Edm.String (maxLength: 40) */
    CareOfName: string;
    /** OData type: Edm.String (maxLength: 12) */
    CityCode: string;
    /** OData type: Edm.String (maxLength: 40) */
    CityName: string;
    /** OData type: Edm.String (maxLength: 25) */
    CitySearch: string;
    /** OData type: Edm.String (maxLength: 10) */
    CompanyPostalCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    CorrespondenceLanguage: string;
    /** OData type: Edm.String (maxLength: 3) */
    Country: string;
    /** OData type: Edm.String (maxLength: 40) */
    County: string;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryServiceNumber: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryServiceTypeCode: string;
    /** OData type: Edm.String (maxLength: 40) */
    District: string;
    /** OData type: Edm.String (maxLength: 30) */
    FaxNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    Floor: string;
    /** OData type: Edm.String (maxLength: 4) */
    FormOfAddress: string;
    /** OData type: Edm.String (maxLength: 80) */
    FullName: string;
    /** OData type: Edm.String (maxLength: 40) */
    HomeCityName: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumberSupplementText: string;
    /** OData type: Edm.String (maxLength: 1) */
    Nation: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 30) */
    PhoneNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBox: string;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxDeviatingCityName: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingCountry: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingRegion: string;
    /** OData type: Edm.Boolean */
    POBoxIsWithoutNumber: boolean;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxLobbyName: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBoxPostalCode: string;
    /** OData type: Edm.String (maxLength: 10) */
    PostalCode: string;
    /** OData type: Edm.String (maxLength: 3) */
    PrfrdCommMediumType: string;
    /** OData type: Edm.String (maxLength: 3) */
    Region: string;
    /** OData type: Edm.String (maxLength: 10) */
    RoomNumber: string;
    /** OData type: Edm.String (maxLength: 20) */
    SearchTerm1: string;
    /** OData type: Edm.String (maxLength: 60) */
    StreetName: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetPrefixName: string;
    /** OData type: Edm.String (maxLength: 25) */
    StreetSearch: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetSuffixName: string;
    /** OData type: Edm.String (maxLength: 15) */
    TaxJurisdiction: string;
    /** OData type: Edm.String (maxLength: 10) */
    TransportZone: string;
  }
  
  export interface CreateA_OutbDeliveryAddressTypeRequest {
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressTimeZone?: string;
    Building?: string;
    BusinessPartnerName1?: string;
    BusinessPartnerName2?: string;
    BusinessPartnerName3?: string;
    BusinessPartnerName4?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CitySearch?: string;
    CompanyPostalCode?: string;
    CorrespondenceLanguage?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FaxNumber?: string;
    Floor?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Nation?: string;
    Person?: string;
    PhoneNumber?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    RoomNumber?: string;
    SearchTerm1?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSearch?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
  }
  
  export interface UpdateA_OutbDeliveryAddressTypeRequest {
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressID?: string;
    AddressTimeZone?: string;
    Building?: string;
    BusinessPartnerName1?: string;
    BusinessPartnerName2?: string;
    BusinessPartnerName3?: string;
    BusinessPartnerName4?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CitySearch?: string;
    CompanyPostalCode?: string;
    CorrespondenceLanguage?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FaxNumber?: string;
    Floor?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Nation?: string;
    Person?: string;
    PhoneNumber?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    RoomNumber?: string;
    SearchTerm1?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSearch?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
  }
  
  export interface A_AddressEmailAddressType {
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultEmailAddress?: boolean;
    /** OData type: Edm.String (maxLength: 241) */
    EmailAddress?: string;
    /** OData type: Edm.String (maxLength: 20) */
    SearchEmailAddress?: string;
    /** OData type: Edm.String (maxLength: 50) */
    AddressCommunicationRemarkText?: string;
  }
  
  export interface CreateA_AddressEmailAddressTypeRequest {
    IsDefaultEmailAddress?: boolean;
    EmailAddress?: string;
    SearchEmailAddress?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface UpdateA_AddressEmailAddressTypeRequest {
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    IsDefaultEmailAddress?: boolean;
    EmailAddress?: string;
    SearchEmailAddress?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface A_AddressFaxNumberType {
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultFaxNumber?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    FaxCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    FaxNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    FaxNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalFaxNumber?: string;
    /** OData type: Edm.String (maxLength: 50) */
    AddressCommunicationRemarkText?: string;
  }
  
  export interface CreateA_AddressFaxNumberTypeRequest {
    IsDefaultFaxNumber?: boolean;
    FaxCountry?: string;
    FaxNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface UpdateA_AddressFaxNumberTypeRequest {
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    IsDefaultFaxNumber?: boolean;
    FaxCountry?: string;
    FaxNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface A_AddressHomePageURLType {
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.DateTime */
    ValidityStartDate: any;
    /** OData type: Edm.Boolean */
    IsDefaultURLAddress: boolean;
    /** OData type: Edm.String (maxLength: 50) */
    SearchURLAddress?: string;
    /** OData type: Edm.String (maxLength: 50) */
    AddressCommunicationRemarkText?: string;
    /** OData type: Edm.Int16 */
    URLFieldLength?: number;
    /** OData type: Edm.String (maxLength: 2048) */
    WebsiteURL?: string;
  }
  
  export interface CreateA_AddressHomePageURLTypeRequest {
    SearchURLAddress?: string;
    AddressCommunicationRemarkText?: string;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface UpdateA_AddressHomePageURLTypeRequest {
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    ValidityStartDate?: any;
    IsDefaultURLAddress?: boolean;
    SearchURLAddress?: string;
    AddressCommunicationRemarkText?: string;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface A_AddressPhoneNumberType {
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.String (maxLength: 3) */
    DestinationLocationCountry?: string;
    /** OData type: Edm.Boolean */
    IsDefaultPhoneNumber?: boolean;
    /** OData type: Edm.String (maxLength: 30) */
    PhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PhoneNumberType?: string;
    /** OData type: Edm.String (maxLength: 50) */
    AddressCommunicationRemarkText?: string;
  }
  
  export interface CreateA_AddressPhoneNumberTypeRequest {
    DestinationLocationCountry?: string;
    IsDefaultPhoneNumber?: boolean;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface UpdateA_AddressPhoneNumberTypeRequest {
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    DestinationLocationCountry?: string;
    IsDefaultPhoneNumber?: boolean;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
    AddressCommunicationRemarkText?: string;
  }
  
  export interface A_BPAddrDepdntIntlLocNumberType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 7) */
    InternationalLocationNumber1?: string;
    /** OData type: Edm.String (maxLength: 5) */
    InternationalLocationNumber2?: string;
    /** OData type: Edm.String (maxLength: 1) */
    InternationalLocationNumber3?: string;
  }
  
  export interface CreateA_BPAddrDepdntIntlLocNumberTypeRequest {
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
  }
  
  export interface UpdateA_BPAddrDepdntIntlLocNumberTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
  }
  
  export interface A_BPAddressIndependentEmailType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.String (maxLength: 241) */
    EmailAddress?: string;
    /** OData type: Edm.Boolean */
    IsDefaultEmailAddress?: boolean;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
  }
  
  export interface CreateA_BPAddressIndependentEmailTypeRequest {
    EmailAddress?: string;
    IsDefaultEmailAddress?: boolean;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface UpdateA_BPAddressIndependentEmailTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    EmailAddress?: string;
    IsDefaultEmailAddress?: boolean;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface A_BPAddressIndependentFaxType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.String (maxLength: 3) */
    FaxCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    FaxAreaCodeSubscriberNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    FaxNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalFaxNumber?: string;
    /** OData type: Edm.Boolean */
    IsDefaultFaxNumber?: boolean;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
  }
  
  export interface CreateA_BPAddressIndependentFaxTypeRequest {
    FaxCountry?: string;
    FaxAreaCodeSubscriberNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
    IsDefaultFaxNumber?: boolean;
    ValidityEndDate?: any;
    ValidityStartDate?: any;
  }
  
  export interface UpdateA_BPAddressIndependentFaxTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    FaxCountry?: string;
    FaxAreaCodeSubscriberNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
    IsDefaultFaxNumber?: boolean;
    ValidityEndDate?: any;
    ValidityStartDate?: any;
  }
  
  export interface A_BPAddressIndependentMobileType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalPhoneNumber?: string;
    /** OData type: Edm.Boolean */
    IsDefaultPhoneNumber?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    MobilePhoneCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    MobilePhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PhoneNumberType?: string;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
  }
  
  export interface CreateA_BPAddressIndependentMobileTypeRequest {
    InternationalPhoneNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    MobilePhoneCountry?: string;
    MobilePhoneNumber?: string;
    PhoneNumberExtension?: string;
    PhoneNumberType?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface UpdateA_BPAddressIndependentMobileTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    InternationalPhoneNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    MobilePhoneCountry?: string;
    MobilePhoneNumber?: string;
    PhoneNumberExtension?: string;
    PhoneNumberType?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface A_BPAddressIndependentPhoneType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.String (maxLength: 3) */
    DestinationLocationCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalPhoneNumber?: string;
    /** OData type: Edm.Boolean */
    IsDefaultPhoneNumber?: boolean;
    /** OData type: Edm.String (maxLength: 30) */
    PhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PhoneNumberType?: string;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
  }
  
  export interface CreateA_BPAddressIndependentPhoneTypeRequest {
    DestinationLocationCountry?: string;
    InternationalPhoneNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    PhoneNumberType?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface UpdateA_BPAddressIndependentPhoneTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    DestinationLocationCountry?: string;
    InternationalPhoneNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    PhoneNumberType?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
  }
  
  export interface A_BPAddressIndependentWebsiteType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultURLAddress?: boolean;
    /** OData type: Edm.Int32 */
    URLFieldLength?: number;
    /** OData type: Edm.String (maxLength: 2048) */
    WebsiteURL?: string;
  }
  
  export interface CreateA_BPAddressIndependentWebsiteTypeRequest {
    IsDefaultURLAddress?: boolean;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface UpdateA_BPAddressIndependentWebsiteTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    Person?: string;
    OrdinalNumber?: string;
    IsDefaultURLAddress?: boolean;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface A_BPContactPersonEmlAddrType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultEmailAddress?: boolean;
    /** OData type: Edm.String (maxLength: 241) */
    EmailAddress?: string;
    /** OData type: Edm.String (maxLength: 20) */
    SearchEmailAddress?: string;
  }
  
  export interface CreateA_BPContactPersonEmlAddrTypeRequest {
    IsDefaultEmailAddress?: boolean;
    EmailAddress?: string;
    SearchEmailAddress?: string;
  }
  
  export interface UpdateA_BPContactPersonEmlAddrTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    OrdinalNumber?: string;
    IsDefaultEmailAddress?: boolean;
    EmailAddress?: string;
    SearchEmailAddress?: string;
  }
  
  export interface A_BPContactPersonFaxNmbrType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultFaxNumber?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    FaxCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    FaxAreaCodeSubscriberNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    FaxNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalFaxNumber?: string;
  }
  
  export interface CreateA_BPContactPersonFaxNmbrTypeRequest {
    IsDefaultFaxNumber?: boolean;
    FaxCountry?: string;
    FaxAreaCodeSubscriberNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
  }
  
  export interface UpdateA_BPContactPersonFaxNmbrTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    OrdinalNumber?: string;
    IsDefaultFaxNumber?: boolean;
    FaxCountry?: string;
    FaxAreaCodeSubscriberNumber?: string;
    FaxNumberExtension?: string;
    InternationalFaxNumber?: string;
  }
  
  export interface A_BPContactPersonMblNmbrType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultPhoneNumber?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    DestinationLocationCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    MobilePhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PhoneNumberType?: string;
  }
  
  export interface CreateA_BPContactPersonMblNmbrTypeRequest {
    IsDefaultPhoneNumber?: boolean;
    DestinationLocationCountry?: string;
    MobilePhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
  }
  
  export interface UpdateA_BPContactPersonMblNmbrTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    OrdinalNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    DestinationLocationCountry?: string;
    MobilePhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
  }
  
  export interface A_BPContactPersonTelNmbrType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultPhoneNumber?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    DestinationLocationCountry?: string;
    /** OData type: Edm.String (maxLength: 30) */
    PhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    InternationalPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PhoneNumberType?: string;
  }
  
  export interface CreateA_BPContactPersonTelNmbrTypeRequest {
    IsDefaultPhoneNumber?: boolean;
    DestinationLocationCountry?: string;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
  }
  
  export interface UpdateA_BPContactPersonTelNmbrTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    OrdinalNumber?: string;
    IsDefaultPhoneNumber?: boolean;
    DestinationLocationCountry?: string;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    InternationalPhoneNumber?: string;
    PhoneNumberType?: string;
  }
  
  export interface A_BPContactPersonWbsteURLType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    OrdinalNumber: string;
    /** OData type: Edm.Boolean */
    IsDefaultURLAddress?: boolean;
    /** OData type: Edm.String (maxLength: 50) */
    SearchURLAddress?: string;
    /** OData type: Edm.Boolean */
    CommNumberIsNotUsed?: boolean;
    /** OData type: Edm.Int16 */
    URLFieldLength?: number;
    /** OData type: Edm.String (maxLength: 2048) */
    WebsiteURL?: string;
  }
  
  export interface CreateA_BPContactPersonWbsteURLTypeRequest {
    IsDefaultURLAddress?: boolean;
    SearchURLAddress?: string;
    CommNumberIsNotUsed?: boolean;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface UpdateA_BPContactPersonWbsteURLTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    OrdinalNumber?: string;
    IsDefaultURLAddress?: boolean;
    SearchURLAddress?: string;
    CommNumberIsNotUsed?: boolean;
    URLFieldLength?: number;
    WebsiteURL?: string;
  }
  
  export interface A_BPContactToAddressType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressNumber?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetPrefixName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetSuffixName?: string;
    /** OData type: Edm.String (maxLength: 6) */
    AddressTimeZone?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CareOfName?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CityCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CityName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CompanyPostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Country?: string;
    /** OData type: Edm.String (maxLength: 40) */
    County?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryServiceNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryServiceTypeCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    District?: string;
    /** OData type: Edm.String (maxLength: 4) */
    FormOfAddress?: string;
    /** OData type: Edm.String (maxLength: 80) */
    FullName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    HomeCityName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumberSupplementText?: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBox?: string;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxDeviatingCityName?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingCountry?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingRegion?: string;
    /** OData type: Edm.Boolean */
    POBoxIsWithoutNumber?: boolean;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxLobbyName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBoxPostalCode?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    PrfrdCommMediumType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Region?: string;
    /** OData type: Edm.String (maxLength: 60) */
    StreetName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetPrefixName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetSuffixName?: string;
    /** OData type: Edm.String (maxLength: 15) */
    TaxJurisdiction?: string;
    /** OData type: Edm.String (maxLength: 10) */
    TransportZone?: string;
    /** OData type: Edm.String (maxLength: 1) */
    AddressRepresentationCode?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ContactPersonBuilding?: string;
    /** OData type: Edm.String (maxLength: 3) */
    ContactPersonPrfrdCommMedium?: string;
    /** OData type: Edm.String (maxLength: 40) */
    ContactRelationshipDepartment?: string;
    /** OData type: Edm.String (maxLength: 40) */
    ContactRelationshipFunction?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CorrespondenceShortName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Floor?: string;
    /** OData type: Edm.String (maxLength: 10) */
    InhouseMail?: string;
    /** OData type: Edm.Boolean */
    IsDefaultAddress?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    RoomNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PersonNumber?: string;
  }
  
  export interface CreateA_BPContactToAddressTypeRequest {
    AddressNumber?: string;
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CompanyPostalCode?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    Person?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
    AddressRepresentationCode?: string;
    ContactPersonBuilding?: string;
    ContactPersonPrfrdCommMedium?: string;
    ContactRelationshipDepartment?: string;
    ContactRelationshipFunction?: string;
    CorrespondenceShortName?: string;
    Floor?: string;
    InhouseMail?: string;
    IsDefaultAddress?: boolean;
    RoomNumber?: string;
    PersonNumber?: string;
  }
  
  export interface UpdateA_BPContactToAddressTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    AddressID?: string;
    AddressNumber?: string;
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CompanyPostalCode?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    Person?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
    AddressRepresentationCode?: string;
    ContactPersonBuilding?: string;
    ContactPersonPrfrdCommMedium?: string;
    ContactRelationshipDepartment?: string;
    ContactRelationshipFunction?: string;
    CorrespondenceShortName?: string;
    Floor?: string;
    InhouseMail?: string;
    IsDefaultAddress?: boolean;
    RoomNumber?: string;
    PersonNumber?: string;
  }
  
  export interface A_BPContactToFuncAndDeptType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 1) */
    ContactPersonAuthorityType?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ContactPersonDepartment?: string;
    /** OData type: Edm.String (maxLength: 40) */
    ContactPersonDepartmentName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ContactPersonFunction?: string;
    /** OData type: Edm.String (maxLength: 40) */
    ContactPersonFunctionName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    ContactPersonRemarkText?: string;
    /** OData type: Edm.String (maxLength: 1) */
    ContactPersonVIPType?: string;
    /** OData type: Edm.String (maxLength: 241) */
    EmailAddress?: string;
    /** OData type: Edm.String (maxLength: 30) */
    FaxNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    FaxNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 30) */
    PhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PhoneNumberExtension?: string;
    /** OData type: Edm.String (maxLength: 6) */
    RelationshipCategory?: string;
  }
  
  export interface CreateA_BPContactToFuncAndDeptTypeRequest {
    ContactPersonAuthorityType?: string;
    ContactPersonDepartment?: string;
    ContactPersonDepartmentName?: string;
    ContactPersonFunction?: string;
    ContactPersonFunctionName?: string;
    ContactPersonRemarkText?: string;
    ContactPersonVIPType?: string;
    EmailAddress?: string;
    FaxNumber?: string;
    FaxNumberExtension?: string;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    RelationshipCategory?: string;
  }
  
  export interface UpdateA_BPContactToFuncAndDeptTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    ContactPersonAuthorityType?: string;
    ContactPersonDepartment?: string;
    ContactPersonDepartmentName?: string;
    ContactPersonFunction?: string;
    ContactPersonFunctionName?: string;
    ContactPersonRemarkText?: string;
    ContactPersonVIPType?: string;
    EmailAddress?: string;
    FaxNumber?: string;
    FaxNumberExtension?: string;
    PhoneNumber?: string;
    PhoneNumberExtension?: string;
    RelationshipCategory?: string;
  }
  
  export interface A_BPCreditWorthinessType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusPartCreditStanding?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPCreditStandingStatus?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CreditRatingAgency?: string;
    /** OData type: Edm.String (maxLength: 50) */
    BPCreditStandingComment?: string;
    /** OData type: Edm.DateTime */
    BPCreditStandingDate?: any;
    /** OData type: Edm.String (maxLength: 3) */
    BPCreditStandingRating?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPLegalProceedingStatus?: string;
    /** OData type: Edm.DateTime */
    BPLglProceedingInitiationDate?: any;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsUnderOath?: boolean;
    /** OData type: Edm.DateTime */
    BusinessPartnerOathDate?: any;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsBankrupt?: boolean;
    /** OData type: Edm.DateTime */
    BusinessPartnerBankruptcyDate?: any;
    /** OData type: Edm.Boolean */
    BPForeclosureIsInitiated?: boolean;
    /** OData type: Edm.DateTime */
    BPForeclosureDate?: any;
    /** OData type: Edm.String (maxLength: 1) */
    BPCrdtWrthnssAccessChkIsActive?: string;
  }
  
  export interface CreateA_BPCreditWorthinessTypeRequest {
    BusPartCreditStanding?: string;
    BPCreditStandingStatus?: string;
    CreditRatingAgency?: string;
    BPCreditStandingComment?: string;
    BPCreditStandingDate?: any;
    BPCreditStandingRating?: string;
    BPLegalProceedingStatus?: string;
    BPLglProceedingInitiationDate?: any;
    BusinessPartnerIsUnderOath?: boolean;
    BusinessPartnerOathDate?: any;
    BusinessPartnerIsBankrupt?: boolean;
    BusinessPartnerBankruptcyDate?: any;
    BPForeclosureIsInitiated?: boolean;
    BPForeclosureDate?: any;
    BPCrdtWrthnssAccessChkIsActive?: string;
  }
  
  export interface UpdateA_BPCreditWorthinessTypeRequest {
    BusinessPartner?: string;
    BusPartCreditStanding?: string;
    BPCreditStandingStatus?: string;
    CreditRatingAgency?: string;
    BPCreditStandingComment?: string;
    BPCreditStandingDate?: any;
    BPCreditStandingRating?: string;
    BPLegalProceedingStatus?: string;
    BPLglProceedingInitiationDate?: any;
    BusinessPartnerIsUnderOath?: boolean;
    BusinessPartnerOathDate?: any;
    BusinessPartnerIsBankrupt?: boolean;
    BusinessPartnerBankruptcyDate?: any;
    BPForeclosureIsInitiated?: boolean;
    BPForeclosureDate?: any;
    BPCrdtWrthnssAccessChkIsActive?: string;
  }
  
  export interface A_BPDataControllerType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 30) */
    DataController: string;
    /** OData type: Edm.String (maxLength: 30) */
    PurposeForPersonalData: string;
    /** OData type: Edm.String (maxLength: 1) */
    DataControlAssignmentStatus?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPDataControllerIsDerived?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PurposeDerived?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PurposeType?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPurposeFlag?: string;
  }
  
  export interface CreateA_BPDataControllerTypeRequest {
    DataControlAssignmentStatus?: string;
    BPDataControllerIsDerived?: string;
    PurposeDerived?: string;
    PurposeType?: string;
    BusinessPurposeFlag?: string;
  }
  
  export interface UpdateA_BPDataControllerTypeRequest {
    BusinessPartner?: string;
    DataController?: string;
    PurposeForPersonalData?: string;
    DataControlAssignmentStatus?: string;
    BPDataControllerIsDerived?: string;
    PurposeDerived?: string;
    PurposeType?: string;
    BusinessPurposeFlag?: string;
  }
  
  export interface A_BPEmploymentType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.DateTime */
    BPEmploymentStartDate: any;
    /** OData type: Edm.DateTime */
    BPEmploymentEndDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    BPEmploymentStatus?: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusPartEmplrIndstryCode?: string;
    /** OData type: Edm.String (maxLength: 35) */
    BusinessPartnerEmployerName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerOccupationGroup?: string;
  }
  
  export interface CreateA_BPEmploymentTypeRequest {
    BPEmploymentEndDate?: any;
    BPEmploymentStatus?: string;
    BusPartEmplrIndstryCode?: string;
    BusinessPartnerEmployerName?: string;
    BusinessPartnerOccupationGroup?: string;
  }
  
  export interface UpdateA_BPEmploymentTypeRequest {
    BusinessPartner?: string;
    BPEmploymentStartDate?: any;
    BPEmploymentEndDate?: any;
    BPEmploymentStatus?: string;
    BusPartEmplrIndstryCode?: string;
    BusinessPartnerEmployerName?: string;
    BusinessPartnerOccupationGroup?: string;
  }
  
  export interface A_BPFinancialServicesExtnType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsVIP?: boolean;
    /** OData type: Edm.String (maxLength: 6) */
    TradingPartner?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FactoryCalendar?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BusinessPartnerOfficeCountry?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BusinessPartnerOfficeRegion?: string;
    /** OData type: Edm.String (maxLength: 35) */
    BPRegisteredOfficeName?: string;
    /** OData type: Edm.String (maxLength: 5) */
    BPBalanceSheetCurrency?: string;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPLastCptlIncrAmtInBalShtCrcy?: number;
    /** OData type: Edm.String (maxLength: 4) */
    BPLastCapitalIncreaseYear?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPBalanceSheetDisplayType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BusinessPartnerCitizenship?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPMaritalPropertyRegime?: string;
    /** OData type: Edm.String (maxLength: 5) */
    BusinessPartnerIncomeCurrency?: string;
    /** OData type: Edm.Decimal (precision: 2) */
    BPNumberOfChildren?: number;
    /** OData type: Edm.Decimal (precision: 2) */
    BPNumberOfHouseholdMembers?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPAnnualNetIncAmtInIncomeCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPMonthlyNetIncAmtInIncomeCrcy?: number;
    /** OData type: Edm.String (maxLength: 4) */
    BPAnnualNetIncomeYear?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPMonthlyNetIncomeMonth?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BPMonthlyNetIncomeYear?: string;
    /** OData type: Edm.String (maxLength: 40) */
    BPPlaceOfDeathName?: string;
    /** OData type: Edm.Boolean */
    CustomerIsUnwanted?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    UndesirabilityReason?: string;
    /** OData type: Edm.String (maxLength: 35) */
    UndesirabilityComment?: string;
    /** OData type: Edm.DateTime */
    LastCustomerContactDate?: any;
    /** OData type: Edm.String (maxLength: 10) */
    BPGroupingCharacter?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPLetterSalutation?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerTargetGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerEmployeeGroup?: string;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsEmployee?: boolean;
    /** OData type: Edm.DateTime */
    BPTermnBusRelationsBankDate?: any;
  }
  
  export interface CreateA_BPFinancialServicesExtnTypeRequest {
    BusinessPartnerIsVIP?: boolean;
    TradingPartner?: string;
    FactoryCalendar?: string;
    BusinessPartnerOfficeCountry?: string;
    BusinessPartnerOfficeRegion?: string;
    BPRegisteredOfficeName?: string;
    BPBalanceSheetCurrency?: string;
    BPLastCptlIncrAmtInBalShtCrcy?: number;
    BPLastCapitalIncreaseYear?: string;
    BPBalanceSheetDisplayType?: string;
    BusinessPartnerCitizenship?: string;
    BPMaritalPropertyRegime?: string;
    BusinessPartnerIncomeCurrency?: string;
    BPNumberOfChildren?: number;
    BPNumberOfHouseholdMembers?: number;
    BPAnnualNetIncAmtInIncomeCrcy?: number;
    BPMonthlyNetIncAmtInIncomeCrcy?: number;
    BPAnnualNetIncomeYear?: string;
    BPMonthlyNetIncomeMonth?: string;
    BPMonthlyNetIncomeYear?: string;
    BPPlaceOfDeathName?: string;
    CustomerIsUnwanted?: boolean;
    UndesirabilityReason?: string;
    UndesirabilityComment?: string;
    LastCustomerContactDate?: any;
    BPGroupingCharacter?: string;
    BPLetterSalutation?: string;
    BusinessPartnerTargetGroup?: string;
    BusinessPartnerEmployeeGroup?: string;
    BusinessPartnerIsEmployee?: boolean;
    BPTermnBusRelationsBankDate?: any;
  }
  
  export interface UpdateA_BPFinancialServicesExtnTypeRequest {
    BusinessPartner?: string;
    BusinessPartnerIsVIP?: boolean;
    TradingPartner?: string;
    FactoryCalendar?: string;
    BusinessPartnerOfficeCountry?: string;
    BusinessPartnerOfficeRegion?: string;
    BPRegisteredOfficeName?: string;
    BPBalanceSheetCurrency?: string;
    BPLastCptlIncrAmtInBalShtCrcy?: number;
    BPLastCapitalIncreaseYear?: string;
    BPBalanceSheetDisplayType?: string;
    BusinessPartnerCitizenship?: string;
    BPMaritalPropertyRegime?: string;
    BusinessPartnerIncomeCurrency?: string;
    BPNumberOfChildren?: number;
    BPNumberOfHouseholdMembers?: number;
    BPAnnualNetIncAmtInIncomeCrcy?: number;
    BPMonthlyNetIncAmtInIncomeCrcy?: number;
    BPAnnualNetIncomeYear?: string;
    BPMonthlyNetIncomeMonth?: string;
    BPMonthlyNetIncomeYear?: string;
    BPPlaceOfDeathName?: string;
    CustomerIsUnwanted?: boolean;
    UndesirabilityReason?: string;
    UndesirabilityComment?: string;
    LastCustomerContactDate?: any;
    BPGroupingCharacter?: string;
    BPLetterSalutation?: string;
    BusinessPartnerTargetGroup?: string;
    BusinessPartnerEmployeeGroup?: string;
    BusinessPartnerIsEmployee?: boolean;
    BPTermnBusRelationsBankDate?: any;
  }
  
  export interface A_BPFinancialServicesReportingType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.Boolean */
    BPIsNonResident?: boolean;
    /** OData type: Edm.DateTime */
    BPNonResidencyStartDate?: any;
    /** OData type: Edm.Boolean */
    BPIsMultimillionLoanRecipient?: boolean;
    /** OData type: Edm.String (maxLength: 8) */
    BPLoanReportingBorrowerNumber?: string;
    /** OData type: Edm.String (maxLength: 8) */
    BPLoanRptgBorrowerEntityNumber?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPCreditStandingReview?: string;
    /** OData type: Edm.DateTime */
    BPCreditStandingReviewDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    BusinessPartnerLoanToManager?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPCompanyRelationship?: string;
    /** OData type: Edm.String (maxLength: 8) */
    BPLoanReportingCreditorNumber?: string;
    /** OData type: Edm.String (maxLength: 11) */
    BPOeNBIdentNumber?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BPOeNBTargetGroup?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPOeNBIdentNumberAssigned?: string;
    /** OData type: Edm.String (maxLength: 7) */
    BPOeNBInstituteNumber?: string;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsOeNBInstitute?: boolean;
    /** OData type: Edm.String (maxLength: 15) */
    BusinessPartnerGroup?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPGroupAssignmentCategory?: string;
    /** OData type: Edm.String (maxLength: 50) */
    BusinessPartnerGroupName?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BusinessPartnerLegalEntity?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPGerAstRglnRestrictedAstQuota?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPartnerDebtorGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BusinessPartnerBusinessPurpose?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPartnerRiskGroup?: string;
    /** OData type: Edm.DateTime */
    BPRiskGroupingDate?: any;
    /** OData type: Edm.Boolean */
    BPHasGroupAffiliation?: boolean;
    /** OData type: Edm.Boolean */
    BPIsMonetaryFinInstitution?: boolean;
    /** OData type: Edm.Boolean */
    BPCrdtStandingReviewIsRequired?: boolean;
    /** OData type: Edm.Boolean */
    BPLoanMonitoringIsRequired?: boolean;
    /** OData type: Edm.Boolean */
    BPHasCreditingRelief?: boolean;
    /** OData type: Edm.Boolean */
    BPInvestInRstrcdAstIsAuthzd?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    BPCentralBankCountryRegion?: string;
  }
  
  export interface CreateA_BPFinancialServicesReportingTypeRequest {
    BPIsNonResident?: boolean;
    BPNonResidencyStartDate?: any;
    BPIsMultimillionLoanRecipient?: boolean;
    BPLoanReportingBorrowerNumber?: string;
    BPLoanRptgBorrowerEntityNumber?: string;
    BPCreditStandingReview?: string;
    BPCreditStandingReviewDate?: any;
    BusinessPartnerLoanToManager?: string;
    BPCompanyRelationship?: string;
    BPLoanReportingCreditorNumber?: string;
    BPOeNBIdentNumber?: string;
    BPOeNBTargetGroup?: string;
    BPOeNBIdentNumberAssigned?: string;
    BPOeNBInstituteNumber?: string;
    BusinessPartnerIsOeNBInstitute?: boolean;
    BusinessPartnerGroup?: string;
    BPGroupAssignmentCategory?: string;
    BusinessPartnerGroupName?: string;
    BusinessPartnerLegalEntity?: string;
    BPGerAstRglnRestrictedAstQuota?: string;
    BusinessPartnerDebtorGroup?: string;
    BusinessPartnerBusinessPurpose?: string;
    BusinessPartnerRiskGroup?: string;
    BPRiskGroupingDate?: any;
    BPHasGroupAffiliation?: boolean;
    BPIsMonetaryFinInstitution?: boolean;
    BPCrdtStandingReviewIsRequired?: boolean;
    BPLoanMonitoringIsRequired?: boolean;
    BPHasCreditingRelief?: boolean;
    BPInvestInRstrcdAstIsAuthzd?: boolean;
    BPCentralBankCountryRegion?: string;
  }
  
  export interface UpdateA_BPFinancialServicesReportingTypeRequest {
    BusinessPartner?: string;
    BPIsNonResident?: boolean;
    BPNonResidencyStartDate?: any;
    BPIsMultimillionLoanRecipient?: boolean;
    BPLoanReportingBorrowerNumber?: string;
    BPLoanRptgBorrowerEntityNumber?: string;
    BPCreditStandingReview?: string;
    BPCreditStandingReviewDate?: any;
    BusinessPartnerLoanToManager?: string;
    BPCompanyRelationship?: string;
    BPLoanReportingCreditorNumber?: string;
    BPOeNBIdentNumber?: string;
    BPOeNBTargetGroup?: string;
    BPOeNBIdentNumberAssigned?: string;
    BPOeNBInstituteNumber?: string;
    BusinessPartnerIsOeNBInstitute?: boolean;
    BusinessPartnerGroup?: string;
    BPGroupAssignmentCategory?: string;
    BusinessPartnerGroupName?: string;
    BusinessPartnerLegalEntity?: string;
    BPGerAstRglnRestrictedAstQuota?: string;
    BusinessPartnerDebtorGroup?: string;
    BusinessPartnerBusinessPurpose?: string;
    BusinessPartnerRiskGroup?: string;
    BPRiskGroupingDate?: any;
    BPHasGroupAffiliation?: boolean;
    BPIsMonetaryFinInstitution?: boolean;
    BPCrdtStandingReviewIsRequired?: boolean;
    BPLoanMonitoringIsRequired?: boolean;
    BPHasCreditingRelief?: boolean;
    BPInvestInRstrcdAstIsAuthzd?: boolean;
    BPCentralBankCountryRegion?: string;
  }
  
  export interface A_BPFiscalYearInformationType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerFiscalYear: string;
    /** OData type: Edm.String (maxLength: 5) */
    BPBalanceSheetCurrency?: string;
    /** OData type: Edm.DateTime */
    BPAnnualStockholderMeetingDate?: any;
    /** OData type: Edm.DateTime */
    BPFiscalYearStartDate?: any;
    /** OData type: Edm.DateTime */
    BPFiscalYearEndDate?: any;
    /** OData type: Edm.Boolean */
    BPFiscalYearIsClosed?: boolean;
    /** OData type: Edm.DateTime */
    BPFiscalYearClosingDate?: any;
    /** OData type: Edm.DateTime */
    BPFsclYrCnsldtdFinStatementDte?: any;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPCapitalStockAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPIssdStockCptlAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPPartcipnCertAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPEquityCapitalAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPGrossPremiumAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPNetPremiumAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPAnnualSalesAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPAnnualNetIncAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPDividendDistrAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 6, scale: 3) */
    BPDebtRatioInYears?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPAnnualPnLAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPBalSheetTotalAmtInBalShtCrcy?: number;
    /** OData type: Edm.String (maxLength: 7) */
    BPNumberOfEmployees?: string;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPCptlReserveAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPLglRevnRsrvAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    RevnRsrvOwnStkAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPStatryReserveAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPOthRevnRsrvAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPPnLCarryfwdAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    BPSuborddLbltyAmtInBalShtCrcy?: number;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    BPRetOnTotalCptlEmpldInPercent?: number;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    BPDebtClearancePeriodInYears?: number;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    BPFinancingCoeffInPercent?: number;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    BPEquityRatioInPercent?: number;
  }
  
  export interface CreateA_BPFiscalYearInformationTypeRequest {
    BPBalanceSheetCurrency?: string;
    BPAnnualStockholderMeetingDate?: any;
    BPFiscalYearStartDate?: any;
    BPFiscalYearEndDate?: any;
    BPFiscalYearIsClosed?: boolean;
    BPFiscalYearClosingDate?: any;
    BPFsclYrCnsldtdFinStatementDte?: any;
    BPCapitalStockAmtInBalShtCrcy?: number;
    BPIssdStockCptlAmtInBalShtCrcy?: number;
    BPPartcipnCertAmtInBalShtCrcy?: number;
    BPEquityCapitalAmtInBalShtCrcy?: number;
    BPGrossPremiumAmtInBalShtCrcy?: number;
    BPNetPremiumAmtInBalShtCrcy?: number;
    BPAnnualSalesAmtInBalShtCrcy?: number;
    BPAnnualNetIncAmtInBalShtCrcy?: number;
    BPDividendDistrAmtInBalShtCrcy?: number;
    BPDebtRatioInYears?: number;
    BPAnnualPnLAmtInBalShtCrcy?: number;
    BPBalSheetTotalAmtInBalShtCrcy?: number;
    BPNumberOfEmployees?: string;
    BPCptlReserveAmtInBalShtCrcy?: number;
    BPLglRevnRsrvAmtInBalShtCrcy?: number;
    RevnRsrvOwnStkAmtInBalShtCrcy?: number;
    BPStatryReserveAmtInBalShtCrcy?: number;
    BPOthRevnRsrvAmtInBalShtCrcy?: number;
    BPPnLCarryfwdAmtInBalShtCrcy?: number;
    BPSuborddLbltyAmtInBalShtCrcy?: number;
    BPRetOnTotalCptlEmpldInPercent?: number;
    BPDebtClearancePeriodInYears?: number;
    BPFinancingCoeffInPercent?: number;
    BPEquityRatioInPercent?: number;
  }
  
  export interface UpdateA_BPFiscalYearInformationTypeRequest {
    BusinessPartner?: string;
    BusinessPartnerFiscalYear?: string;
    BPBalanceSheetCurrency?: string;
    BPAnnualStockholderMeetingDate?: any;
    BPFiscalYearStartDate?: any;
    BPFiscalYearEndDate?: any;
    BPFiscalYearIsClosed?: boolean;
    BPFiscalYearClosingDate?: any;
    BPFsclYrCnsldtdFinStatementDte?: any;
    BPCapitalStockAmtInBalShtCrcy?: number;
    BPIssdStockCptlAmtInBalShtCrcy?: number;
    BPPartcipnCertAmtInBalShtCrcy?: number;
    BPEquityCapitalAmtInBalShtCrcy?: number;
    BPGrossPremiumAmtInBalShtCrcy?: number;
    BPNetPremiumAmtInBalShtCrcy?: number;
    BPAnnualSalesAmtInBalShtCrcy?: number;
    BPAnnualNetIncAmtInBalShtCrcy?: number;
    BPDividendDistrAmtInBalShtCrcy?: number;
    BPDebtRatioInYears?: number;
    BPAnnualPnLAmtInBalShtCrcy?: number;
    BPBalSheetTotalAmtInBalShtCrcy?: number;
    BPNumberOfEmployees?: string;
    BPCptlReserveAmtInBalShtCrcy?: number;
    BPLglRevnRsrvAmtInBalShtCrcy?: number;
    RevnRsrvOwnStkAmtInBalShtCrcy?: number;
    BPStatryReserveAmtInBalShtCrcy?: number;
    BPOthRevnRsrvAmtInBalShtCrcy?: number;
    BPPnLCarryfwdAmtInBalShtCrcy?: number;
    BPSuborddLbltyAmtInBalShtCrcy?: number;
    BPRetOnTotalCptlEmpldInPercent?: number;
    BPDebtClearancePeriodInYears?: number;
    BPFinancingCoeffInPercent?: number;
    BPEquityRatioInPercent?: number;
  }
  
  export interface A_BPIntlAddressVersionType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 1) */
    AddressRepresentationCode: string;
    /** OData type: Edm.String (maxLength: 80) */
    AddresseeFullName?: string;
    /** OData type: Edm.String (maxLength: 20) */
    AddressIDByExternalSystem?: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressPersonID?: string;
    /** OData type: Edm.String (maxLength: 20) */
    AddressSearchTerm1?: string;
    /** OData type: Edm.String (maxLength: 20) */
    AddressSearchTerm2?: string;
    /** OData type: Edm.String (maxLength: 6) */
    AddressTimeZone?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CareOfName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CityName?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CityNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CompanyPostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Country?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryServiceNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryServiceTypeCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    DistrictName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    FormOfAddress?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumberSupplementText?: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationName1?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationName2?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationName3?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationName4?: string;
    /** OData type: Edm.String (maxLength: 40) */
    PersonFamilyName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    PersonGivenName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBox?: string;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxDeviatingCityName?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingCountry?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingRegion?: string;
    /** OData type: Edm.Boolean */
    POBoxIsWithoutNumber?: boolean;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxLobbyName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBoxPostalCode?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    PrfrdCommMediumType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Region?: string;
    /** OData type: Edm.String (maxLength: 8) */
    SecondaryRegion?: string;
    /** OData type: Edm.String (maxLength: 40) */
    SecondaryRegionName?: string;
    /** OData type: Edm.String (maxLength: 60) */
    StreetName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetPrefixName1?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetPrefixName2?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetSuffixName1?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetSuffixName2?: string;
    /** OData type: Edm.String (maxLength: 15) */
    TaxJurisdiction?: string;
    /** OData type: Edm.String (maxLength: 8) */
    TertiaryRegion?: string;
    /** OData type: Edm.String (maxLength: 40) */
    TertiaryRegionName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    TransportZone?: string;
    /** OData type: Edm.String (maxLength: 40) */
    VillageName?: string;
  }
  
  export interface CreateA_BPIntlAddressVersionTypeRequest {
    AddresseeFullName?: string;
    AddressIDByExternalSystem?: string;
    AddressPersonID?: string;
    AddressSearchTerm1?: string;
    AddressSearchTerm2?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityName?: string;
    CityNumber?: string;
    CompanyPostalCode?: string;
    Country?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    DistrictName?: string;
    FormOfAddress?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    OrganizationName1?: string;
    OrganizationName2?: string;
    OrganizationName3?: string;
    OrganizationName4?: string;
    PersonFamilyName?: string;
    PersonGivenName?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    SecondaryRegion?: string;
    SecondaryRegionName?: string;
    StreetName?: string;
    StreetPrefixName1?: string;
    StreetPrefixName2?: string;
    StreetSuffixName1?: string;
    StreetSuffixName2?: string;
    TaxJurisdiction?: string;
    TertiaryRegion?: string;
    TertiaryRegionName?: string;
    TransportZone?: string;
    VillageName?: string;
  }
  
  export interface UpdateA_BPIntlAddressVersionTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    AddressRepresentationCode?: string;
    AddresseeFullName?: string;
    AddressIDByExternalSystem?: string;
    AddressPersonID?: string;
    AddressSearchTerm1?: string;
    AddressSearchTerm2?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityName?: string;
    CityNumber?: string;
    CompanyPostalCode?: string;
    Country?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    DistrictName?: string;
    FormOfAddress?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    OrganizationName1?: string;
    OrganizationName2?: string;
    OrganizationName3?: string;
    OrganizationName4?: string;
    PersonFamilyName?: string;
    PersonGivenName?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    SecondaryRegion?: string;
    SecondaryRegionName?: string;
    StreetName?: string;
    StreetPrefixName1?: string;
    StreetPrefixName2?: string;
    StreetSuffixName1?: string;
    StreetSuffixName2?: string;
    TaxJurisdiction?: string;
    TertiaryRegion?: string;
    TertiaryRegionName?: string;
    TransportZone?: string;
    VillageName?: string;
  }
  
  export interface A_BPRelationshipType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner1: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner2: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.Boolean */
    IsStandardRelationship?: boolean;
    /** OData type: Edm.String (maxLength: 6) */
    RelationshipCategory?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BPRelationshipType?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime */
    CreationDate?: any;
    /** OData type: Edm.Time */
    CreationTime?: any;
    /** OData type: Edm.String (maxLength: 12) */
    LastChangedByUser?: string;
    /** OData type: Edm.DateTime */
    LastChangeDate?: any;
    /** OData type: Edm.Time */
    LastChangeTime?: any;
  }
  
  export interface CreateA_BPRelationshipTypeRequest {
    ValidityStartDate?: any;
    IsStandardRelationship?: boolean;
    RelationshipCategory?: string;
    BPRelationshipType?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    LastChangedByUser?: string;
    LastChangeDate?: any;
    LastChangeTime?: any;
  }
  
  export interface UpdateA_BPRelationshipTypeRequest {
    RelationshipNumber?: string;
    BusinessPartner1?: string;
    BusinessPartner2?: string;
    ValidityEndDate?: any;
    ValidityStartDate?: any;
    IsStandardRelationship?: boolean;
    RelationshipCategory?: string;
    BPRelationshipType?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    LastChangedByUser?: string;
    LastChangeDate?: any;
    LastChangeTime?: any;
  }
  
  export interface A_BuPaAddressUsageType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityEndDate: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressUsage: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityStartDate?: string;
    /** OData type: Edm.Boolean */
    StandardUsage?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BuPaAddressUsageTypeRequest {
    ValidityStartDate?: string;
    StandardUsage?: boolean;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BuPaAddressUsageTypeRequest {
    BusinessPartner?: string;
    ValidityEndDate?: string;
    AddressUsage?: string;
    AddressID?: string;
    ValidityStartDate?: string;
    StandardUsage?: boolean;
    AuthorizationGroup?: string;
  }
  
  export interface A_BuPaIdentificationType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 6) */
    BPIdentificationType: string;
    /** OData type: Edm.String (maxLength: 60) */
    BPIdentificationNumber: string;
    /** OData type: Edm.String (maxLength: 40) */
    BPIdnNmbrIssuingInstitute?: string;
    /** OData type: Edm.DateTime */
    BPIdentificationEntryDate?: any;
    /** OData type: Edm.String (maxLength: 3) */
    Country?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Region?: string;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BuPaIdentificationTypeRequest {
    BPIdnNmbrIssuingInstitute?: string;
    BPIdentificationEntryDate?: any;
    Country?: string;
    Region?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BuPaIdentificationTypeRequest {
    BusinessPartner?: string;
    BPIdentificationType?: string;
    BPIdentificationNumber?: string;
    BPIdnNmbrIssuingInstitute?: string;
    BPIdentificationEntryDate?: any;
    Country?: string;
    Region?: string;
    ValidityStartDate?: any;
    ValidityEndDate?: any;
    AuthorizationGroup?: string;
  }
  
  export interface A_BuPaIndustryType {
    /** OData type: Edm.String (maxLength: 10) */
    IndustrySector: string;
    /** OData type: Edm.String (maxLength: 4) */
    IndustrySystemType: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 1) */
    IsStandardIndustry?: string;
    /** OData type: Edm.String (maxLength: 100) */
    IndustryKeyDescription?: string;
  }
  
  export interface CreateA_BuPaIndustryTypeRequest {
    IsStandardIndustry?: string;
    IndustryKeyDescription?: string;
  }
  
  export interface UpdateA_BuPaIndustryTypeRequest {
    IndustrySector?: string;
    IndustrySystemType?: string;
    BusinessPartner?: string;
    IsStandardIndustry?: string;
    IndustryKeyDescription?: string;
  }
  
  export interface A_BusinessPartnerType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    Customer?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Supplier?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AcademicTitle?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPartnerCategory?: string;
    /** OData type: Edm.String (maxLength: 81) */
    BusinessPartnerFullName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerGrouping?: string;
    /** OData type: Edm.String (maxLength: 81) */
    BusinessPartnerName?: string;
    /** OData type: Edm.Guid */
    BusinessPartnerUUID?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CorrespondenceLanguage?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime */
    CreationDate?: any;
    /** OData type: Edm.Time */
    CreationTime?: any;
    /** OData type: Edm.String (maxLength: 40) */
    FirstName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    FormOfAddress?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Industry?: string;
    /** OData type: Edm.String (maxLength: 7) */
    InternationalLocationNumber1?: string;
    /** OData type: Edm.String (maxLength: 5) */
    InternationalLocationNumber2?: string;
    /** OData type: Edm.Boolean */
    IsFemale?: boolean;
    /** OData type: Edm.Boolean */
    IsMale?: boolean;
    /** OData type: Edm.String (maxLength: 1) */
    IsNaturalPerson?: string;
    /** OData type: Edm.Boolean */
    IsSexUnknown?: boolean;
    /** OData type: Edm.String (maxLength: 1) */
    GenderCodeName?: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language?: string;
    /** OData type: Edm.DateTime */
    LastChangeDate?: any;
    /** OData type: Edm.Time */
    LastChangeTime?: any;
    /** OData type: Edm.String (maxLength: 12) */
    LastChangedByUser?: string;
    /** OData type: Edm.String (maxLength: 40) */
    LastName?: string;
    /** OData type: Edm.String (maxLength: 2) */
    LegalForm?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationBPName1?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationBPName2?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationBPName3?: string;
    /** OData type: Edm.String (maxLength: 40) */
    OrganizationBPName4?: string;
    /** OData type: Edm.DateTime */
    OrganizationFoundationDate?: any;
    /** OData type: Edm.DateTime */
    OrganizationLiquidationDate?: any;
    /** OData type: Edm.String (maxLength: 20) */
    SearchTerm1?: string;
    /** OData type: Edm.String (maxLength: 20) */
    SearchTerm2?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalLastName?: string;
    /** OData type: Edm.DateTime */
    BirthDate?: any;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPartnerBirthDateStatus?: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerBirthplaceName?: string;
    /** OData type: Edm.DateTime */
    BusinessPartnerDeathDate?: any;
    /** OData type: Edm.Boolean */
    BusinessPartnerIsBlocked?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerType?: string;
    /** OData type: Edm.String (maxLength: 26) */
    ETag?: string;
    /** OData type: Edm.String (maxLength: 40) */
    GroupBusinessPartnerName1?: string;
    /** OData type: Edm.String (maxLength: 40) */
    GroupBusinessPartnerName2?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndependentAddressID?: string;
    /** OData type: Edm.String (maxLength: 1) */
    InternationalLocationNumber3?: string;
    /** OData type: Edm.String (maxLength: 40) */
    MiddleName?: string;
    /** OData type: Edm.String (maxLength: 3) */
    NameCountry?: string;
    /** OData type: Edm.String (maxLength: 2) */
    NameFormat?: string;
    /** OData type: Edm.String (maxLength: 80) */
    PersonFullName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PersonNumber?: string;
    /** OData type: Edm.Boolean */
    IsMarkedForArchiving?: boolean;
    /** OData type: Edm.String (maxLength: 20) */
    BusinessPartnerIDByExtSystem?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusinessPartnerPrintFormat?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerOccupation?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BusPartMaritalStatus?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BusPartNationality?: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerBirthName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    BusinessPartnerSupplementName?: string;
    /** OData type: Edm.String (maxLength: 35) */
    NaturalPersonEmployerName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    LastNamePrefix?: string;
    /** OData type: Edm.String (maxLength: 4) */
    LastNameSecondPrefix?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Initials?: string;
    /** OData type: Edm.Boolean */
    BPDataControllerIsNotRequired?: boolean;
    /** OData type: Edm.String (maxLength: 6) */
    TradingPartner?: string;
  }
  
  export interface CreateA_BusinessPartnerTypeRequest {
    Customer?: string;
    Supplier?: string;
    AcademicTitle?: string;
    AuthorizationGroup?: string;
    BusinessPartnerCategory?: string;
    BusinessPartnerFullName?: string;
    BusinessPartnerGrouping?: string;
    BusinessPartnerName?: string;
    BusinessPartnerUUID?: string;
    CorrespondenceLanguage?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    FirstName?: string;
    FormOfAddress?: string;
    Industry?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    IsFemale?: boolean;
    IsMale?: boolean;
    IsNaturalPerson?: string;
    IsSexUnknown?: boolean;
    GenderCodeName?: string;
    Language?: string;
    LastChangeDate?: any;
    LastChangeTime?: any;
    LastChangedByUser?: string;
    LastName?: string;
    LegalForm?: string;
    OrganizationBPName1?: string;
    OrganizationBPName2?: string;
    OrganizationBPName3?: string;
    OrganizationBPName4?: string;
    OrganizationFoundationDate?: any;
    OrganizationLiquidationDate?: any;
    SearchTerm1?: string;
    SearchTerm2?: string;
    AdditionalLastName?: string;
    BirthDate?: any;
    BusinessPartnerBirthDateStatus?: string;
    BusinessPartnerBirthplaceName?: string;
    BusinessPartnerDeathDate?: any;
    BusinessPartnerIsBlocked?: boolean;
    BusinessPartnerType?: string;
    ETag?: string;
    GroupBusinessPartnerName1?: string;
    GroupBusinessPartnerName2?: string;
    IndependentAddressID?: string;
    InternationalLocationNumber3?: string;
    MiddleName?: string;
    NameCountry?: string;
    NameFormat?: string;
    PersonFullName?: string;
    PersonNumber?: string;
    IsMarkedForArchiving?: boolean;
    BusinessPartnerIDByExtSystem?: string;
    BusinessPartnerPrintFormat?: string;
    BusinessPartnerOccupation?: string;
    BusPartMaritalStatus?: string;
    BusPartNationality?: string;
    BusinessPartnerBirthName?: string;
    BusinessPartnerSupplementName?: string;
    NaturalPersonEmployerName?: string;
    LastNamePrefix?: string;
    LastNameSecondPrefix?: string;
    Initials?: string;
    BPDataControllerIsNotRequired?: boolean;
    TradingPartner?: string;
  }
  
  export interface UpdateA_BusinessPartnerTypeRequest {
    BusinessPartner?: string;
    Customer?: string;
    Supplier?: string;
    AcademicTitle?: string;
    AuthorizationGroup?: string;
    BusinessPartnerCategory?: string;
    BusinessPartnerFullName?: string;
    BusinessPartnerGrouping?: string;
    BusinessPartnerName?: string;
    BusinessPartnerUUID?: string;
    CorrespondenceLanguage?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CreationTime?: any;
    FirstName?: string;
    FormOfAddress?: string;
    Industry?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    IsFemale?: boolean;
    IsMale?: boolean;
    IsNaturalPerson?: string;
    IsSexUnknown?: boolean;
    GenderCodeName?: string;
    Language?: string;
    LastChangeDate?: any;
    LastChangeTime?: any;
    LastChangedByUser?: string;
    LastName?: string;
    LegalForm?: string;
    OrganizationBPName1?: string;
    OrganizationBPName2?: string;
    OrganizationBPName3?: string;
    OrganizationBPName4?: string;
    OrganizationFoundationDate?: any;
    OrganizationLiquidationDate?: any;
    SearchTerm1?: string;
    SearchTerm2?: string;
    AdditionalLastName?: string;
    BirthDate?: any;
    BusinessPartnerBirthDateStatus?: string;
    BusinessPartnerBirthplaceName?: string;
    BusinessPartnerDeathDate?: any;
    BusinessPartnerIsBlocked?: boolean;
    BusinessPartnerType?: string;
    ETag?: string;
    GroupBusinessPartnerName1?: string;
    GroupBusinessPartnerName2?: string;
    IndependentAddressID?: string;
    InternationalLocationNumber3?: string;
    MiddleName?: string;
    NameCountry?: string;
    NameFormat?: string;
    PersonFullName?: string;
    PersonNumber?: string;
    IsMarkedForArchiving?: boolean;
    BusinessPartnerIDByExtSystem?: string;
    BusinessPartnerPrintFormat?: string;
    BusinessPartnerOccupation?: string;
    BusPartMaritalStatus?: string;
    BusPartNationality?: string;
    BusinessPartnerBirthName?: string;
    BusinessPartnerSupplementName?: string;
    NaturalPersonEmployerName?: string;
    LastNamePrefix?: string;
    LastNameSecondPrefix?: string;
    Initials?: string;
    BPDataControllerIsNotRequired?: boolean;
    TradingPartner?: string;
  }
  
  export interface A_BusinessPartnerAddressType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityStartDate?: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityEndDate?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.Guid */
    AddressUUID?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetPrefixName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    AdditionalStreetSuffixName?: string;
    /** OData type: Edm.String (maxLength: 6) */
    AddressTimeZone?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CareOfName?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CityCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CityName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CompanyPostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Country?: string;
    /** OData type: Edm.String (maxLength: 40) */
    County?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DeliveryServiceNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DeliveryServiceTypeCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    District?: string;
    /** OData type: Edm.String (maxLength: 4) */
    FormOfAddress?: string;
    /** OData type: Edm.String (maxLength: 80) */
    FullName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    HomeCityName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    HouseNumberSupplementText?: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBox?: string;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxDeviatingCityName?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingCountry?: string;
    /** OData type: Edm.String (maxLength: 3) */
    POBoxDeviatingRegion?: string;
    /** OData type: Edm.Boolean */
    POBoxIsWithoutNumber?: boolean;
    /** OData type: Edm.String (maxLength: 40) */
    POBoxLobbyName?: string;
    /** OData type: Edm.String (maxLength: 10) */
    POBoxPostalCode?: string;
    /** OData type: Edm.String (maxLength: 10) */
    Person?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PostalCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    PrfrdCommMediumType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    Region?: string;
    /** OData type: Edm.String (maxLength: 60) */
    StreetName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetPrefixName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    StreetSuffixName?: string;
    /** OData type: Edm.String (maxLength: 15) */
    TaxJurisdiction?: string;
    /** OData type: Edm.String (maxLength: 10) */
    TransportZone?: string;
    /** OData type: Edm.String (maxLength: 20) */
    AddressIDByExternalSystem?: string;
    /** OData type: Edm.String (maxLength: 8) */
    CountyCode?: string;
    /** OData type: Edm.String (maxLength: 8) */
    TownshipCode?: string;
    /** OData type: Edm.String (maxLength: 40) */
    TownshipName?: string;
  }
  
  export interface CreateA_BusinessPartnerAddressTypeRequest {
    ValidityStartDate?: string;
    ValidityEndDate?: string;
    AuthorizationGroup?: string;
    AddressUUID?: string;
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CompanyPostalCode?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    Person?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
    AddressIDByExternalSystem?: string;
    CountyCode?: string;
    TownshipCode?: string;
    TownshipName?: string;
  }
  
  export interface UpdateA_BusinessPartnerAddressTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    ValidityStartDate?: string;
    ValidityEndDate?: string;
    AuthorizationGroup?: string;
    AddressUUID?: string;
    AdditionalStreetPrefixName?: string;
    AdditionalStreetSuffixName?: string;
    AddressTimeZone?: string;
    CareOfName?: string;
    CityCode?: string;
    CityName?: string;
    CompanyPostalCode?: string;
    Country?: string;
    County?: string;
    DeliveryServiceNumber?: string;
    DeliveryServiceTypeCode?: string;
    District?: string;
    FormOfAddress?: string;
    FullName?: string;
    HomeCityName?: string;
    HouseNumber?: string;
    HouseNumberSupplementText?: string;
    Language?: string;
    POBox?: string;
    POBoxDeviatingCityName?: string;
    POBoxDeviatingCountry?: string;
    POBoxDeviatingRegion?: string;
    POBoxIsWithoutNumber?: boolean;
    POBoxLobbyName?: string;
    POBoxPostalCode?: string;
    Person?: string;
    PostalCode?: string;
    PrfrdCommMediumType?: string;
    Region?: string;
    StreetName?: string;
    StreetPrefixName?: string;
    StreetSuffixName?: string;
    TaxJurisdiction?: string;
    TransportZone?: string;
    AddressIDByExternalSystem?: string;
    CountyCode?: string;
    TownshipCode?: string;
    TownshipName?: string;
  }
  
  export interface A_BusinessPartnerAliasType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 3) */
    BPAliasPositionNumber: string;
    /** OData type: Edm.String (maxLength: 80) */
    BusinessPartnerAliasName?: string;
  }
  
  export interface CreateA_BusinessPartnerAliasTypeRequest {
    BusinessPartnerAliasName?: string;
  }
  
  export interface UpdateA_BusinessPartnerAliasTypeRequest {
    BusinessPartner?: string;
    BPAliasPositionNumber?: string;
    BusinessPartnerAliasName?: string;
  }
  
  export interface A_BusinessPartnerBankType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 4) */
    BankIdentification: string;
    /** OData type: Edm.String (maxLength: 3) */
    BankCountryKey?: string;
    /** OData type: Edm.String (maxLength: 60) */
    BankName?: string;
    /** OData type: Edm.String (maxLength: 15) */
    BankNumber?: string;
    /** OData type: Edm.String (maxLength: 11) */
    SWIFTCode?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BankControlKey?: string;
    /** OData type: Edm.String (maxLength: 60) */
    BankAccountHolderName?: string;
    /** OData type: Edm.String (maxLength: 40) */
    BankAccountName?: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityStartDate?: string;
    /** OData type: Edm.DateTimeOffset */
    ValidityEndDate?: string;
    /** OData type: Edm.String (maxLength: 34) */
    IBAN?: string;
    /** OData type: Edm.DateTime */
    IBANValidityStartDate?: any;
    /** OData type: Edm.String (maxLength: 18) */
    BankAccount?: string;
    /** OData type: Edm.String (maxLength: 20) */
    BankAccountReferenceText?: string;
    /** OData type: Edm.Boolean */
    CollectionAuthInd?: boolean;
    /** OData type: Edm.String (maxLength: 35) */
    CityName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BusinessPartnerBankTypeRequest {
    BankCountryKey?: string;
    BankName?: string;
    BankNumber?: string;
    SWIFTCode?: string;
    BankControlKey?: string;
    BankAccountHolderName?: string;
    BankAccountName?: string;
    ValidityStartDate?: string;
    ValidityEndDate?: string;
    IBAN?: string;
    IBANValidityStartDate?: any;
    BankAccount?: string;
    BankAccountReferenceText?: string;
    CollectionAuthInd?: boolean;
    CityName?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BusinessPartnerBankTypeRequest {
    BusinessPartner?: string;
    BankIdentification?: string;
    BankCountryKey?: string;
    BankName?: string;
    BankNumber?: string;
    SWIFTCode?: string;
    BankControlKey?: string;
    BankAccountHolderName?: string;
    BankAccountName?: string;
    ValidityStartDate?: string;
    ValidityEndDate?: string;
    IBAN?: string;
    IBANValidityStartDate?: any;
    BankAccount?: string;
    BankAccountReferenceText?: string;
    CollectionAuthInd?: boolean;
    CityName?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_BusinessPartnerContactType {
    /** OData type: Edm.String (maxLength: 12) */
    RelationshipNumber: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerCompany: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerPerson: string;
    /** OData type: Edm.DateTime */
    ValidityEndDate: any;
    /** OData type: Edm.DateTime */
    ValidityStartDate?: any;
    /** OData type: Edm.Boolean */
    IsStandardRelationship?: boolean;
    /** OData type: Edm.String (maxLength: 6) */
    RelationshipCategory?: string;
  }
  
  export interface CreateA_BusinessPartnerContactTypeRequest {
    ValidityStartDate?: any;
    IsStandardRelationship?: boolean;
    RelationshipCategory?: string;
  }
  
  export interface UpdateA_BusinessPartnerContactTypeRequest {
    RelationshipNumber?: string;
    BusinessPartnerCompany?: string;
    BusinessPartnerPerson?: string;
    ValidityEndDate?: any;
    ValidityStartDate?: any;
    IsStandardRelationship?: boolean;
    RelationshipCategory?: string;
  }
  
  export interface A_BusinessPartnerIsBankType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 15) */
    BankKey?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BankCountry?: string;
    /** OData type: Edm.String (maxLength: 1) */
    BPMinimumReserve?: string;
  }
  
  export interface CreateA_BusinessPartnerIsBankTypeRequest {
    BankKey?: string;
    BankCountry?: string;
    BPMinimumReserve?: string;
  }
  
  export interface UpdateA_BusinessPartnerIsBankTypeRequest {
    BusinessPartner?: string;
    BankKey?: string;
    BankCountry?: string;
    BPMinimumReserve?: string;
  }
  
  export interface A_BusinessPartnerPaymentCardType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 6) */
    PaymentCardID: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentCardType: string;
    /** OData type: Edm.String (maxLength: 25) */
    CardNumber: string;
    /** OData type: Edm.Boolean */
    IsStandardCard?: boolean;
    /** OData type: Edm.String (maxLength: 40) */
    CardDescription?: string;
    /** OData type: Edm.DateTime */
    ValidityDate?: any;
    /** OData type: Edm.DateTime */
    ValidityEndDate?: any;
    /** OData type: Edm.String (maxLength: 40) */
    CardHolder?: string;
    /** OData type: Edm.String (maxLength: 40) */
    CardIssuingBank?: string;
    /** OData type: Edm.DateTime */
    CardIssueDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    PaymentCardLock?: string;
    /** OData type: Edm.String (maxLength: 25) */
    MaskedCardNumber?: string;
  }
  
  export interface CreateA_BusinessPartnerPaymentCardTypeRequest {
    IsStandardCard?: boolean;
    CardDescription?: string;
    ValidityDate?: any;
    ValidityEndDate?: any;
    CardHolder?: string;
    CardIssuingBank?: string;
    CardIssueDate?: any;
    PaymentCardLock?: string;
    MaskedCardNumber?: string;
  }
  
  export interface UpdateA_BusinessPartnerPaymentCardTypeRequest {
    BusinessPartner?: string;
    PaymentCardID?: string;
    PaymentCardType?: string;
    CardNumber?: string;
    IsStandardCard?: boolean;
    CardDescription?: string;
    ValidityDate?: any;
    ValidityEndDate?: any;
    CardHolder?: string;
    CardIssuingBank?: string;
    CardIssueDate?: any;
    PaymentCardLock?: string;
    MaskedCardNumber?: string;
  }
  
  export interface A_BusinessPartnerRatingType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerRatingProcedure: string;
    /** OData type: Edm.DateTime */
    BPRatingValidityEndDate: any;
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartnerRatingGrade?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BusinessPartnerRatingTrend?: string;
    /** OData type: Edm.DateTime */
    BPRatingValidityStartDate?: any;
    /** OData type: Edm.DateTime */
    BPRatingCreationDate?: any;
    /** OData type: Edm.String (maxLength: 60) */
    BusinessPartnerRatingComment?: string;
    /** OData type: Edm.Boolean */
    BusinessPartnerRatingIsAllowed?: boolean;
    /** OData type: Edm.Boolean */
    BPRatingIsValidOnKeyDate?: boolean;
    /** OData type: Edm.DateTime */
    BusinessPartnerRatingKeyDate?: any;
    /** OData type: Edm.Boolean */
    BusinessPartnerRatingIsExpired?: boolean;
    /** OData type: Edm.String (maxLength: 255) */
    BPRatingLongComment?: string;
  }
  
  export interface CreateA_BusinessPartnerRatingTypeRequest {
    BusinessPartnerRatingGrade?: string;
    BusinessPartnerRatingTrend?: string;
    BPRatingValidityStartDate?: any;
    BPRatingCreationDate?: any;
    BusinessPartnerRatingComment?: string;
    BusinessPartnerRatingIsAllowed?: boolean;
    BPRatingIsValidOnKeyDate?: boolean;
    BusinessPartnerRatingKeyDate?: any;
    BusinessPartnerRatingIsExpired?: boolean;
    BPRatingLongComment?: string;
  }
  
  export interface UpdateA_BusinessPartnerRatingTypeRequest {
    BusinessPartner?: string;
    BusinessPartnerRatingProcedure?: string;
    BPRatingValidityEndDate?: any;
    BusinessPartnerRatingGrade?: string;
    BusinessPartnerRatingTrend?: string;
    BPRatingValidityStartDate?: any;
    BPRatingCreationDate?: any;
    BusinessPartnerRatingComment?: string;
    BusinessPartnerRatingIsAllowed?: boolean;
    BPRatingIsValidOnKeyDate?: boolean;
    BusinessPartnerRatingKeyDate?: any;
    BusinessPartnerRatingIsExpired?: boolean;
    BPRatingLongComment?: string;
  }
  
  export interface A_BusinessPartnerRoleType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 6) */
    BusinessPartnerRole: string;
    /** OData type: Edm.DateTimeOffset */
    ValidFrom?: string;
    /** OData type: Edm.DateTimeOffset */
    ValidTo?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BusinessPartnerRoleTypeRequest {
    ValidFrom?: string;
    ValidTo?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BusinessPartnerRoleTypeRequest {
    BusinessPartner?: string;
    BusinessPartnerRole?: string;
    ValidFrom?: string;
    ValidTo?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_BusinessPartnerTaxNumberType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 4) */
    BPTaxType: string;
    /** OData type: Edm.String (maxLength: 20) */
    BPTaxNumber?: string;
    /** OData type: Edm.String (maxLength: 60) */
    BPTaxLongNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BusinessPartnerTaxNumberTypeRequest {
    BPTaxNumber?: string;
    BPTaxLongNumber?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BusinessPartnerTaxNumberTypeRequest {
    BusinessPartner?: string;
    BPTaxType?: string;
    BPTaxNumber?: string;
    BPTaxLongNumber?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_BusPartAddrDepdntTaxNmbrType {
    /** OData type: Edm.String (maxLength: 10) */
    BusinessPartner: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 4) */
    BPTaxType: string;
    /** OData type: Edm.String (maxLength: 20) */
    BPTaxNumber?: string;
    /** OData type: Edm.String (maxLength: 60) */
    BPTaxLongNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_BusPartAddrDepdntTaxNmbrTypeRequest {
    BPTaxNumber?: string;
    BPTaxLongNumber?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_BusPartAddrDepdntTaxNmbrTypeRequest {
    BusinessPartner?: string;
    AddressID?: string;
    BPTaxType?: string;
    BPTaxNumber?: string;
    BPTaxLongNumber?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_CustAddrDepdntExtIdentifierType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 12) */
    CustomerExternalRefID?: string;
  }
  
  export interface CreateA_CustAddrDepdntExtIdentifierTypeRequest {
    CustomerExternalRefID?: string;
  }
  
  export interface UpdateA_CustAddrDepdntExtIdentifierTypeRequest {
    Customer?: string;
    AddressID?: string;
    CustomerExternalRefID?: string;
  }
  
  export interface A_CustAddrDepdntInformationType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 25) */
    ExpressTrainStationName?: string;
    /** OData type: Edm.String (maxLength: 25) */
    TrainStationName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CityCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    County?: string;
  }
  
  export interface CreateA_CustAddrDepdntInformationTypeRequest {
    ExpressTrainStationName?: string;
    TrainStationName?: string;
    CityCode?: string;
    County?: string;
  }
  
  export interface UpdateA_CustAddrDepdntInformationTypeRequest {
    Customer?: string;
    AddressID?: string;
    ExpressTrainStationName?: string;
    TrainStationName?: string;
    CityCode?: string;
    County?: string;
  }
  
  export interface A_CustomerType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BillingIsBlockedForCustomer?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime */
    CreationDate?: any;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerAccountGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerClassification?: string;
    /** OData type: Edm.String (maxLength: 220) */
    CustomerFullName?: string;
    /** OData type: Edm.String (maxLength: 220) */
    BPCustomerFullName?: string;
    /** OData type: Edm.String (maxLength: 80) */
    CustomerName?: string;
    /** OData type: Edm.String (maxLength: 81) */
    BPCustomerName?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryIsBlocked?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FreeDefinedAttribute01?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FreeDefinedAttribute02?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FreeDefinedAttribute03?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FreeDefinedAttribute04?: string;
    /** OData type: Edm.String (maxLength: 2) */
    FreeDefinedAttribute05?: string;
    /** OData type: Edm.String (maxLength: 3) */
    FreeDefinedAttribute06?: string;
    /** OData type: Edm.String (maxLength: 3) */
    FreeDefinedAttribute07?: string;
    /** OData type: Edm.String (maxLength: 3) */
    FreeDefinedAttribute08?: string;
    /** OData type: Edm.String (maxLength: 3) */
    FreeDefinedAttribute09?: string;
    /** OData type: Edm.String (maxLength: 3) */
    FreeDefinedAttribute10?: string;
    /** OData type: Edm.String (maxLength: 1) */
    NFPartnerIsNaturalPerson?: string;
    /** OData type: Edm.String (maxLength: 2) */
    OrderIsBlockedForCustomer?: string;
    /** OData type: Edm.Boolean */
    PostingIsBlocked?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    Supplier?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CustomerCorporateGroup?: string;
    /** OData type: Edm.String (maxLength: 10) */
    FiscalAddress?: string;
    /** OData type: Edm.String (maxLength: 4) */
    Industry?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndustryCode1?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndustryCode2?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndustryCode3?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndustryCode4?: string;
    /** OData type: Edm.String (maxLength: 10) */
    IndustryCode5?: string;
    /** OData type: Edm.String (maxLength: 7) */
    InternationalLocationNumber1?: string;
    /** OData type: Edm.String (maxLength: 5) */
    InternationalLocationNumber2?: string;
    /** OData type: Edm.String (maxLength: 1) */
    InternationalLocationNumber3?: string;
    /** OData type: Edm.String (maxLength: 2) */
    NielsenRegion?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentReason?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ResponsibleType?: string;
    /** OData type: Edm.String (maxLength: 16) */
    TaxNumber1?: string;
    /** OData type: Edm.String (maxLength: 11) */
    TaxNumber2?: string;
    /** OData type: Edm.String (maxLength: 18) */
    TaxNumber3?: string;
    /** OData type: Edm.String (maxLength: 18) */
    TaxNumber4?: string;
    /** OData type: Edm.String (maxLength: 60) */
    TaxNumber5?: string;
    /** OData type: Edm.String (maxLength: 2) */
    TaxNumberType?: string;
    /** OData type: Edm.String (maxLength: 20) */
    VATRegistration?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 25) */
    ExpressTrainStationName?: string;
    /** OData type: Edm.String (maxLength: 25) */
    TrainStationName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CityCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    County?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BR_ICMSTaxPayerType?: string;
  }
  
  export interface CreateA_CustomerTypeRequest {
    AuthorizationGroup?: string;
    BillingIsBlockedForCustomer?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CustomerAccountGroup?: string;
    CustomerClassification?: string;
    CustomerFullName?: string;
    BPCustomerFullName?: string;
    CustomerName?: string;
    BPCustomerName?: string;
    DeliveryIsBlocked?: string;
    FreeDefinedAttribute01?: string;
    FreeDefinedAttribute02?: string;
    FreeDefinedAttribute03?: string;
    FreeDefinedAttribute04?: string;
    FreeDefinedAttribute05?: string;
    FreeDefinedAttribute06?: string;
    FreeDefinedAttribute07?: string;
    FreeDefinedAttribute08?: string;
    FreeDefinedAttribute09?: string;
    FreeDefinedAttribute10?: string;
    NFPartnerIsNaturalPerson?: string;
    OrderIsBlockedForCustomer?: string;
    PostingIsBlocked?: boolean;
    Supplier?: string;
    CustomerCorporateGroup?: string;
    FiscalAddress?: string;
    Industry?: string;
    IndustryCode1?: string;
    IndustryCode2?: string;
    IndustryCode3?: string;
    IndustryCode4?: string;
    IndustryCode5?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
    NielsenRegion?: string;
    PaymentReason?: string;
    ResponsibleType?: string;
    TaxNumber1?: string;
    TaxNumber2?: string;
    TaxNumber3?: string;
    TaxNumber4?: string;
    TaxNumber5?: string;
    TaxNumberType?: string;
    VATRegistration?: string;
    DeletionIndicator?: boolean;
    ExpressTrainStationName?: string;
    TrainStationName?: string;
    CityCode?: string;
    County?: string;
    BR_ICMSTaxPayerType?: string;
  }
  
  export interface UpdateA_CustomerTypeRequest {
    Customer?: string;
    AuthorizationGroup?: string;
    BillingIsBlockedForCustomer?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    CustomerAccountGroup?: string;
    CustomerClassification?: string;
    CustomerFullName?: string;
    BPCustomerFullName?: string;
    CustomerName?: string;
    BPCustomerName?: string;
    DeliveryIsBlocked?: string;
    FreeDefinedAttribute01?: string;
    FreeDefinedAttribute02?: string;
    FreeDefinedAttribute03?: string;
    FreeDefinedAttribute04?: string;
    FreeDefinedAttribute05?: string;
    FreeDefinedAttribute06?: string;
    FreeDefinedAttribute07?: string;
    FreeDefinedAttribute08?: string;
    FreeDefinedAttribute09?: string;
    FreeDefinedAttribute10?: string;
    NFPartnerIsNaturalPerson?: string;
    OrderIsBlockedForCustomer?: string;
    PostingIsBlocked?: boolean;
    Supplier?: string;
    CustomerCorporateGroup?: string;
    FiscalAddress?: string;
    Industry?: string;
    IndustryCode1?: string;
    IndustryCode2?: string;
    IndustryCode3?: string;
    IndustryCode4?: string;
    IndustryCode5?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
    NielsenRegion?: string;
    PaymentReason?: string;
    ResponsibleType?: string;
    TaxNumber1?: string;
    TaxNumber2?: string;
    TaxNumber3?: string;
    TaxNumber4?: string;
    TaxNumber5?: string;
    TaxNumberType?: string;
    VATRegistration?: string;
    DeletionIndicator?: boolean;
    ExpressTrainStationName?: string;
    TrainStationName?: string;
    CityCode?: string;
    County?: string;
    BR_ICMSTaxPayerType?: string;
  }
  
  export interface A_CustomerCompanyType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 4) */
    APARToleranceGroup?: string;
    /** OData type: Edm.String (maxLength: 12) */
    AccountByCustomer?: string;
    /** OData type: Edm.String (maxLength: 2) */
    AccountingClerk?: string;
    /** OData type: Edm.String (maxLength: 31) */
    AccountingClerkFaxNumber?: string;
    /** OData type: Edm.String (maxLength: 130) */
    AccountingClerkInternetAddress?: string;
    /** OData type: Edm.String (maxLength: 30) */
    AccountingClerkPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    AlternativePayerAccount?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 1) */
    CollectiveInvoiceVariant?: string;
    /** OData type: Edm.String (maxLength: 30) */
    CustomerAccountNote?: string;
    /** OData type: Edm.String (maxLength: 10) */
    CustomerHeadOffice?: string;
    /** OData type: Edm.Boolean */
    CustomerSupplierClearingIsUsed?: boolean;
    /** OData type: Edm.String (maxLength: 5) */
    HouseBank?: string;
    /** OData type: Edm.String (maxLength: 2) */
    InterestCalculationCode?: string;
    /** OData type: Edm.DateTime */
    InterestCalculationDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    IntrstCalcFrequencyInMonths?: string;
    /** OData type: Edm.Boolean */
    IsToBeLocallyProcessed?: boolean;
    /** OData type: Edm.Boolean */
    ItemIsToBePaidSeparately?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    LayoutSortingRule?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PaymentBlockingReason?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PaymentMethodsList?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentReason?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentTerms?: string;
    /** OData type: Edm.Boolean */
    PaytAdviceIsSentbyEDI?: boolean;
    /** OData type: Edm.Boolean */
    PhysicalInventoryBlockInd?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    ReconciliationAccount?: string;
    /** OData type: Edm.Boolean */
    RecordPaymentHistoryIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 15) */
    UserAtCustomer?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    CashPlanningGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    KnownOrNegotiatedLeave?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ValueAdjustmentKey?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerAccountGroup?: string;
  }
  
  export interface CreateA_CustomerCompanyTypeRequest {
    APARToleranceGroup?: string;
    AccountByCustomer?: string;
    AccountingClerk?: string;
    AccountingClerkFaxNumber?: string;
    AccountingClerkInternetAddress?: string;
    AccountingClerkPhoneNumber?: string;
    AlternativePayerAccount?: string;
    AuthorizationGroup?: string;
    CollectiveInvoiceVariant?: string;
    CustomerAccountNote?: string;
    CustomerHeadOffice?: string;
    CustomerSupplierClearingIsUsed?: boolean;
    HouseBank?: string;
    InterestCalculationCode?: string;
    InterestCalculationDate?: any;
    IntrstCalcFrequencyInMonths?: string;
    IsToBeLocallyProcessed?: boolean;
    ItemIsToBePaidSeparately?: boolean;
    LayoutSortingRule?: string;
    PaymentBlockingReason?: string;
    PaymentMethodsList?: string;
    PaymentReason?: string;
    PaymentTerms?: string;
    PaytAdviceIsSentbyEDI?: boolean;
    PhysicalInventoryBlockInd?: boolean;
    ReconciliationAccount?: string;
    RecordPaymentHistoryIndicator?: boolean;
    UserAtCustomer?: string;
    DeletionIndicator?: boolean;
    CashPlanningGroup?: string;
    KnownOrNegotiatedLeave?: string;
    ValueAdjustmentKey?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface UpdateA_CustomerCompanyTypeRequest {
    Customer?: string;
    CompanyCode?: string;
    APARToleranceGroup?: string;
    AccountByCustomer?: string;
    AccountingClerk?: string;
    AccountingClerkFaxNumber?: string;
    AccountingClerkInternetAddress?: string;
    AccountingClerkPhoneNumber?: string;
    AlternativePayerAccount?: string;
    AuthorizationGroup?: string;
    CollectiveInvoiceVariant?: string;
    CustomerAccountNote?: string;
    CustomerHeadOffice?: string;
    CustomerSupplierClearingIsUsed?: boolean;
    HouseBank?: string;
    InterestCalculationCode?: string;
    InterestCalculationDate?: any;
    IntrstCalcFrequencyInMonths?: string;
    IsToBeLocallyProcessed?: boolean;
    ItemIsToBePaidSeparately?: boolean;
    LayoutSortingRule?: string;
    PaymentBlockingReason?: string;
    PaymentMethodsList?: string;
    PaymentReason?: string;
    PaymentTerms?: string;
    PaytAdviceIsSentbyEDI?: boolean;
    PhysicalInventoryBlockInd?: boolean;
    ReconciliationAccount?: string;
    RecordPaymentHistoryIndicator?: boolean;
    UserAtCustomer?: string;
    DeletionIndicator?: boolean;
    CashPlanningGroup?: string;
    KnownOrNegotiatedLeave?: string;
    ValueAdjustmentKey?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface A_CustomerCompanyTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_CustomerCompanyTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_CustomerCompanyTextTypeRequest {
    Customer?: string;
    CompanyCode?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_CustomerDunningType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    DunningArea: string;
    /** OData type: Edm.String (maxLength: 1) */
    DunningBlock?: string;
    /** OData type: Edm.String (maxLength: 1) */
    DunningLevel?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DunningProcedure?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DunningRecipient?: string;
    /** OData type: Edm.DateTime */
    LastDunnedOn?: any;
    /** OData type: Edm.DateTime */
    LegDunningProcedureOn?: any;
    /** OData type: Edm.String (maxLength: 2) */
    DunningClerk?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerAccountGroup?: string;
  }
  
  export interface CreateA_CustomerDunningTypeRequest {
    DunningBlock?: string;
    DunningLevel?: string;
    DunningProcedure?: string;
    DunningRecipient?: string;
    LastDunnedOn?: any;
    LegDunningProcedureOn?: any;
    DunningClerk?: string;
    AuthorizationGroup?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface UpdateA_CustomerDunningTypeRequest {
    Customer?: string;
    CompanyCode?: string;
    DunningArea?: string;
    DunningBlock?: string;
    DunningLevel?: string;
    DunningProcedure?: string;
    DunningRecipient?: string;
    LastDunnedOn?: any;
    LegDunningProcedureOn?: any;
    DunningClerk?: string;
    AuthorizationGroup?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface A_CustomerSalesAreaType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 12) */
    AccountByCustomer?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    BillingIsBlockedForCustomer?: string;
    /** OData type: Edm.Boolean */
    CompleteDeliveryIsDefined?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    CreditControlArea?: string;
    /** OData type: Edm.String (maxLength: 5) */
    Currency?: string;
    /** OData type: Edm.Boolean */
    CustIsRlvtForSettlmtMgmt?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerABCClassification?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerAccountAssignmentGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerGroup?: string;
    /** OData type: Edm.Boolean */
    CustomerIsRebateRelevant?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerPaymentTerms?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerPriceGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerPricingProcedure?: string;
    /** OData type: Edm.String (maxLength: 1) */
    CustomerStatisticsGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustProdProposalProcedure?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryIsBlockedForCustomer?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryPriority?: string;
    /** OData type: Edm.String (maxLength: 3) */
    IncotermsClassification?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation2?: string;
    /** OData type: Edm.String (maxLength: 4) */
    IncotermsVersion?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation1?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc1AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc2AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnDvtgLocAddlUUID?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 28) */
    IncotermsTransferLocation?: string;
    /** OData type: Edm.Boolean */
    InspSbstHasNoTimeOrQuantity?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    InvoiceDate?: string;
    /** OData type: Edm.String (maxLength: 3) */
    ItemOrderProbabilityInPercent?: string;
    /** OData type: Edm.Boolean */
    ManualInvoiceMaintIsRelevant?: boolean;
    /** OData type: Edm.Decimal (precision: 1) */
    MaxNmbrOfPartialDelivery?: number;
    /** OData type: Edm.Boolean */
    OrderCombinationIsAllowed?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    OrderIsBlockedForCustomer?: string;
    /** OData type: Edm.Decimal (precision: 3, scale: 1) */
    OverdelivTolrtdLmtRatioInPct?: number;
    /** OData type: Edm.String (maxLength: 1) */
    PartialDeliveryIsAllowed?: string;
    /** OData type: Edm.String (maxLength: 2) */
    PriceListType?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ProductUnitGroup?: string;
    /** OData type: Edm.Decimal (precision: 6, scale: 2) */
    ProofOfDeliveryTimeValue?: number;
    /** OData type: Edm.String (maxLength: 3) */
    SalesGroup?: string;
    /** OData type: Edm.String (maxLength: 10) */
    SalesItemProposal?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOffice?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShippingCondition?: string;
    /** OData type: Edm.Boolean */
    SlsDocIsRlvtForProofOfDeliv?: boolean;
    /** OData type: Edm.Boolean */
    SlsUnlmtdOvrdelivIsAllwd?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    SupplyingPlant?: string;
    /** OData type: Edm.String (maxLength: 6) */
    SalesDistrict?: string;
    /** OData type: Edm.Decimal (precision: 3, scale: 1) */
    UnderdelivTolrtdLmtRatioInPct?: number;
    /** OData type: Edm.String (maxLength: 2) */
    InvoiceListSchedule?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ExchangeRateType?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup1?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup2?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup3?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup4?: string;
    /** OData type: Edm.String (maxLength: 3) */
    AdditionalCustomerGroup5?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentGuaranteeProcedure?: string;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerAccountGroup?: string;
  }
  
  export interface CreateA_CustomerSalesAreaTypeRequest {
    AccountByCustomer?: string;
    AuthorizationGroup?: string;
    BillingIsBlockedForCustomer?: string;
    CompleteDeliveryIsDefined?: boolean;
    CreditControlArea?: string;
    Currency?: string;
    CustIsRlvtForSettlmtMgmt?: boolean;
    CustomerABCClassification?: string;
    CustomerAccountAssignmentGroup?: string;
    CustomerGroup?: string;
    CustomerIsRebateRelevant?: boolean;
    CustomerPaymentTerms?: string;
    CustomerPriceGroup?: string;
    CustomerPricingProcedure?: string;
    CustomerStatisticsGroup?: string;
    CustProdProposalProcedure?: string;
    DeliveryIsBlockedForCustomer?: string;
    DeliveryPriority?: string;
    IncotermsClassification?: string;
    IncotermsLocation2?: string;
    IncotermsVersion?: string;
    IncotermsLocation1?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    DeletionIndicator?: boolean;
    IncotermsTransferLocation?: string;
    InspSbstHasNoTimeOrQuantity?: boolean;
    InvoiceDate?: string;
    ItemOrderProbabilityInPercent?: string;
    ManualInvoiceMaintIsRelevant?: boolean;
    MaxNmbrOfPartialDelivery?: number;
    OrderCombinationIsAllowed?: boolean;
    OrderIsBlockedForCustomer?: string;
    OverdelivTolrtdLmtRatioInPct?: number;
    PartialDeliveryIsAllowed?: string;
    PriceListType?: string;
    ProductUnitGroup?: string;
    ProofOfDeliveryTimeValue?: number;
    SalesGroup?: string;
    SalesItemProposal?: string;
    SalesOffice?: string;
    ShippingCondition?: string;
    SlsDocIsRlvtForProofOfDeliv?: boolean;
    SlsUnlmtdOvrdelivIsAllwd?: boolean;
    SupplyingPlant?: string;
    SalesDistrict?: string;
    UnderdelivTolrtdLmtRatioInPct?: number;
    InvoiceListSchedule?: string;
    ExchangeRateType?: string;
    AdditionalCustomerGroup1?: string;
    AdditionalCustomerGroup2?: string;
    AdditionalCustomerGroup3?: string;
    AdditionalCustomerGroup4?: string;
    AdditionalCustomerGroup5?: string;
    PaymentGuaranteeProcedure?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface UpdateA_CustomerSalesAreaTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    AccountByCustomer?: string;
    AuthorizationGroup?: string;
    BillingIsBlockedForCustomer?: string;
    CompleteDeliveryIsDefined?: boolean;
    CreditControlArea?: string;
    Currency?: string;
    CustIsRlvtForSettlmtMgmt?: boolean;
    CustomerABCClassification?: string;
    CustomerAccountAssignmentGroup?: string;
    CustomerGroup?: string;
    CustomerIsRebateRelevant?: boolean;
    CustomerPaymentTerms?: string;
    CustomerPriceGroup?: string;
    CustomerPricingProcedure?: string;
    CustomerStatisticsGroup?: string;
    CustProdProposalProcedure?: string;
    DeliveryIsBlockedForCustomer?: string;
    DeliveryPriority?: string;
    IncotermsClassification?: string;
    IncotermsLocation2?: string;
    IncotermsVersion?: string;
    IncotermsLocation1?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    DeletionIndicator?: boolean;
    IncotermsTransferLocation?: string;
    InspSbstHasNoTimeOrQuantity?: boolean;
    InvoiceDate?: string;
    ItemOrderProbabilityInPercent?: string;
    ManualInvoiceMaintIsRelevant?: boolean;
    MaxNmbrOfPartialDelivery?: number;
    OrderCombinationIsAllowed?: boolean;
    OrderIsBlockedForCustomer?: string;
    OverdelivTolrtdLmtRatioInPct?: number;
    PartialDeliveryIsAllowed?: string;
    PriceListType?: string;
    ProductUnitGroup?: string;
    ProofOfDeliveryTimeValue?: number;
    SalesGroup?: string;
    SalesItemProposal?: string;
    SalesOffice?: string;
    ShippingCondition?: string;
    SlsDocIsRlvtForProofOfDeliv?: boolean;
    SlsUnlmtdOvrdelivIsAllwd?: boolean;
    SupplyingPlant?: string;
    SalesDistrict?: string;
    UnderdelivTolrtdLmtRatioInPct?: number;
    InvoiceListSchedule?: string;
    ExchangeRateType?: string;
    AdditionalCustomerGroup1?: string;
    AdditionalCustomerGroup2?: string;
    AdditionalCustomerGroup3?: string;
    AdditionalCustomerGroup4?: string;
    AdditionalCustomerGroup5?: string;
    PaymentGuaranteeProcedure?: string;
    CustomerAccountGroup?: string;
  }
  
  export interface A_CustomerSalesAreaTaxType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 3) */
    DepartureCountry: string;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerTaxCategory: string;
    /** OData type: Edm.String (maxLength: 1) */
    CustomerTaxClassification?: string;
  }
  
  export interface CreateA_CustomerSalesAreaTaxTypeRequest {
    CustomerTaxClassification?: string;
  }
  
  export interface UpdateA_CustomerSalesAreaTaxTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    DepartureCountry?: string;
    CustomerTaxCategory?: string;
    CustomerTaxClassification?: string;
  }
  
  export interface A_CustomerSalesAreaTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_CustomerSalesAreaTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_CustomerSalesAreaTextTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_CustomerTaxGroupingType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 3) */
    CustomerTaxGroupingCode: string;
    /** OData type: Edm.String (maxLength: 15) */
    CustTaxGrpExemptionCertificate?: string;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    CustTaxGroupExemptionRate?: number;
    /** OData type: Edm.DateTime */
    CustTaxGroupExemptionStartDate?: any;
    /** OData type: Edm.DateTime */
    CustTaxGroupExemptionEndDate?: any;
    /** OData type: Edm.DateTime */
    CustTaxGroupSubjectedStartDate?: any;
    /** OData type: Edm.DateTime */
    CustTaxGroupSubjectedEndDate?: any;
  }
  
  export interface CreateA_CustomerTaxGroupingTypeRequest {
    CustTaxGrpExemptionCertificate?: string;
    CustTaxGroupExemptionRate?: number;
    CustTaxGroupExemptionStartDate?: any;
    CustTaxGroupExemptionEndDate?: any;
    CustTaxGroupSubjectedStartDate?: any;
    CustTaxGroupSubjectedEndDate?: any;
  }
  
  export interface UpdateA_CustomerTaxGroupingTypeRequest {
    Customer?: string;
    CustomerTaxGroupingCode?: string;
    CustTaxGrpExemptionCertificate?: string;
    CustTaxGroupExemptionRate?: number;
    CustTaxGroupExemptionStartDate?: any;
    CustTaxGroupExemptionEndDate?: any;
    CustTaxGroupSubjectedStartDate?: any;
    CustTaxGroupSubjectedEndDate?: any;
  }
  
  export interface A_CustomerTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_CustomerTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_CustomerTextTypeRequest {
    Customer?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_CustomerUnloadingPointType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 25) */
    UnloadingPointName: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerFactoryCalenderCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BPGoodsReceivingHoursCode?: string;
    /** OData type: Edm.Boolean */
    IsDfltBPUnloadingPoint?: boolean;
    /** OData type: Edm.Time */
    MondayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    MondayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    MondayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    MondayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    TuesdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    TuesdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    TuesdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    TuesdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    WednesdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    WednesdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    WednesdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    WednesdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    ThursdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    ThursdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    ThursdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    ThursdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    FridayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    FridayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    FridayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    FridayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    SaturdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    SaturdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    SaturdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    SaturdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    SundayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    SundayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    SundayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    SundayAfternoonClosingTime?: any;
  }
  
  export interface CreateA_CustomerUnloadingPointTypeRequest {
    CustomerFactoryCalenderCode?: string;
    BPGoodsReceivingHoursCode?: string;
    IsDfltBPUnloadingPoint?: boolean;
    MondayMorningOpeningTime?: any;
    MondayMorningClosingTime?: any;
    MondayAfternoonOpeningTime?: any;
    MondayAfternoonClosingTime?: any;
    TuesdayMorningOpeningTime?: any;
    TuesdayMorningClosingTime?: any;
    TuesdayAfternoonOpeningTime?: any;
    TuesdayAfternoonClosingTime?: any;
    WednesdayMorningOpeningTime?: any;
    WednesdayMorningClosingTime?: any;
    WednesdayAfternoonOpeningTime?: any;
    WednesdayAfternoonClosingTime?: any;
    ThursdayMorningOpeningTime?: any;
    ThursdayMorningClosingTime?: any;
    ThursdayAfternoonOpeningTime?: any;
    ThursdayAfternoonClosingTime?: any;
    FridayMorningOpeningTime?: any;
    FridayMorningClosingTime?: any;
    FridayAfternoonOpeningTime?: any;
    FridayAfternoonClosingTime?: any;
    SaturdayMorningOpeningTime?: any;
    SaturdayMorningClosingTime?: any;
    SaturdayAfternoonOpeningTime?: any;
    SaturdayAfternoonClosingTime?: any;
    SundayMorningOpeningTime?: any;
    SundayMorningClosingTime?: any;
    SundayAfternoonOpeningTime?: any;
    SundayAfternoonClosingTime?: any;
  }
  
  export interface UpdateA_CustomerUnloadingPointTypeRequest {
    Customer?: string;
    UnloadingPointName?: string;
    CustomerFactoryCalenderCode?: string;
    BPGoodsReceivingHoursCode?: string;
    IsDfltBPUnloadingPoint?: boolean;
    MondayMorningOpeningTime?: any;
    MondayMorningClosingTime?: any;
    MondayAfternoonOpeningTime?: any;
    MondayAfternoonClosingTime?: any;
    TuesdayMorningOpeningTime?: any;
    TuesdayMorningClosingTime?: any;
    TuesdayAfternoonOpeningTime?: any;
    TuesdayAfternoonClosingTime?: any;
    WednesdayMorningOpeningTime?: any;
    WednesdayMorningClosingTime?: any;
    WednesdayAfternoonOpeningTime?: any;
    WednesdayAfternoonClosingTime?: any;
    ThursdayMorningOpeningTime?: any;
    ThursdayMorningClosingTime?: any;
    ThursdayAfternoonOpeningTime?: any;
    ThursdayAfternoonClosingTime?: any;
    FridayMorningOpeningTime?: any;
    FridayMorningClosingTime?: any;
    FridayAfternoonOpeningTime?: any;
    FridayAfternoonClosingTime?: any;
    SaturdayMorningOpeningTime?: any;
    SaturdayMorningClosingTime?: any;
    SaturdayAfternoonOpeningTime?: any;
    SaturdayAfternoonClosingTime?: any;
    SundayMorningOpeningTime?: any;
    SundayMorningClosingTime?: any;
    SundayAfternoonOpeningTime?: any;
    SundayAfternoonClosingTime?: any;
  }
  
  export interface A_CustomerWithHoldingTaxType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    WithholdingTaxType: string;
    /** OData type: Edm.String (maxLength: 2) */
    WithholdingTaxCode?: string;
    /** OData type: Edm.Boolean */
    WithholdingTaxAgent?: boolean;
    /** OData type: Edm.DateTime */
    ObligationDateBegin?: any;
    /** OData type: Edm.DateTime */
    ObligationDateEnd?: any;
    /** OData type: Edm.String (maxLength: 16) */
    WithholdingTaxNumber?: string;
    /** OData type: Edm.String (maxLength: 25) */
    WithholdingTaxCertificate?: string;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    WithholdingTaxExmptPercent?: number;
    /** OData type: Edm.DateTime */
    ExemptionDateBegin?: any;
    /** OData type: Edm.DateTime */
    ExemptionDateEnd?: any;
    /** OData type: Edm.String (maxLength: 2) */
    ExemptionReason?: string;
    /** OData type: Edm.String (maxLength: 2) */
    RecipientType?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_CustomerWithHoldingTaxTypeRequest {
    WithholdingTaxCode?: string;
    WithholdingTaxAgent?: boolean;
    ObligationDateBegin?: any;
    ObligationDateEnd?: any;
    WithholdingTaxNumber?: string;
    WithholdingTaxCertificate?: string;
    WithholdingTaxExmptPercent?: number;
    ExemptionDateBegin?: any;
    ExemptionDateEnd?: any;
    ExemptionReason?: string;
    RecipientType?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_CustomerWithHoldingTaxTypeRequest {
    Customer?: string;
    CompanyCode?: string;
    WithholdingTaxType?: string;
    WithholdingTaxCode?: string;
    WithholdingTaxAgent?: boolean;
    ObligationDateBegin?: any;
    ObligationDateEnd?: any;
    WithholdingTaxNumber?: string;
    WithholdingTaxCertificate?: string;
    WithholdingTaxExmptPercent?: number;
    ExemptionDateBegin?: any;
    ExemptionDateEnd?: any;
    ExemptionReason?: string;
    RecipientType?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_CustSalesPartnerFuncType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 3) */
    PartnerCounter: string;
    /** OData type: Edm.String (maxLength: 2) */
    PartnerFunction: string;
    /** OData type: Edm.String (maxLength: 10) */
    BPCustomerNumber?: string;
    /** OData type: Edm.String (maxLength: 30) */
    CustomerPartnerDescription?: string;
    /** OData type: Edm.Boolean */
    DefaultPartner?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    Supplier?: string;
    /** OData type: Edm.String (maxLength: 8) */
    PersonnelNumber?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ContactPerson?: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_CustSalesPartnerFuncTypeRequest {
    BPCustomerNumber?: string;
    CustomerPartnerDescription?: string;
    DefaultPartner?: boolean;
    Supplier?: string;
    PersonnelNumber?: string;
    ContactPerson?: string;
    AddressID?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_CustSalesPartnerFuncTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    PartnerCounter?: string;
    PartnerFunction?: string;
    BPCustomerNumber?: string;
    CustomerPartnerDescription?: string;
    DefaultPartner?: boolean;
    Supplier?: string;
    PersonnelNumber?: string;
    ContactPerson?: string;
    AddressID?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_CustSlsAreaAddrDepdntInfoType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    IncotermsClassification?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation1?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation2?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc1AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc2AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnDvtgLocAddlUUID?: string;
    /** OData type: Edm.String (maxLength: 2) */
    DeliveryIsBlocked?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOffice?: string;
    /** OData type: Edm.String (maxLength: 3) */
    SalesGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShippingCondition?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SupplyingPlant?: string;
    /** OData type: Edm.String (maxLength: 4) */
    IncotermsVersion?: string;
  }
  
  export interface CreateA_CustSlsAreaAddrDepdntInfoTypeRequest {
    IncotermsClassification?: string;
    IncotermsLocation1?: string;
    IncotermsLocation2?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    DeliveryIsBlocked?: string;
    SalesOffice?: string;
    SalesGroup?: string;
    ShippingCondition?: string;
    SupplyingPlant?: string;
    IncotermsVersion?: string;
  }
  
  export interface UpdateA_CustSlsAreaAddrDepdntInfoTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    AddressID?: string;
    IncotermsClassification?: string;
    IncotermsLocation1?: string;
    IncotermsLocation2?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    DeliveryIsBlocked?: string;
    SalesOffice?: string;
    SalesGroup?: string;
    ShippingCondition?: string;
    SupplyingPlant?: string;
    IncotermsVersion?: string;
  }
  
  export interface A_CustSlsAreaAddrDepdntTaxInfoType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 4) */
    SalesOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    DistributionChannel: string;
    /** OData type: Edm.String (maxLength: 2) */
    Division: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 3) */
    DepartureCountry: string;
    /** OData type: Edm.String (maxLength: 4) */
    CustomerTaxCategory: string;
    /** OData type: Edm.String (maxLength: 1) */
    CustomerTaxClassification?: string;
  }
  
  export interface CreateA_CustSlsAreaAddrDepdntTaxInfoTypeRequest {
    CustomerTaxClassification?: string;
  }
  
  export interface UpdateA_CustSlsAreaAddrDepdntTaxInfoTypeRequest {
    Customer?: string;
    SalesOrganization?: string;
    DistributionChannel?: string;
    Division?: string;
    AddressID?: string;
    DepartureCountry?: string;
    CustomerTaxCategory?: string;
    CustomerTaxClassification?: string;
  }
  
  export interface A_CustUnldgPtAddrDepdntInfoType {
    /** OData type: Edm.String (maxLength: 10) */
    Customer: string;
    /** OData type: Edm.String (maxLength: 10) */
    AddressID: string;
    /** OData type: Edm.String (maxLength: 25) */
    UnloadingPointName: string;
    /** OData type: Edm.String (maxLength: 2) */
    CustomerFactoryCalenderCode?: string;
    /** OData type: Edm.String (maxLength: 3) */
    BPGoodsReceivingHoursCode?: string;
    /** OData type: Edm.Boolean */
    IsDfltBPUnloadingPoint?: boolean;
    /** OData type: Edm.Time */
    MondayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    MondayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    MondayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    MondayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    TuesdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    TuesdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    TuesdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    TuesdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    WednesdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    WednesdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    WednesdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    WednesdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    ThursdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    ThursdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    ThursdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    ThursdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    FridayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    FridayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    FridayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    FridayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    SaturdayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    SaturdayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    SaturdayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    SaturdayAfternoonClosingTime?: any;
    /** OData type: Edm.Time */
    SundayMorningOpeningTime?: any;
    /** OData type: Edm.Time */
    SundayMorningClosingTime?: any;
    /** OData type: Edm.Time */
    SundayAfternoonOpeningTime?: any;
    /** OData type: Edm.Time */
    SundayAfternoonClosingTime?: any;
  }
  
  export interface CreateA_CustUnldgPtAddrDepdntInfoTypeRequest {
    CustomerFactoryCalenderCode?: string;
    BPGoodsReceivingHoursCode?: string;
    IsDfltBPUnloadingPoint?: boolean;
    MondayMorningOpeningTime?: any;
    MondayMorningClosingTime?: any;
    MondayAfternoonOpeningTime?: any;
    MondayAfternoonClosingTime?: any;
    TuesdayMorningOpeningTime?: any;
    TuesdayMorningClosingTime?: any;
    TuesdayAfternoonOpeningTime?: any;
    TuesdayAfternoonClosingTime?: any;
    WednesdayMorningOpeningTime?: any;
    WednesdayMorningClosingTime?: any;
    WednesdayAfternoonOpeningTime?: any;
    WednesdayAfternoonClosingTime?: any;
    ThursdayMorningOpeningTime?: any;
    ThursdayMorningClosingTime?: any;
    ThursdayAfternoonOpeningTime?: any;
    ThursdayAfternoonClosingTime?: any;
    FridayMorningOpeningTime?: any;
    FridayMorningClosingTime?: any;
    FridayAfternoonOpeningTime?: any;
    FridayAfternoonClosingTime?: any;
    SaturdayMorningOpeningTime?: any;
    SaturdayMorningClosingTime?: any;
    SaturdayAfternoonOpeningTime?: any;
    SaturdayAfternoonClosingTime?: any;
    SundayMorningOpeningTime?: any;
    SundayMorningClosingTime?: any;
    SundayAfternoonOpeningTime?: any;
    SundayAfternoonClosingTime?: any;
  }
  
  export interface UpdateA_CustUnldgPtAddrDepdntInfoTypeRequest {
    Customer?: string;
    AddressID?: string;
    UnloadingPointName?: string;
    CustomerFactoryCalenderCode?: string;
    BPGoodsReceivingHoursCode?: string;
    IsDfltBPUnloadingPoint?: boolean;
    MondayMorningOpeningTime?: any;
    MondayMorningClosingTime?: any;
    MondayAfternoonOpeningTime?: any;
    MondayAfternoonClosingTime?: any;
    TuesdayMorningOpeningTime?: any;
    TuesdayMorningClosingTime?: any;
    TuesdayAfternoonOpeningTime?: any;
    TuesdayAfternoonClosingTime?: any;
    WednesdayMorningOpeningTime?: any;
    WednesdayMorningClosingTime?: any;
    WednesdayAfternoonOpeningTime?: any;
    WednesdayAfternoonClosingTime?: any;
    ThursdayMorningOpeningTime?: any;
    ThursdayMorningClosingTime?: any;
    ThursdayAfternoonOpeningTime?: any;
    ThursdayAfternoonClosingTime?: any;
    FridayMorningOpeningTime?: any;
    FridayMorningClosingTime?: any;
    FridayAfternoonOpeningTime?: any;
    FridayAfternoonClosingTime?: any;
    SaturdayMorningOpeningTime?: any;
    SaturdayMorningClosingTime?: any;
    SaturdayAfternoonOpeningTime?: any;
    SaturdayAfternoonClosingTime?: any;
    SundayMorningOpeningTime?: any;
    SundayMorningClosingTime?: any;
    SundayAfternoonOpeningTime?: any;
    SundayAfternoonClosingTime?: any;
  }
  
  export interface A_SupplierType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 10) */
    AlternativePayeeAccountNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 40) */
    BusinessPartnerPanNumber?: string;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.DateTime */
    CreationDate?: any;
    /** OData type: Edm.String (maxLength: 10) */
    Customer?: string;
    /** OData type: Edm.Boolean */
    PaymentIsBlockedForSupplier?: boolean;
    /** OData type: Edm.Boolean */
    PostingIsBlocked?: boolean;
    /** OData type: Edm.Boolean */
    PurchasingIsBlocked?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    SupplierAccountGroup?: string;
    /** OData type: Edm.String (maxLength: 220) */
    SupplierFullName?: string;
    /** OData type: Edm.String (maxLength: 80) */
    SupplierName?: string;
    /** OData type: Edm.String (maxLength: 20) */
    VATRegistration?: string;
    /** OData type: Edm.DateTime */
    BirthDate?: any;
    /** OData type: Edm.String (maxLength: 20) */
    ConcatenatedInternationalLocNo?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    FiscalAddress?: string;
    /** OData type: Edm.String (maxLength: 4) */
    Industry?: string;
    /** OData type: Edm.String (maxLength: 7) */
    InternationalLocationNumber1?: string;
    /** OData type: Edm.String (maxLength: 5) */
    InternationalLocationNumber2?: string;
    /** OData type: Edm.String (maxLength: 1) */
    InternationalLocationNumber3?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IsNaturalPerson?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentReason?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ResponsibleType?: string;
    /** OData type: Edm.DateTime */
    SuplrQltyInProcmtCertfnValidTo?: any;
    /** OData type: Edm.String (maxLength: 4) */
    SuplrQualityManagementSystem?: string;
    /** OData type: Edm.String (maxLength: 10) */
    SupplierCorporateGroup?: string;
    /** OData type: Edm.String (maxLength: 2) */
    SupplierProcurementBlock?: string;
    /** OData type: Edm.String (maxLength: 16) */
    TaxNumber1?: string;
    /** OData type: Edm.String (maxLength: 11) */
    TaxNumber2?: string;
    /** OData type: Edm.String (maxLength: 18) */
    TaxNumber3?: string;
    /** OData type: Edm.String (maxLength: 18) */
    TaxNumber4?: string;
    /** OData type: Edm.String (maxLength: 60) */
    TaxNumber5?: string;
    /** OData type: Edm.String (maxLength: 18) */
    TaxNumberResponsible?: string;
    /** OData type: Edm.String (maxLength: 2) */
    TaxNumberType?: string;
    /** OData type: Edm.String (maxLength: 1) */
    SuplrProofOfDelivRlvtCode?: string;
    /** OData type: Edm.Boolean */
    BR_TaxIsSplit?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    DataExchangeInstructionKey?: string;
    /** OData type: Edm.Decimal (precision: 16, scale: 3) */
    JP_SuplrAmtInCapitalAmount?: number;
    /** OData type: Edm.String (maxLength: 5) */
    JP_SupplierCapitalAmountCrcy?: string;
  }
  
  export interface CreateA_SupplierTypeRequest {
    AlternativePayeeAccountNumber?: string;
    AuthorizationGroup?: string;
    BusinessPartnerPanNumber?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    Customer?: string;
    PaymentIsBlockedForSupplier?: boolean;
    PostingIsBlocked?: boolean;
    PurchasingIsBlocked?: boolean;
    SupplierAccountGroup?: string;
    SupplierFullName?: string;
    SupplierName?: string;
    VATRegistration?: string;
    BirthDate?: any;
    ConcatenatedInternationalLocNo?: string;
    DeletionIndicator?: boolean;
    FiscalAddress?: string;
    Industry?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
    IsNaturalPerson?: string;
    PaymentReason?: string;
    ResponsibleType?: string;
    SuplrQltyInProcmtCertfnValidTo?: any;
    SuplrQualityManagementSystem?: string;
    SupplierCorporateGroup?: string;
    SupplierProcurementBlock?: string;
    TaxNumber1?: string;
    TaxNumber2?: string;
    TaxNumber3?: string;
    TaxNumber4?: string;
    TaxNumber5?: string;
    TaxNumberResponsible?: string;
    TaxNumberType?: string;
    SuplrProofOfDelivRlvtCode?: string;
    BR_TaxIsSplit?: boolean;
    DataExchangeInstructionKey?: string;
    JP_SuplrAmtInCapitalAmount?: number;
    JP_SupplierCapitalAmountCrcy?: string;
  }
  
  export interface UpdateA_SupplierTypeRequest {
    Supplier?: string;
    AlternativePayeeAccountNumber?: string;
    AuthorizationGroup?: string;
    BusinessPartnerPanNumber?: string;
    CreatedByUser?: string;
    CreationDate?: any;
    Customer?: string;
    PaymentIsBlockedForSupplier?: boolean;
    PostingIsBlocked?: boolean;
    PurchasingIsBlocked?: boolean;
    SupplierAccountGroup?: string;
    SupplierFullName?: string;
    SupplierName?: string;
    VATRegistration?: string;
    BirthDate?: any;
    ConcatenatedInternationalLocNo?: string;
    DeletionIndicator?: boolean;
    FiscalAddress?: string;
    Industry?: string;
    InternationalLocationNumber1?: string;
    InternationalLocationNumber2?: string;
    InternationalLocationNumber3?: string;
    IsNaturalPerson?: string;
    PaymentReason?: string;
    ResponsibleType?: string;
    SuplrQltyInProcmtCertfnValidTo?: any;
    SuplrQualityManagementSystem?: string;
    SupplierCorporateGroup?: string;
    SupplierProcurementBlock?: string;
    TaxNumber1?: string;
    TaxNumber2?: string;
    TaxNumber3?: string;
    TaxNumber4?: string;
    TaxNumber5?: string;
    TaxNumberResponsible?: string;
    TaxNumberType?: string;
    SuplrProofOfDelivRlvtCode?: string;
    BR_TaxIsSplit?: boolean;
    DataExchangeInstructionKey?: string;
    JP_SuplrAmtInCapitalAmount?: number;
    JP_SupplierCapitalAmountCrcy?: string;
  }
  
  export interface A_SupplierCompanyType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 25) */
    CompanyCodeName?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PaymentBlockingReason?: string;
    /** OData type: Edm.Boolean */
    SupplierIsBlockedForPosting?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    AccountingClerk?: string;
    /** OData type: Edm.String (maxLength: 31) */
    AccountingClerkFaxNumber?: string;
    /** OData type: Edm.String (maxLength: 30) */
    AccountingClerkPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 15) */
    SupplierClerk?: string;
    /** OData type: Edm.String (maxLength: 130) */
    SupplierClerkURL?: string;
    /** OData type: Edm.String (maxLength: 10) */
    PaymentMethodsList?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentReason?: string;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentTerms?: string;
    /** OData type: Edm.Boolean */
    ClearCustomerSupplier?: boolean;
    /** OData type: Edm.Boolean */
    IsToBeLocallyProcessed?: boolean;
    /** OData type: Edm.Boolean */
    ItemIsToBePaidSeparately?: boolean;
    /** OData type: Edm.Boolean */
    PaymentIsToBeSentByEDI?: boolean;
    /** OData type: Edm.String (maxLength: 5) */
    HouseBank?: string;
    /** OData type: Edm.Decimal (precision: 3) */
    CheckPaidDurationInDays?: number;
    /** OData type: Edm.String (maxLength: 5) */
    Currency?: string;
    /** OData type: Edm.Decimal (precision: 14, scale: 3) */
    BillOfExchLmtAmtInCoCodeCrcy?: number;
    /** OData type: Edm.String (maxLength: 12) */
    SupplierClerkIDBySupplier?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ReconciliationAccount?: string;
    /** OData type: Edm.String (maxLength: 2) */
    InterestCalculationCode?: string;
    /** OData type: Edm.DateTime */
    InterestCalculationDate?: any;
    /** OData type: Edm.String (maxLength: 2) */
    IntrstCalcFrequencyInMonths?: string;
    /** OData type: Edm.String (maxLength: 10) */
    SupplierHeadOffice?: string;
    /** OData type: Edm.String (maxLength: 10) */
    AlternativePayee?: string;
    /** OData type: Edm.String (maxLength: 3) */
    LayoutSortingRule?: string;
    /** OData type: Edm.String (maxLength: 4) */
    APARToleranceGroup?: string;
    /** OData type: Edm.DateTime */
    SupplierCertificationDate?: any;
    /** OData type: Edm.String (maxLength: 30) */
    SupplierAccountNote?: string;
    /** OData type: Edm.String (maxLength: 3) */
    WithholdingTaxCountry?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.String (maxLength: 10) */
    CashPlanningGroup?: string;
    /** OData type: Edm.Boolean */
    IsToBeCheckedForDuplicates?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    MinorityGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SupplierAccountGroup?: string;
  }
  
  export interface CreateA_SupplierCompanyTypeRequest {
    AuthorizationGroup?: string;
    CompanyCodeName?: string;
    PaymentBlockingReason?: string;
    SupplierIsBlockedForPosting?: boolean;
    AccountingClerk?: string;
    AccountingClerkFaxNumber?: string;
    AccountingClerkPhoneNumber?: string;
    SupplierClerk?: string;
    SupplierClerkURL?: string;
    PaymentMethodsList?: string;
    PaymentReason?: string;
    PaymentTerms?: string;
    ClearCustomerSupplier?: boolean;
    IsToBeLocallyProcessed?: boolean;
    ItemIsToBePaidSeparately?: boolean;
    PaymentIsToBeSentByEDI?: boolean;
    HouseBank?: string;
    CheckPaidDurationInDays?: number;
    Currency?: string;
    BillOfExchLmtAmtInCoCodeCrcy?: number;
    SupplierClerkIDBySupplier?: string;
    ReconciliationAccount?: string;
    InterestCalculationCode?: string;
    InterestCalculationDate?: any;
    IntrstCalcFrequencyInMonths?: string;
    SupplierHeadOffice?: string;
    AlternativePayee?: string;
    LayoutSortingRule?: string;
    APARToleranceGroup?: string;
    SupplierCertificationDate?: any;
    SupplierAccountNote?: string;
    WithholdingTaxCountry?: string;
    DeletionIndicator?: boolean;
    CashPlanningGroup?: string;
    IsToBeCheckedForDuplicates?: boolean;
    MinorityGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface UpdateA_SupplierCompanyTypeRequest {
    Supplier?: string;
    CompanyCode?: string;
    AuthorizationGroup?: string;
    CompanyCodeName?: string;
    PaymentBlockingReason?: string;
    SupplierIsBlockedForPosting?: boolean;
    AccountingClerk?: string;
    AccountingClerkFaxNumber?: string;
    AccountingClerkPhoneNumber?: string;
    SupplierClerk?: string;
    SupplierClerkURL?: string;
    PaymentMethodsList?: string;
    PaymentReason?: string;
    PaymentTerms?: string;
    ClearCustomerSupplier?: boolean;
    IsToBeLocallyProcessed?: boolean;
    ItemIsToBePaidSeparately?: boolean;
    PaymentIsToBeSentByEDI?: boolean;
    HouseBank?: string;
    CheckPaidDurationInDays?: number;
    Currency?: string;
    BillOfExchLmtAmtInCoCodeCrcy?: number;
    SupplierClerkIDBySupplier?: string;
    ReconciliationAccount?: string;
    InterestCalculationCode?: string;
    InterestCalculationDate?: any;
    IntrstCalcFrequencyInMonths?: string;
    SupplierHeadOffice?: string;
    AlternativePayee?: string;
    LayoutSortingRule?: string;
    APARToleranceGroup?: string;
    SupplierCertificationDate?: any;
    SupplierAccountNote?: string;
    WithholdingTaxCountry?: string;
    DeletionIndicator?: boolean;
    CashPlanningGroup?: string;
    IsToBeCheckedForDuplicates?: boolean;
    MinorityGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface A_SupplierCompanyTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_SupplierCompanyTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_SupplierCompanyTextTypeRequest {
    Supplier?: string;
    CompanyCode?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_SupplierDunningType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    DunningArea: string;
    /** OData type: Edm.String (maxLength: 1) */
    DunningBlock?: string;
    /** OData type: Edm.String (maxLength: 1) */
    DunningLevel?: string;
    /** OData type: Edm.String (maxLength: 4) */
    DunningProcedure?: string;
    /** OData type: Edm.String (maxLength: 10) */
    DunningRecipient?: string;
    /** OData type: Edm.DateTime */
    LastDunnedOn?: any;
    /** OData type: Edm.DateTime */
    LegDunningProcedureOn?: any;
    /** OData type: Edm.String (maxLength: 2) */
    DunningClerk?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SupplierAccountGroup?: string;
  }
  
  export interface CreateA_SupplierDunningTypeRequest {
    DunningBlock?: string;
    DunningLevel?: string;
    DunningProcedure?: string;
    DunningRecipient?: string;
    LastDunnedOn?: any;
    LegDunningProcedureOn?: any;
    DunningClerk?: string;
    AuthorizationGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface UpdateA_SupplierDunningTypeRequest {
    Supplier?: string;
    CompanyCode?: string;
    DunningArea?: string;
    DunningBlock?: string;
    DunningLevel?: string;
    DunningProcedure?: string;
    DunningRecipient?: string;
    LastDunnedOn?: any;
    LegDunningProcedureOn?: any;
    DunningClerk?: string;
    AuthorizationGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface A_SupplierPartnerFuncType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    PurchasingOrganization: string;
    /** OData type: Edm.String (maxLength: 6) */
    SupplierSubrange: string;
    /** OData type: Edm.String (maxLength: 4) */
    Plant: string;
    /** OData type: Edm.String (maxLength: 2) */
    PartnerFunction: string;
    /** OData type: Edm.String (maxLength: 3) */
    PartnerCounter: string;
    /** OData type: Edm.Boolean */
    DefaultPartner?: boolean;
    /** OData type: Edm.DateTime */
    CreationDate?: any;
    /** OData type: Edm.String (maxLength: 12) */
    CreatedByUser?: string;
    /** OData type: Edm.String (maxLength: 10) */
    ReferenceSupplier?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_SupplierPartnerFuncTypeRequest {
    DefaultPartner?: boolean;
    CreationDate?: any;
    CreatedByUser?: string;
    ReferenceSupplier?: string;
    AuthorizationGroup?: string;
  }
  
  export interface UpdateA_SupplierPartnerFuncTypeRequest {
    Supplier?: string;
    PurchasingOrganization?: string;
    SupplierSubrange?: string;
    Plant?: string;
    PartnerFunction?: string;
    PartnerCounter?: string;
    DefaultPartner?: boolean;
    CreationDate?: any;
    CreatedByUser?: string;
    ReferenceSupplier?: string;
    AuthorizationGroup?: string;
  }
  
  export interface A_SupplierPurchasingOrgType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    PurchasingOrganization: string;
    /** OData type: Edm.Boolean */
    AutomaticEvaluatedRcptSettlmt?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    CalculationSchemaGroupCode?: string;
    /** OData type: Edm.Boolean */
    DeletionIndicator?: boolean;
    /** OData type: Edm.Boolean */
    EvaldReceiptSettlementIsActive?: boolean;
    /** OData type: Edm.String (maxLength: 3) */
    IncotermsClassification?: string;
    /** OData type: Edm.String (maxLength: 28) */
    IncotermsTransferLocation?: string;
    /** OData type: Edm.String (maxLength: 4) */
    IncotermsVersion?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation1?: string;
    /** OData type: Edm.String (maxLength: 70) */
    IncotermsLocation2?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc1AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnLoc2AddlUUID?: string;
    /** OData type: Edm.Guid */
    IncotermsSupChnDvtgLocAddlUUID?: string;
    /** OData type: Edm.String (maxLength: 1) */
    IntrastatCrsBorderTrMode?: string;
    /** OData type: Edm.Boolean */
    InvoiceIsGoodsReceiptBased?: boolean;
    /** OData type: Edm.Boolean */
    InvoiceIsMMServiceEntryBased?: boolean;
    /** OData type: Edm.Decimal (precision: 3) */
    MaterialPlannedDeliveryDurn?: number;
    /** OData type: Edm.Decimal (precision: 14, scale: 3) */
    MinimumOrderAmount?: number;
    /** OData type: Edm.String (maxLength: 4) */
    PaymentTerms?: string;
    /** OData type: Edm.String (maxLength: 3) */
    PlanningCycle?: string;
    /** OData type: Edm.String (maxLength: 1) */
    PricingDateControl?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ProdStockAndSlsDataTransfPrfl?: string;
    /** OData type: Edm.String (maxLength: 4) */
    ProductUnitGroup?: string;
    /** OData type: Edm.Boolean */
    PurOrdAutoGenerationIsAllowed?: boolean;
    /** OData type: Edm.String (maxLength: 5) */
    PurchaseOrderCurrency?: string;
    /** OData type: Edm.String (maxLength: 3) */
    PurchasingGroup?: string;
    /** OData type: Edm.Boolean */
    PurchasingIsBlockedForSupplier?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    RoundingProfile?: string;
    /** OData type: Edm.String (maxLength: 2) */
    ShippingCondition?: string;
    /** OData type: Edm.Boolean */
    SuplrDiscountInKindIsGranted?: boolean;
    /** OData type: Edm.Boolean */
    SuplrInvcRevalIsAllowed?: boolean;
    /** OData type: Edm.Boolean */
    SuplrIsRlvtForSettlmtMgmt?: boolean;
    /** OData type: Edm.Boolean */
    SuplrPurgOrgIsRlvtForPriceDetn?: boolean;
    /** OData type: Edm.String (maxLength: 1) */
    SupplierABCClassificationCode?: string;
    /** OData type: Edm.String (maxLength: 12) */
    SupplierAccountNumber?: string;
    /** OData type: Edm.Boolean */
    SupplierIsReturnsSupplier?: boolean;
    /** OData type: Edm.String (maxLength: 16) */
    SupplierPhoneNumber?: string;
    /** OData type: Edm.String (maxLength: 30) */
    SupplierRespSalesPersonName?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SupplierConfirmationControlKey?: string;
    /** OData type: Edm.Boolean */
    IsOrderAcknRqd?: boolean;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
    /** OData type: Edm.String (maxLength: 4) */
    SupplierAccountGroup?: string;
  }
  
  export interface CreateA_SupplierPurchasingOrgTypeRequest {
    AutomaticEvaluatedRcptSettlmt?: boolean;
    CalculationSchemaGroupCode?: string;
    DeletionIndicator?: boolean;
    EvaldReceiptSettlementIsActive?: boolean;
    IncotermsClassification?: string;
    IncotermsTransferLocation?: string;
    IncotermsVersion?: string;
    IncotermsLocation1?: string;
    IncotermsLocation2?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    IntrastatCrsBorderTrMode?: string;
    InvoiceIsGoodsReceiptBased?: boolean;
    InvoiceIsMMServiceEntryBased?: boolean;
    MaterialPlannedDeliveryDurn?: number;
    MinimumOrderAmount?: number;
    PaymentTerms?: string;
    PlanningCycle?: string;
    PricingDateControl?: string;
    ProdStockAndSlsDataTransfPrfl?: string;
    ProductUnitGroup?: string;
    PurOrdAutoGenerationIsAllowed?: boolean;
    PurchaseOrderCurrency?: string;
    PurchasingGroup?: string;
    PurchasingIsBlockedForSupplier?: boolean;
    RoundingProfile?: string;
    ShippingCondition?: string;
    SuplrDiscountInKindIsGranted?: boolean;
    SuplrInvcRevalIsAllowed?: boolean;
    SuplrIsRlvtForSettlmtMgmt?: boolean;
    SuplrPurgOrgIsRlvtForPriceDetn?: boolean;
    SupplierABCClassificationCode?: string;
    SupplierAccountNumber?: string;
    SupplierIsReturnsSupplier?: boolean;
    SupplierPhoneNumber?: string;
    SupplierRespSalesPersonName?: string;
    SupplierConfirmationControlKey?: string;
    IsOrderAcknRqd?: boolean;
    AuthorizationGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface UpdateA_SupplierPurchasingOrgTypeRequest {
    Supplier?: string;
    PurchasingOrganization?: string;
    AutomaticEvaluatedRcptSettlmt?: boolean;
    CalculationSchemaGroupCode?: string;
    DeletionIndicator?: boolean;
    EvaldReceiptSettlementIsActive?: boolean;
    IncotermsClassification?: string;
    IncotermsTransferLocation?: string;
    IncotermsVersion?: string;
    IncotermsLocation1?: string;
    IncotermsLocation2?: string;
    IncotermsSupChnLoc1AddlUUID?: string;
    IncotermsSupChnLoc2AddlUUID?: string;
    IncotermsSupChnDvtgLocAddlUUID?: string;
    IntrastatCrsBorderTrMode?: string;
    InvoiceIsGoodsReceiptBased?: boolean;
    InvoiceIsMMServiceEntryBased?: boolean;
    MaterialPlannedDeliveryDurn?: number;
    MinimumOrderAmount?: number;
    PaymentTerms?: string;
    PlanningCycle?: string;
    PricingDateControl?: string;
    ProdStockAndSlsDataTransfPrfl?: string;
    ProductUnitGroup?: string;
    PurOrdAutoGenerationIsAllowed?: boolean;
    PurchaseOrderCurrency?: string;
    PurchasingGroup?: string;
    PurchasingIsBlockedForSupplier?: boolean;
    RoundingProfile?: string;
    ShippingCondition?: string;
    SuplrDiscountInKindIsGranted?: boolean;
    SuplrInvcRevalIsAllowed?: boolean;
    SuplrIsRlvtForSettlmtMgmt?: boolean;
    SuplrPurgOrgIsRlvtForPriceDetn?: boolean;
    SupplierABCClassificationCode?: string;
    SupplierAccountNumber?: string;
    SupplierIsReturnsSupplier?: boolean;
    SupplierPhoneNumber?: string;
    SupplierRespSalesPersonName?: string;
    SupplierConfirmationControlKey?: string;
    IsOrderAcknRqd?: boolean;
    AuthorizationGroup?: string;
    SupplierAccountGroup?: string;
  }
  
  export interface A_SupplierPurchasingOrgTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    PurchasingOrganization: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_SupplierPurchasingOrgTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_SupplierPurchasingOrgTextTypeRequest {
    Supplier?: string;
    PurchasingOrganization?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_SupplierTextType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 2) */
    Language: string;
    /** OData type: Edm.String (maxLength: 4) */
    LongTextID: string;
    /** OData type: Edm.String */
    LongText?: string;
  }
  
  export interface CreateA_SupplierTextTypeRequest {
    LongText?: string;
  }
  
  export interface UpdateA_SupplierTextTypeRequest {
    Supplier?: string;
    Language?: string;
    LongTextID?: string;
    LongText?: string;
  }
  
  export interface A_SupplierWithHoldingTaxType {
    /** OData type: Edm.String (maxLength: 10) */
    Supplier: string;
    /** OData type: Edm.String (maxLength: 4) */
    CompanyCode: string;
    /** OData type: Edm.String (maxLength: 2) */
    WithholdingTaxType: string;
    /** OData type: Edm.DateTime */
    ExemptionDateBegin?: any;
    /** OData type: Edm.DateTime */
    ExemptionDateEnd?: any;
    /** OData type: Edm.String (maxLength: 2) */
    ExemptionReason?: string;
    /** OData type: Edm.Boolean */
    IsWithholdingTaxSubject?: boolean;
    /** OData type: Edm.String (maxLength: 2) */
    RecipientType?: string;
    /** OData type: Edm.String (maxLength: 25) */
    WithholdingTaxCertificate?: string;
    /** OData type: Edm.String (maxLength: 2) */
    WithholdingTaxCode?: string;
    /** OData type: Edm.Decimal (precision: 5, scale: 2) */
    WithholdingTaxExmptPercent?: number;
    /** OData type: Edm.String (maxLength: 16) */
    WithholdingTaxNumber?: string;
    /** OData type: Edm.String (maxLength: 4) */
    AuthorizationGroup?: string;
  }
  
  export interface CreateA_SupplierWithHoldingTaxTypeRequest {
    ExemptionDateBegin?: any;
    ExemptionDateEnd?: any;
    ExemptionReason?: string;
    IsWithholdingTaxSubject?: boolean;
    RecipientType?: string;
    WithholdingTaxCertificate?: string;
    WithholdingTaxCode?: string;
    WithholdingTaxExmptPercent?: number;
    WithholdingTaxNumber?: string;
    AuthorizationGroup?: string;
  }

/**
 * Utility types for type-safe field selection in select arrays
 * Usage: select: ["Field1", "Field2"] as SelectFields<EntityName>
 */

/**
 * Type helper for type-safe select field arrays
 * Provides autocomplete for entity field names
 */
export type SelectFields<T> = Array<keyof T>;
  
  export interface UpdateA_SupplierWithHoldingTaxTypeRequest {
    Supplier?: string;
    CompanyCode?: string;
    WithholdingTaxType?: string;
    ExemptionDateBegin?: any;
    ExemptionDateEnd?: any;
    ExemptionReason?: string;
    IsWithholdingTaxSubject?: boolean;
    RecipientType?: string;
    WithholdingTaxCertificate?: string;
    WithholdingTaxCode?: string;
    WithholdingTaxExmptPercent?: number;
    WithholdingTaxNumber?: string;
    AuthorizationGroup?: string;
  }

/**
 * Utility types for type-safe field selection in select arrays
 * Usage: select: ["Field1", "Field2"] as SelectFields<EntityName>
 */

/**
 * Type helper for type-safe select field arrays
 * Provides autocomplete for entity field names
 */
export type SelectFields<T> = Array<keyof T>;
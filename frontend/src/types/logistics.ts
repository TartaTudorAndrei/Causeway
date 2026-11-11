export type LocationType = 'DEPOSIT' | 'STAND';

export interface StockLocation {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  description?: string;
  isSystem?: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string; // e.g. 'pcs', 'kg', 'liters', 'box'
  photoUrl?: string;
  notes?: string;
  isSellable?: boolean;
  sellable?: boolean;
  isMug?: boolean;
  mug?: boolean;
  minSafetyStock?: number;
  leadTimeDays?: number;
  targetStock?: number;
  dailyBurnRate?: number;
}



export interface ItemPredictionDetail {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  isSellable?: boolean;
  isMug?: boolean;
  totalCurrentStock: number;
  baseDailyBurnRate: number;
  minSafetyStock: number;
  leadTimeDays: number;
  targetStock: number;
  reorderPoint: number;
  daysRemaining: number;
  projectedRunoutDate?: string;
  status: 'DEPLETED' | 'CRITICAL_RUNOUT' | 'WARNING_LOW' | 'HEALTHY';
  willRunOutDuringPeakEvent: boolean;
  depletingEventName?: string;
  recommendedRestockQuantity: number;
  dailyForecast: DailyStockForecast[];
}

export interface SpecialDemandEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  demandMultiplier: number;
  demandTag?: string;
}

export interface StockPredictionResponse {
  predictions: ItemPredictionDetail[];
  criticalItemsCount: number;
  warningItemsCount: number;
  healthyItemsCount: number;
  upcomingSpecialEvents: SpecialDemandEvent[];
}

export interface UpdateItemThresholdsRequest {
  minSafetyStock?: number;
  leadTimeDays?: number;
  targetStock?: number;
  dailyBurnRate?: number;
}

export interface LocationStock {
  itemId: string;
  locationId: string;
  quantity: number;
}

export interface TransferItemRequest {
  itemId: string;
  quantity: number;
}

export interface StockTransferRecord {
  id: string;
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  timestamp: string;
  performedBy: string;
  notes?: string;
}

export type AdjustmentReason =
  | 'INVENTORY_COUNT'
  | 'DAMAGE'
  | 'LOSS'
  | 'CORRECTION'
  | 'RESTOCK'
  | 'OTHER';

export interface StockAdjustmentRecord {
  id: string;
  itemId: string;
  locationId: string;
  previousQuantity: number;
  newQuantity: number;
  quantityChange: number;
  reason: string;
  notes?: string;
  performedBy: string;
  timestamp: string;
}

export interface StockAdjustmentRequest {
  itemId: string;
  locationId: string;
  newQuantity: number;
  reason: string;
  notes?: string;
  performedBy?: string;
}

export interface LogisticsEoDMugItem {
  itemId: string;
  itemName: string;
  countRemaining: number;
}

export interface LogisticsEoDSubmitRequest {
  standId?: string;
  standName: string;
  closingPersonName: string;
  notes?: string;
  mugCounts: LogisticsEoDMugItem[];
}

export interface LogisticsEoDReport {
  id: string;
  standId?: string;
  standName: string;
  closingPersonName: string;
  closedAt: string;
  notes?: string;
  mugCounts: {
    id: string;
    itemId: string;
    itemName: string;
    countRemaining: number;
  }[];
}

export interface StandItemStat {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  isSellable?: boolean;
  isMug?: boolean;
  openedCount: number;
  restockedCount: number;
  totalTransferredIn: number;
  transferredOut: number;
  netSupplied: number;
  endedCount: number;
  soldCount: number;
  sellThroughRate: number;
}

export interface StandTransferAudit {
  transferId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }[];
  timestamp: string;
  performedBy: string;
  notes?: string;
}

export interface StandStatisticsRecord {
  standId: string;
  standName: string;
  locationName: string;
  eventName?: string;
  eventDate?: string;
  status: string;
  isClosed: boolean;
  eodReportId?: string;
  closedAt?: string;
  closingPersonName?: string;
  closingNotes?: string;
  totalMugsOpened: number;
  totalMugsRestocked: number;
  totalMugsTransferredIn: number;
  totalMugsTransferredOut: number;
  totalMugsSupplied: number;
  totalMugsEnded: number;
  totalMugsSold: number;
  mugSellThroughRate: number;
  itemStats: StandItemStat[];
  transfers: StandTransferAudit[];
}
export interface DailyStockForecast {
  date: string;
  dayOfWeek: string;
  dayWeight: number;
  eventMultiplier: number;
  specialEventTitle?: string;
  specialEventTag?: string;
  weatherMultiplier?: number;
  weatherCondition?: string;
  tempMax?: number;
  tempMin?: number;
  activeStandsCount?: number;
  totalScheduledShifts?: number;
  projectedDemand: number;
  projectedStockRemaining: number;
  isRunoutDay: boolean;
}

export interface ShiftSummaryDTO {
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
}

export interface WeatherSummaryDTO {
  date: string;
  tempMax: number;
  tempMin: number;
  multiplier: number;
  conditionCode: string;
  conditionLabel: string;
}

export interface CampaignStandOptionDTO {
  id: string;
  name: string;
  locationName: string;
  eventDate: string;
  status: string;
  cadenceLabel: string;
}

export interface StandDispatchItemDetail {
  itemId: string;
  itemName: string;
  sku: string;
  category: string;
  unit: string;
  isSellable?: boolean;
  isMug?: boolean;
  currentStandStock: number;
  baseBurnRatePerShift: number;
  forecastedDemand: number;
  safetyBuffer: number;
  suggestedPackQuantity: number;
}

export interface StandDispatchPrepResponse {
  standId?: string;
  standName?: string;
  locationName?: string;
  eventDate?: string;
  status?: string;
  cadenceCode?: string;
  cadenceLabel?: string;
  activeShiftsCount: number;
  shifts: ShiftSummaryDTO[];
  weather?: WeatherSummaryDTO;
  items: StandDispatchItemDetail[];
  allCampaignStands: CampaignStandOptionDTO[];
}

export interface RefillStepDTO {
  sourceLocationId: string;
  sourceLocationName: string;
  sourceLocationType: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  quantityToPickup: number;
  stockAvailableAtLocation: number;
  distanceMeters: number;
  distanceFormatted: string;
  transitMinutes: number;
  transitMode: 'WALK' | 'DRIVE';
  navigationUrl?: string;
}

export interface RefillOptionDTO {
  strategyCode: 'EXPRESS' | 'WALKING_EMERGENCY' | 'MULTI_STOP';
  strategyName: string;
  totalFulfilledQuantity: number;
  requestedQuantity: number;
  fulfillmentPercentage: number;
  isFullFulfillment: boolean;
  totalDistanceMeters: number;
  totalDistanceFormatted: string;
  totalTransitMinutes: number;
  totalTimeFormatted: string;
  primaryTransitMode: 'WALK' | 'DRIVE';
  steps: RefillStepDTO[];
  summaryNotes?: string;
}

export interface RefillOptimizerResponse {
  destinationLocationId: string;
  destinationLocationName: string;
  itemId: string;
  itemName: string;
  unit: string;
  requestedQuantity: number;
  currentDestinationStock: number;
  option1Express: RefillOptionDTO;
  option2WalkingEmergency: RefillOptionDTO;
  option3MultiStop: RefillOptionDTO;
}

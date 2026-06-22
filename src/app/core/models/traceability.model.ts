export interface TraceApiResponse {
  success: boolean;
  journey: TraceabilityJourney;
}

export interface TraceabilityJourney {
  product: TraceProduct;
  seed: TraceSeed | null;
  cropCycle: TraceCropCycle | null;
  farmingActivities: TraceFarmingActivity[];
  farmland: TraceFarmland | null;
  harvest: TraceHarvest | null;
  processing: TraceProcessing[];
  packaging: TracePackaging | null;
  logistics: TraceLogistics | null;
  qualityChecks: TraceQualityCheck[];
  authenticity: TraceAuthenticity | null;
}

export interface TraceProduct {
  name: string;
  sku: string;
  unitSize: string | null;
  fssaiNumber: string | null;
  mrp: number | null;
  batchCode: string | null;
  shelfLifeDays: number | null;
}

export interface TraceSeed {
  seedCode: string;
  cropName: string;
  variety: string | null;
  source: string;
  purchaseDate: string | null;
  isOrganic: boolean;
  certificationUrl: string | null;
}

export interface TraceFarmer {
  name: string;
  age: number | null;
  experience: number | string | null;
  photoUrl: string | null;
  place: string | null;
}

export interface TraceCropCycle {
  cycleCode: string;
  cropName: string;
  sowingDate: string | null;
  expectedHarvestDate: string | null;
  actualHarvestDate: string | null;
  status: string | null;
  patchName: string | null;
  patchCode: string | null;
  blockName: string | null;
  blockCode: string | null;
  seedCode: string | null;
  sourceOfSeed: string | null;
  scientificName: string | null;
  season: string | null;
  naturalFarmingTechniques: string | null;
  cropGrade: string | null;
  farmer: TraceFarmer | null;
}

export interface TraceFarmlandBlock {
  name: string;
  code: string;
  areaSqft: number | null;
  description: string | null;
  facilityType: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  villageName: string | null;
  district: string | null;
  state: string | null;
  googleMapsUrl: string | null;
}

export interface TraceFarmlandPatch {
  name: string;
  code: string;
  sizeSqft: number | null;
  crop: string | null;
}

export interface TraceFarmlandWorkEntry {
  tag: string;
  task: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

export interface TraceFarmland {
  block: TraceFarmlandBlock | null;
  patch: TraceFarmlandPatch | null;
  workEntries: TraceFarmlandWorkEntry[];
}

export interface TraceFarmingActivity {
  activityType: string;
  description: string | null;
  date: string | null;
  mediaUrls: string[];
}

export interface TraceHarvest {
  batchCode: string;
  harvestDate: string | null;
  cropName: string;
  rawQuantity: string | null;
  qualityGrade: string | null;
  moistureLevel: number | null;
  harvestType: string | null;
  storedAt: string | null;
  curedUntil: string | null;
  storageFacilityName: string | null;
  storageCondition: string | null;
  curingDurationDays: number | null;
}

export interface TraceProcessingStep {
  stepType: string;
  stepName: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  inputWeightKg: number | null;
  outputWeightKg: number | null;
  wastageKg: number | null;
  notes: string | null;
}

export interface TraceProcessing {
  processingCode: string;
  processType: string;
  startedAt: string | null;
  completedAt: string | null;
  status: string;
  steps: TraceProcessingStep[] | string | null;
}

export interface TracePackaging {
  packagingCode: string;
  packagingDate: string | null;
  manufacturingDate: string | null;
  expiryDate: string | null;
  totalUnits: number | null;
  unitSize: string | null;
  status: string | null;
  warehouseReceivedAt: string | null;
  warehouseDispatchedAt: string | null;
  warehouseName: string | null;
  warehouseDurationDays: number | null;
}

export interface TraceLogisticsStep {
  stepType: string;
  stepName: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  location: string | null;
  referenceNumber: string | null;
  recipientName: string | null;
  notes: string | null;
}

export interface TraceLogistics {
  batchCode: string;
  origin: string | null;
  destination: string | null;
  carrier: string | null;
  vehicleNumber: string | null;
  status: string | null;
  invoiceNumber: string | null;
  fssaiBatchNo: string | null;
  deliveredAt: string | null;
  steps: TraceLogisticsStep[];
}

export interface TraceQualityCheck {
  checkType: string;
  result: string;
  grade: string | null;
  checkedAt: string | null;
  notes: string | null;
}

export interface TraceAuthenticity {
  qrCode: string;
  verifiedAt: string;
  scanCount: number;
  message: string;
}

// ── Crop Delivery Models (Stages 10–12) ───────────────────────────────────

export interface ShiprocketTrackingEvent {
  id?: number;
  status: string;
  location: string;
  activity: string;
  timestamp: string;
  courier_status: string;
  courier_status_code?: string;
  created_at?: string;
}

export interface ShiprocketOrderTracking {
  id?: number;
  order?: number;
  order_number: string;
  order_status?: string;
  awb_number?: string;
  estimated_delivery?: string;
  pickup_scheduled_at?: string;
  status: string;
  tracking_events: ShiprocketTrackingEvent[];
}

export interface ShiprocketSubShipment {
  id?: number;
  subscription?: number;
  subscription_number?: string;
  awb_number?: string;
  estimated_delivery?: string;
  pickup_scheduled_at?: string;
  status: string;
  tracking_events: ShiprocketTrackingEvent[];
}

export interface CropOrderProductDetails {
  id: number;
  product_name: string;
  product_category: string;
  weight?: string;
  weight_unit?: string;
  price: string;
  final_price?: string;
  crop_cycle_id: string;
  product_images?: { image: string; alt_text: string }[];
}

export interface CropOrderItem {
  quantity: number;
  price: string;
  discount: string;
  total: string;
  product_details: CropOrderProductDetails;
}

export interface CropOrder {
  id: number;
  order_number: string;
  status: string;
  payment_status: string;
  recipient_name: string;
  delivery_address: string;
  subtotal: string;
  delivery_charges: string;
  total: string;
  items_count: number;
  expected_delivery_date?: string;
  created_at: string;
  has_referral_reward: boolean;
  items: CropOrderItem[];
}

export interface CropSubscriptionItem {
  id: number;
  product_name: string;
  quantity: number;
  price: string;
}

export interface CropSubscription {
  id: number;
  plan_name?: string;
  status: string;
  payment_status?: string;
  recipient_name?: string;
  delivery_address?: string;
  delivery_city?: string;
  delivery_state?: string;
  total_deliveries?: number;
  completed_deliveries?: number;
  next_delivery_date?: string;
  subscription_number?: string;
  items: CropSubscriptionItem[];
}

export interface CropCycleOrdersResponse {
  orders: CropOrder[];
  subscriptions: CropSubscription[];
}

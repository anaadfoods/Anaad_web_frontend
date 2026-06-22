import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TraceabilityService } from '../core/services/traceability.service';
import { AuthService } from '../core/services/auth.service';
import { AuthState } from '../core/state/auth.state';
import {
  TraceabilityJourney,
  TraceProduct,
  TraceSeed,
  TraceCropCycle,
  TraceFarmer,
  TraceFarmingActivity,
  TraceFarmland,
  TraceFarmlandBlock,
  TraceFarmlandWorkEntry,
  TraceHarvest,
  TraceProcessing,
  TracePackaging,
  TraceLogistics,
  TraceQualityCheck,
  TraceAuthenticity,
  TraceProcessingStep,
  CropOrder,
  CropSubscription,
  ShiprocketOrderTracking,
  ShiprocketSubShipment
} from '../core/models/traceability.model';

type StageEffect =
  | 'seeds'
  | 'motes'
  | 'crop'
  | 'chaff'
  | 'fire'
  | 'dust'
  | 'package'
  | 'silo'
  | 'warehouse'
  | 'wheel'
  | 'route'
  | 'steam'
  | 'halo';

interface Stage {
  id: number;
  title: string;
  summary: string;
  detail: string;
  image: string;
  alt: string;
  effect: StageEffect;
  align: 'left' | 'right';
  artShiftX: number;
  artShiftY: number;
  copyShiftX: number;
  copyShiftY: number;
  frameTilt: number;
  artWidth: string;
  dawnGlow?: boolean;
  imageFit?: 'cover' | 'contain';
  imageAspect?: string;
  imagePosition?: 'top' | 'center';
}

interface StageBadge {
  label: string;
  tone: 'green' | 'gold' | 'neutral';
}

interface VineLeaf {
  x: number;
  y: number;
  rot: number;
  flip: boolean;
  t: number;
}

interface Blossom {
  x: number;
  y: number;
  t: number;
}

interface Particle {
  left: number;
  delay: number;
  dur: number;
  size: number;
  drift: number;
}

interface RouteNode {
  left: number;
  top: number;
  delay: number;
}

interface CanvasSeed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  sprouted: boolean;
  sproutProgress: number;
  color: string;
}

@Component({
  selector: 'app-traceability-journey',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet],
  templateUrl: './traceability-journey.component.html',
  styleUrl: './traceability-journey.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TraceabilityJourneyComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('journeyRoot') private journeyRoot?: ElementRef<HTMLElement>;
  @ViewChild('vinePath') private vinePath?: ElementRef<SVGPathElement>;
  @ViewChildren('scene') private sceneRefs?: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('gravityCanvas') private gravityCanvas?: ElementRef<HTMLCanvasElement>;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly traceabilityService = inject(TraceabilityService);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly authState = inject(AuthState);

  // ΓöÇΓöÇ Traceability API State ΓöÇΓöÇ
  protected readonly currentQrCode = signal<string>('QR-ANAAD-ATTA5KG-000045');
  protected readonly currentCropId = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly traceError = signal<string | null>(null);
  protected readonly journey = signal<TraceabilityJourney | null>(null);

  // Computed signals for each API section
  protected readonly traceProduct = computed(() => this.journey()?.product ?? null);
  protected readonly traceSeed = computed(() => this.journey()?.seed ?? null);
  protected readonly traceCropCycle = computed(() => this.journey()?.cropCycle ?? null);
  protected readonly traceFarmer = computed(() => this.journey()?.cropCycle?.farmer ?? null);
  protected readonly farmerPhotoUrl = computed(() => this.resolveFarmerPhoto(this.traceFarmer()));
  protected readonly traceFarmland = computed(() => this.journey()?.farmland ?? null);
  protected readonly traceFarmingActivities = computed(() => this.journey()?.farmingActivities ?? []);
  protected readonly traceFarmlandWorkEntries = computed(() => this.journey()?.farmland?.workEntries ?? []);
  protected readonly traceHarvest = computed(() => this.journey()?.harvest ?? null);
  protected readonly traceProcessing = computed(() => this.journey()?.processing ?? []);
  protected readonly tracePackaging = computed(() => this.journey()?.packaging ?? null);
  protected readonly traceLogistics = computed(() => this.journey()?.logistics ?? null);
  protected readonly traceQualityChecks = computed(() => this.journey()?.qualityChecks ?? []);
  protected readonly traceAuthenticity = computed(() => this.journey()?.authenticity ?? null);
  protected readonly hasJourney = computed(() => this.journey() !== null);

  // ── Delivery Unlock State (Stages 10–12) ─────────────────────────────────
  protected readonly isUnlocked = signal(false);
  protected readonly unlockPhone = signal('');
  protected readonly deliveryPhoneSubmitted = signal(false);
  protected readonly deliveryLoading = signal(false);
  protected readonly deliveryError = signal<string | null>(null);
  protected readonly deliveryInfo = signal<string | null>(null);
  protected readonly trackingFromFallback = signal(false);
  protected readonly cropOrders = signal<CropOrder[]>([]);
  protected readonly cropSubscriptions = signal<CropSubscription[]>([]);
  protected readonly trackingMode = signal<'order' | 'subscription' | null>(null);
  protected readonly selectedOrderNumber = signal<string | null>(null);
  protected readonly selectedSubNumber = signal<string | null>(null);
  protected readonly orderTracking = signal<ShiprocketOrderTracking | null>(null);
  protected readonly subTracking = signal<ShiprocketSubShipment[] | null>(null);

  protected readonly hasBothTypes = computed(() =>
    this.cropOrders().length > 0 && this.cropSubscriptions().length > 0
  );
  protected readonly hasDeliveryData = computed(() =>
    this.orderTracking() !== null || this.subTracking() !== null
  );
  /** Crop ID for this traceability journey (canonical from API when loaded) */
  protected readonly tracedCropId = computed(() =>
    this.traceCropCycle()?.cycleCode ?? this.currentCropId() ?? this.DEFAULT_CROP_ID
  );

  private pathLength = 0;
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;
  private stageObserver?: IntersectionObserver;
  private vineScale = 1;
  private vbH = 4700;

  protected readonly progress = signal(0);
  protected readonly currentStage = signal(1);
  protected readonly showRegisteredModal = signal(false);
  protected readonly isRegisteredUser = computed(() => this.authState.isAuthenticated());
  protected readonly journeyComplete = computed(() => this.currentStage() === 12);
  protected readonly orbX = signal(110);
  protected readonly orbY = signal(0);
  protected readonly orbAngle = signal(0);
  protected readonly leaves = signal<VineLeaf[]>([]);
  protected readonly blossoms = signal<Blossom[]>([]);

  // Features 8 & 9: Side nav scrolling and cursor trail tracking
  protected readonly trailX = signal(0);
  protected readonly trailY = signal(0);
  protected readonly activeTrailStage = signal<number | null>(null);
  protected readonly windTilt = signal(0);
  protected readonly flippedCard = signal<number | null>(null);
  protected readonly parallaxOffset = signal(0);
  protected readonly heroParallax = signal(0);
  protected readonly flipStampStage = signal<number | null>(null);

  // Liquid Glass Cursor & Holographic 3D Tilt (with Zoom)
  private realMouseX = 0;
  private realMouseY = 0;
  private cursorRafId: number | null = null;
  protected readonly cursorX = signal(0);
  protected readonly cursorY = signal(0);
  protected readonly isHoveringInteractive = signal(false);
  protected readonly isHoveringCard = signal(false);
  protected readonly activeTiltCard = signal<number | null>(null);
  protected readonly tiltType = signal<'copy' | 'art' | null>(null);
  protected readonly cardTiltX = signal(0);
  protected readonly cardTiltY = signal(0);
  protected readonly zoomX = signal(50);
  protected readonly zoomY = signal(50);

  // Vine smooth growth easing loop
  private targetProgress = 0;
  private easedProgress = 0;
  private vineRafId: number | null = null;
  private cachedPoints: { x: number; y: number; angle: number }[] = [];
  private cursorLoopActive = false;
  private canvasLoopActive = false;
  private lastScrollTop = 0;
  private scrollSpeed = 0;
  private flipStampTimer: ReturnType<typeof setTimeout> | null = null;

  // Next-Gen Feature 4: Canvas physics seeds
  private seedsList: CanvasSeed[] = [];
  private vineAnchors: { x: number; y: number }[] = [];
  private canvasRafId: number | null = null;

  // Feature 5: Ambient pollen particles
  protected readonly pollenMotes = Array.from({ length: 20 }, (_, i) => ({
    left: (i * 37 + 11) % 96 + 2,
    size: 2 + (i % 3),
    dur: 18 + (i * 7) % 14,
    delay: (i * 3.7) % 20,
    opacity: 0.06 + (i % 5) * 0.02,
    drift: -20 + (i * 11) % 40
  }));

  protected readonly petalAngles = [0, 72, 144, 216, 288];
  protected readonly stems = Array.from({ length: 7 }, (_, i) => 18 + i * 11);

  protected readonly stages: Stage[] = [
    {
      id: 1,
      title: 'Know your seed',
      summary:
        'Every journey begins with two quiet choices — the seed that carries life forward, and the land that receives it. Before a single grain is sown, the field is readied with prepped cow dung and natural soil care, so the seed meets living soil, not exhausted ground. At ANAAD, we trace both: where the seed came from, and how the land was prepared to welcome it.',
      detail: 'Seed & land preparation: Pending',
      image: 'assets/traceability/stage-1.png',
      alt: 'Seed and prepared field — the first steps of a traceable harvest.',
      effect: 'seeds',
      align: 'right',
      artShiftX: 50,
      artShiftY: -22,
      copyShiftX: -20,
      copyShiftY: 28,
      frameTilt: 4,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 2,
      title: 'Know your farmer',
      summary:
        'Behind every harvest is someone who reads the land. This is the grower who carried this crop through the season — not as a transaction, but as a living relationship with soil, weather, and time.',
      detail: 'Cultivated by: Pending',
      image: 'assets/traceability/stage-2.png',
      alt: 'A farmer standing proudly in a green field.',
      effect: 'motes',
      align: 'left',
      artShiftX: -64,
      artShiftY: 18,
      copyShiftX: 32,
      copyShiftY: -24,
      frameTilt: -5,
      artWidth: 'min(100%, 62rem)',
      dawnGlow: true
    },
    {
      id: 3,
      title: 'The crop cycle',
      summary:
        'A crop is more than grain waiting to be cut. It is a rhythm — sowing, tending, waiting — and every milestone of that rhythm is recorded here, so the field stays present long after the harvest.',
      detail: 'Crop cycle: Pending',
      image: 'assets/traceability/stage-3.png',
      alt: 'Young crop rows rising from a fertile field under warm light.',
      effect: 'crop',
      align: 'right',
      artShiftX: 70,
      artShiftY: -8,
      copyShiftX: -34,
      copyShiftY: 18,
      frameTilt: 3,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 4,
      title: 'Field work',
      summary:
        'Trust grows in the details. Every ploughing, feeding, weeding, and watering is logged as it happens — because how food is cared for matters as much as what it becomes.',
      detail: 'Field activities: Pending',
      image: 'assets/traceability/stage-4.png',
      alt: 'A farmer working in the field with traditional tools.',
      effect: 'chaff',
      align: 'left',
      artShiftX: -78,
      artShiftY: 26,
      copyShiftX: 38,
      copyShiftY: -18,
      frameTilt: -4,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 5,
      title: 'Harvest',
      summary:
        'Harvest is the field speaking back. After months of care, the crop is cut at the right time, and the season\'s effort becomes something real, visible, and ready for the next step in its journey.',
      detail: 'Date of harvest: Pending',
      image: 'assets/traceability/stage-5.png',
      alt: 'A farmer cutting wheat, with full wheat fields behind him and bundles of wheat straw beside him.',
      effect: 'fire',
      align: 'right',
      artShiftX: 48,
      artShiftY: -8,
      copyShiftX: -20,
      copyShiftY: 12,
      frameTilt: 5,
      artWidth: 'min(100%, 21rem)',
      imageFit: 'cover',
      imageAspect: '3 / 5',
      imagePosition: 'center'
    },
    {
      id: 6,
      title: 'Raw material inventory',
      summary:
        'After harvest, the grain does not rush forward. It rests in breathable storage — watched over and held with care until the field\'s patience becomes the mill\'s readiness.',
      detail: 'Storage: Pending',
      image: 'assets/traceability/stage-5.png',
      alt: 'A farmer cutting wheat, with full wheat fields behind him and bundles of wheat straw beside him.',
      effect: 'dust',
      align: 'left',
      artShiftX: -54,
      artShiftY: 14,
      copyShiftX: 24,
      copyShiftY: -20,
      frameTilt: -3,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 7,
      title: 'Processing',
      summary:
        'Here, speed is refused in favour of integrity. The grain moves through slower, gentler methods that preserve what the field worked hard to grow — texture, aroma, and life.',
      detail: 'Processing: Pending',
      image: 'assets/traceability/stage-6.png',
      alt: 'Sacks of grain stored carefully in a traditional interior.',
      effect: 'package',
      align: 'right',
      artShiftX: 84,
      artShiftY: -12,
      copyShiftX: -36,
      copyShiftY: 12,
      frameTilt: 4,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 8,
      title: 'Packaging',
      summary:
        'Each packet is more than a container. It is the moment this batch receives its own identity — weighed, sealed, and made ready to carry its story beyond the farm.',
      detail: 'Packaging: Pending',
      image: 'assets/traceability/stage-8.png',
      alt: 'Anaad products being packed on a work table with sacks and tools.',
      effect: 'wheel',
      align: 'left',
      artShiftX: -70,
      artShiftY: 18,
      copyShiftX: 36,
      copyShiftY: -12,
      frameTilt: -5,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 9,
      title: 'Finished goods inventory',
      summary:
        'Before any product travels, it is accounted for. Every unit enters the warehouse with a timestamp and leaves with one — so nothing moves in silence.',
      detail: 'Warehouse: Pending',
      image: 'assets/traceability/stage-7.png',
      alt: 'Anaad products being processed with traditional methods.',
      effect: 'route',
      align: 'right',
      artShiftX: 76,
      artShiftY: -10,
      copyShiftX: -30,
      copyShiftY: 18,
      frameTilt: 3,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 10,
      title: 'Transit',
      summary:
        'Once the batch leaves the warehouse, the journey continues in motion. Carrier, route, and handover become part of the same traceable thread — never lost between origin and arrival.',
      detail: 'Transit: Pending',
      image: 'assets/traceability/stage-10.png',
      alt: 'A delivery vehicle transporting produce.',
      effect: 'steam',
      align: 'left',
      artShiftX: -62,
      artShiftY: 20,
      copyShiftX: 28,
      copyShiftY: -22,
      frameTilt: -4,
      artWidth: 'min(100%, 62rem)'
    },
    {
      id: 11,
      title: 'Delivery',
      summary:
        'This is where traceability meets the table. The route ends not in abstraction, but at a door — with each milestone recorded as the batch moves closer to you.',
      detail: 'Delivery: Pending',
      image: 'assets/traceability/stage-9.png',
      alt: 'A warehouse with neatly stacked product boxes ready for dispatch.',
      effect: 'halo',
      align: 'right',
      artShiftX: 40,
      artShiftY: -8,
      copyShiftX: -18,
      copyShiftY: 20,
      frameTilt: 2,
      artWidth: 'min(100%, 55rem)',
      dawnGlow: true
    },
    {
      id: 12,
      title: 'Trust complete',
      summary:
        'When every step has been visible, trust does not need to be argued for. It simply stands — verified, scanned, and complete from soil to soul.',
      detail: 'Verification: Pending',
      image: 'assets/traceability/stage-11.png',
      alt: 'A final branded traceability illustration closing the journey.',
      effect: 'halo',
      align: 'left',
      artShiftX: -62,
      artShiftY: 20,
      copyShiftX: 28,
      copyShiftY: -22,
      frameTilt: -4,
      artWidth: 'min(100%, 55rem)',
      dawnGlow: true
    }
  ];

  // Default crop ID for tracking (user can override via ?crop_id= or ?qr= URL params)
  private readonly HARDCODED_QR = 'QR-ANAAD-ATTA5KG-000045';
  private readonly DEFAULT_CROP_ID = 'CC-000019';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const qrParam = params['qr'];
      const cropIdParam = params['crop_id'];
      const unlockedParam = params['unlocked'];
      const accessToken = params['access_token'];
      const refreshToken = params['refresh_token'];

      if (qrParam === 'mock' || qrParam === 'sandbox' || cropIdParam === 'mock' || cropIdParam === 'sandbox') {
        this.currentQrCode.set('mock');
        this.currentCropId.set(null);
        this.loadSandboxData();
      } else if (cropIdParam) {
        this.currentQrCode.set('');
        this.currentCropId.set(cropIdParam);
        this.fetchJourney({ cropId: cropIdParam });
      } else if (qrParam) {
        this.currentQrCode.set(qrParam);
        this.currentCropId.set(null);
        this.fetchJourney({ qrCode: qrParam });
      } else {
        this.currentQrCode.set('');
        this.currentCropId.set(this.DEFAULT_CROP_ID);
        this.fetchJourney({ cropId: this.DEFAULT_CROP_ID });
      }

      // Cross-origin login callback: tokens passed back from web.anaadfoods.com
      if (accessToken && isPlatformBrowser(this.platformId)) {
        if (refreshToken) {
          this.authState.setTokens(accessToken, refreshToken);
        } else {
          this.authState.setAccessToken(accessToken);
        }
        if (unlockedParam === '1') {
          this.isUnlocked.set(true);
        }
        this.authService.fetchProfile().subscribe({
          next: () => this.stripTokensFromUrl(),
          error: () => this.stripTokensFromUrl(),
        });
        return;
      }

      if (unlockedParam === '1' && this.authState.isAuthenticated()) {
        this.isUnlocked.set(true);
      }
    });
  }

  /** Remove JWT tokens from the address bar after cross-origin login */
  private stripTokensFromUrl(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('access_token');
    url.searchParams.delete('refresh_token');
    window.history.replaceState({}, '', url.toString());
  }

  // ── Delivery Unlock Flow ──────────────────────────────────────────────────

  /** Guests see a coming-soon preview modal; registered users unlock delivery in-page */
  isLockedDeliveryStage(stageId: number): boolean {
    return stageId >= 10 && !this.authState.isAuthenticated();
  }

  openDeliveryPreviewModal(): void {
    this.showRegisteredModal.set(true);
  }

  closeDeliveryPreviewModal(): void {
    this.showRegisteredModal.set(false);
  }

  onDeliveryUnlockClick(): void {
    if (!this.authState.isAuthenticated()) {
      this.openDeliveryPreviewModal();
      return;
    }

    this.isUnlocked.set(true);
    this.scrollToDeliveryGate();
  }

  closeRegisteredModal(): void {
    this.closeDeliveryPreviewModal();
  }

  private scrollToDeliveryGate(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    requestAnimationFrame(() => {
      document.querySelector('.delivery-gate')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /** Pad CC-000019 → CC-0000019 (7-digit number part) for the orders API */
  protected tracedCropIdPadded(): string {
    return this.padCropCycleId(this.tracedCropId());
  }

  /** Crop ID shown on an order card (from line items) */
  orderCropId(order: CropOrder): string {
    for (const item of order.items) {
      const id = item.product_details?.crop_cycle_id;
      if (id) return id;
    }
    return this.tracedCropId();
  }

  /** Whether an order belongs to the crop being traced on this page */
  orderMatchesTracedCrop(order: CropOrder): boolean {
    const target = this.tracedCropId();
    return order.items.some(
      item => item.product_details?.crop_cycle_id &&
        this.cropIdsMatch(item.product_details.crop_cycle_id, target)
    );
  }

  /** Compare crop IDs regardless of CC- prefix or zero-padding */
  private cropIdsMatch(a: string, b: string): boolean {
    return this.cropIdNumeric(a) === this.cropIdNumeric(b);
  }

  private cropIdNumeric(id: string): string {
    const match = id.match(/(?:CC-)?0*(\d+)$/i);
    return match ? String(parseInt(match[1], 10)) : id.toLowerCase();
  }

  private padCropCycleId(cropId: string): string {
    const match = cropId.match(/^CC-(\d+)$/i);
    if (!match) return cropId;
    const num = parseInt(match[1], 10);
    return `CC-${String(num).padStart(7, '0')}`;
  }

  /** Supabase trace API uses 6-digit crop codes (e.g. CC-000019) */
  private padCropCycleIdForTrace(cropId: string): string {
    const match = cropId.match(/^CC-(\d+)$/i);
    if (!match) return cropId;
    const num = parseInt(match[1], 10);
    return `CC-${String(num).padStart(6, '0')}`;
  }

  /** Submit phone number to fetch orders/subscriptions for this crop */
  submitPhone(): void {
    const phone = this.unlockPhone().trim();
    if (!phone || phone.length < 10) {
      this.deliveryError.set('Please enter a valid 10-digit mobile number.');
      return;
    }

    const cropId = this.tracedCropId();
    const paddedId = this.padCropCycleId(cropId);

    this.deliveryLoading.set(true);
    this.deliveryError.set(null);
    this.deliveryPhoneSubmitted.set(true);

    this.traceabilityService.getCropOrders(paddedId, phone).subscribe({
      next: (res) => {
        const allOrders = res.orders ?? [];
        const matchedOrders = this.filterOrdersForTracedCrop(allOrders);
        this.cropOrders.set(matchedOrders);
        this.cropSubscriptions.set(res.subscriptions ?? []);
        this.deliveryLoading.set(false);

        if (matchedOrders.length === 0 && (res.subscriptions?.length ?? 0) === 0) {
          this.deliveryError.set(
            `No orders found for crop ${cropId} with this mobile number. Only orders linked to this crop journey are shown.`
          );
          this.deliveryPhoneSubmitted.set(false);
          return;
        }

        if (matchedOrders.length === 0 && (res.subscriptions?.length ?? 0) > 0) {
          this.trackingMode.set('subscription');
        } else if (matchedOrders.length > 0 && (res.subscriptions?.length ?? 0) === 0) {
          this.trackingMode.set('order');
        }
      },
      error: () => {
        this.deliveryLoading.set(false);
        this.deliveryPhoneSubmitted.set(false);
        this.deliveryError.set('Could not fetch orders. Please try again.');
      }
    });
  }

  /** Keep only orders whose line items match the crop on this traceability page */
  private filterOrdersForTracedCrop(orders: CropOrder[]): CropOrder[] {
    const target = this.tracedCropId();
    const matched = orders.filter(order =>
      order.items.some(
        item => item.product_details?.crop_cycle_id &&
          this.cropIdsMatch(item.product_details.crop_cycle_id, target)
      )
    );
    // If items lack crop_cycle_id, trust the API crop_cycle_id filter
    return matched.length > 0 ? matched : orders;
  }

  selectTrackingMode(mode: 'order' | 'subscription'): void {
    this.trackingMode.set(mode);
  }

  selectOrder(order: CropOrder): void {
    if (this.selectedOrderNumber() === order.order_number) {
      this.selectedOrderNumber.set(null);
      this.orderTracking.set(null);
      this.trackingFromFallback.set(false);
      this.deliveryInfo.set(null);
      return;
    }

    this.selectedOrderNumber.set(order.order_number);
    this.deliveryLoading.set(true);
    this.deliveryError.set(null);
    this.deliveryInfo.set(null);
    this.trackingFromFallback.set(false);

    const applyFallback = (info: string) => {
      this.orderTracking.set(this.buildFallbackTracking(order));
      this.subTracking.set(null);
      this.trackingFromFallback.set(true);
      this.deliveryLoading.set(false);
      this.deliveryInfo.set(info);
      this.updateStagesFromDelivery();
    };

    if (!this.authState.isAuthenticated()) {
      applyFallback(
        'Order list works without login, but live Shiprocket tracking needs your token. Showing order status from your purchase.'
      );
      return;
    }

    this.traceabilityService.getOrderTracking(order.order_number).subscribe({
      next: (tracking) => {
        this.orderTracking.set(tracking);
        this.subTracking.set(null);
        this.trackingFromFallback.set(false);
        this.deliveryLoading.set(false);
        this.updateStagesFromDelivery();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401 || err.status === 403) {
          applyFallback(
            'Login token missing or expired. Paste a fresh token for live courier tracking. Showing order status from your purchase.'
          );
          return;
        }
        if (err.status === 404 || this.isPreShipmentOrder(order)) {
          applyFallback(
            `Live courier tracking is not active yet — order is ${order.status}. Expected delivery: ${order.expected_delivery_date ?? 'TBD'}.`
          );
          return;
        }
        this.deliveryLoading.set(false);
        this.deliveryError.set('Could not fetch tracking data. Please try again.');
      }
    });
  }

  /** Build stage 10–12 data from order details when Shiprocket tracking is unavailable */
  private buildFallbackTracking(order: CropOrder): ShiprocketOrderTracking {
    return {
      order_number: order.order_number,
      order_status: order.status,
      status: order.status,
      estimated_delivery: order.expected_delivery_date ?? 'TBD',
      awb_number: undefined,
      tracking_events: [
        {
          status: order.status,
          location: order.delivery_address,
          activity: `Order ${order.status} · Payment ${order.payment_status}`,
          timestamp: order.created_at,
          courier_status: order.status,
        },
      ],
    };
  }

  private isPreShipmentOrder(order: CropOrder): boolean {
    return ['PLACED', 'PENDING', 'CONFIRMED', 'PROCESSING', 'CANCELLED', 'CANCEL_REQUESTED'].includes(order.status);
  }

  selectSubscription(sub: CropSubscription): void {
    const subNumber = sub.subscription_number ?? String(sub.id);
    this.selectedSubNumber.set(subNumber);
    this.deliveryLoading.set(true);
    this.deliveryError.set(null);
    this.deliveryInfo.set(null);

    this.traceabilityService.getSubscriptionTracking(subNumber).subscribe({
      next: (tracking) => {
        this.subTracking.set(tracking);
        this.orderTracking.set(null);
        this.trackingFromFallback.set(false);
        this.deliveryLoading.set(false);
        this.updateStagesFromDelivery();
      },
      error: (err: HttpErrorResponse) => {
        this.deliveryLoading.set(false);
        if (err.status === 401 || err.status === 403) {
          this.deliveryError.set('Login token required for subscription tracking. Paste your token in the dev panel.');
          return;
        }
        if (err.status === 404) {
          this.deliveryInfo.set('Subscription tracking is not active yet for this delivery.');
          return;
        }
        this.deliveryError.set('Could not fetch subscription tracking. Please try again.');
      }
    });
  }

  resetDeliveryPhone(): void {
    this.deliveryPhoneSubmitted.set(false);
    this.unlockPhone.set('');
    this.cropOrders.set([]);
    this.cropSubscriptions.set([]);
    this.orderTracking.set(null);
    this.subTracking.set(null);
    this.trackingMode.set(null);
    this.selectedOrderNumber.set(null);
    this.selectedSubNumber.set(null);
    this.deliveryError.set(null);
    this.deliveryInfo.set(null);
    this.trackingFromFallback.set(false);
  }

  private updateStagesFromDelivery(): void {
    const orderTk = this.orderTracking();
    const subTk = this.subTracking();

    if (orderTk) {
      const events = orderTk.tracking_events ?? [];
      const latest = events[events.length - 1];
      const isFallback = this.trackingFromFallback();
      const isDelivered = orderTk.status === 'DELIVERED';
      const delivered = events.find((event) => event.status === 'DELIVERED');

      this.stages[9].detail = isFallback
        ? `Order ${orderTk.order_number} · ${orderTk.status} · Est. ${orderTk.estimated_delivery ?? 'to be confirmed'}`
        : latest
          ? `In transit · ${latest.location} · AWB ${orderTk.awb_number ?? 'pending'}`
          : `Order ${orderTk.order_number} · ${orderTk.status}`;

      this.stages[10].detail = isDelivered && delivered
        ? `Delivered to you · ${delivered.location} · ${delivered.timestamp}`
        : isFallback
          ? `Awaiting shipment · Est. delivery ${orderTk.estimated_delivery ?? 'to be confirmed'}`
          : `On the way to you · Est. ${orderTk.estimated_delivery ?? 'to be confirmed'}`;

      if (isDelivered) {
        this.stages[11].detail = `Journey complete · Order ${orderTk.order_number} delivered with full traceability`;
      }
    } else if (subTk && subTk.length > 0) {
      const deliveredCount = subTk.filter((shipment) => shipment.status === 'DELIVERED').length;
      const latest = subTk[subTk.length - 1];

      this.stages[9].detail = `Subscription tracking · ${subTk.length} shipment${subTk.length === 1 ? '' : 's'} · Latest AWB ${latest.awb_number ?? 'pending'}`;
      this.stages[10].detail = `${deliveredCount} of ${subTk.length} subscription deliveries completed`;

      if (deliveredCount > 0) {
        this.stages[11].detail = 'Journey complete · Your subscription delivery arrived with full traceability';
      }
    }
  }

  private fetchJourney(params: { qrCode?: string; cropId?: string }): void {
    this.isLoading.set(true);
    this.traceError.set(null);

    const apiParams = { ...params };
    if (apiParams.cropId) {
      apiParams.cropId = this.padCropCycleIdForTrace(apiParams.cropId);
    }

    this.traceabilityService.getJourney(apiParams).subscribe({
      next: (journey) => {
        this.journey.set(journey);
        this.updateStagesFromApi(journey);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.traceError.set(err.message || 'Failed to load product journey.');
        this.isLoading.set(false);
      }
    });
  }

  retryFetch(): void {
    const cropId = this.currentCropId();
    const qr = this.currentQrCode();

    if (qr === 'mock' || qr === 'sandbox' || cropId === 'mock' || cropId === 'sandbox') {
      this.loadSandboxData();
    } else if (cropId) {
      this.fetchJourney({ cropId });
    } else {
      this.fetchJourney({ qrCode: qr });
    }
  }

  loadSandboxData(): void {
    this.isLoading.set(true);
    this.traceError.set(null);

    const mockJourney: TraceabilityJourney = {
      product: {
        name: 'Anaad Whole Wheat Atta 5kg (Sandbox)',
        sku: 'ATTA5KG-MOCK',
        unitSize: '5 kg',
        fssaiNumber: '12345678901234',
        mrp: 380,
        batchCode: 'PKG-ATTA-SANDBOX-001',
        shelfLifeDays: 365
      },
      seed: {
        seedCode: 'SEED-WHEAT-HD2967-042',
        cropName: 'Desi Heirloom Wheat',
        variety: 'Kansi (Desi Pauni)',
        source: 'Swaraj Seed Cooperative, Madhya Pradesh',
        purchaseDate: '2025-10-10',
        isOrganic: true,
        certificationUrl: '#'
      },
      cropCycle: {
        cycleCode: 'CYCLE-WHEAT-2025-01',
        cropName: 'Winter Heirloom Wheat',
        sowingDate: '2025-11-05',
        expectedHarvestDate: '2026-03-10',
        actualHarvestDate: '2026-03-08',
        status: 'HARVESTED',
        patchName: 'Aparajita Block',
        patchCode: 'PATCH-AP-03',
        blockName: 'Anaad Organic Farm 2',
        blockCode: 'BLOCK-02',
        seedCode: 'SEED-WHEAT-HD2967-042',
        sourceOfSeed: 'Swaraj Seed Cooperative, Madhya Pradesh',
        scientificName: 'Triticum aestivum',
        season: 'Rabi',
        naturalFarmingTechniques: 'Jeevamrit + Desi Cow Farming',
        cropGrade: 'A',
        farmer: {
          name: 'Ramesh Deswal',
          age: 42,
          experience: 18,
          photoUrl: null,
          place: 'Sonipat, Haryana'
        }
      },
      farmland: {
        block: {
          name: 'Anaad Organic Farm 2',
          code: 'BLOCK-02',
          areaSqft: 85000,
          description: 'Primary wheat farming block with canal irrigation',
          facilityType: 'Open Field',
          gpsLatitude: 28.9931,
          gpsLongitude: 77.0151,
          villageName: 'Ganaur',
          district: 'Sonipat',
          state: 'Haryana',
          googleMapsUrl: 'https://maps.google.com/?q=28.9931,77.0151'
        },
        patch: {
          name: 'Aparajita Block',
          code: 'PATCH-AP-03',
          sizeSqft: 22000,
          crop: 'Wheat'
        },
        workEntries: [
          { tag: 'Ploughing', task: 'Deep tilling with iron plough', status: 'completed', startDate: '2025-10-15', endDate: '2025-10-18', notes: null },
          { tag: 'Sowing', task: 'Manual seed sowing in rows', status: 'completed', startDate: '2025-11-05', endDate: '2025-11-05', notes: null },
          { tag: 'Fertilizing', task: 'Jeevamrit application', status: 'completed', startDate: '2025-12-12', endDate: '2025-12-12', notes: 'Applied 400L Jeevamrit' },
          { tag: 'Weeding', task: 'Manual weeding by farm hands', status: 'completed', startDate: '2026-01-20', endDate: '2026-01-22', notes: null },
          { tag: 'Irrigation', task: 'Canal flood irrigation', status: 'completed', startDate: '2026-02-05', endDate: '2026-02-05', notes: null },
          { tag: 'Harvesting', task: 'Manual harvesting with sickle', status: 'completed', startDate: '2026-03-08', endDate: '2026-03-08', notes: null }
        ]
      },
      farmingActivities: [
        {
          activityType: 'SOIL_PREPARATION',
          description: 'Deep tilling and enriching soil with compost and local farm manure.',
          date: '2025-10-20',
          mediaUrls: []
        },
        {
          activityType: 'SOWING',
          description: 'Sowing hand-selected heirloom wheat seeds with custom spacing.',
          date: '2025-11-05',
          mediaUrls: []
        },
        {
          activityType: 'MICROBIAL_ENHANCERS',
          description: 'Application of Jeevamrit and Panchagavya liquid formulations.',
          date: '2025-12-12',
          mediaUrls: []
        },
        {
          activityType: 'WEEDING',
          description: 'Manual weeding carried out by local farm helpers.',
          date: '2026-01-20',
          mediaUrls: []
        }
      ],
      harvest: {
        batchCode: 'HRV-WHEAT-2026-001',
        harvestDate: '2026-03-08',
        cropName: 'Heirloom Wheat',
        rawQuantity: '4.2 Tons',
        qualityGrade: 'A-PLUS',
        moistureLevel: 12.8,
        harvestType: 'Manual sickle cutting',
        // Raw Material Inventory (Stage 6)
        storedAt: '2026-03-09T07:30:00Z',
        curedUntil: '2026-03-10T06:00:00Z',
        storageFacilityName: 'Breathable Canvas Sack Silo #2',
        storageCondition: 'Humidity 12%, Temperature 22┬░C',
        curingDurationDays: 1
      },
      processing: [
        {
          processingCode: 'PROC-STONE-MILL-001',
          processType: 'STONE_GRINDING',
          startedAt: '2026-03-10T08:00:00Z',
          completedAt: '2026-03-10T14:30:00Z',
          status: 'COMPLETED',
          steps: [
            {
              stepType: 'GRAIN_CLEANING',
              stepName: 'Triple De-stoning & Aspirating',
              status: 'COMPLETED',
              startedAt: '2026-03-10T08:00:00Z',
              completedAt: '2026-03-10T09:30:00Z',
              inputWeightKg: 1000,
              outputWeightKg: 994,
              wastageKg: 6,
              notes: 'Removed organic matter and minor field dust.'
            },
            {
              stepType: 'MILLING',
              stepName: 'Cold Stone Milling (Sandstone)',
              status: 'COMPLETED',
              startedAt: '2026-03-10T09:45:00Z',
              completedAt: '2026-03-10T14:30:00Z',
              inputWeightKg: 994,
              outputWeightKg: 988,
              wastageKg: 6,
              notes: 'Stone rotation kept under 32 RPM to prevent heating.'
            }
          ]
        }
      ],
      packaging: {
        packagingCode: 'PKG-ATTA5KG-2026-0001',
        packagingDate: '2026-03-12',
        manufacturingDate: '2026-03-12',
        expiryDate: '2027-03-12',
        totalUnits: 197,
        unitSize: '5 kg',
        status: 'COMPLETED',
        // Finished Goods Inventory (Stage 9)
        warehouseReceivedAt: '2026-03-13T08:00:00Z',
        warehouseDispatchedAt: '2026-03-14T16:00:00Z',
        warehouseName: 'Anaad Central Warehouse, Sonipat',
        warehouseDurationDays: 1
      },
      logistics: {
        batchCode: 'LOG-ATTA-SANDBOX-001',
        origin: 'Anaad Central Warehouse, Sonipat',
        destination: 'Delhi NCR Distribution Hub',
        carrier: 'Anaad Local Supply Chain',
        vehicleNumber: 'DL-1AA-4591',
        status: 'DELIVERED',
        invoiceNumber: 'INV-MOCK-901',
        fssaiBatchNo: 'FSSAI-PKG-9102',
        deliveredAt: '2026-03-15T12:00:00Z',
        steps: [
          {
            stepType: 'PICKUP',
            stepName: 'Picked up from Sonipat warehouse',
            status: 'COMPLETED',
            scheduledAt: '2026-03-14T16:30:00Z',
            completedAt: '2026-03-14T17:00:00Z',
            location: 'Sonipat',
            referenceNumber: null,
            recipientName: null,
            notes: null
          },
          {
            stepType: 'IN_TRANSIT',
            stepName: 'In transit to Delhi NCR',
            status: 'COMPLETED',
            scheduledAt: '2026-03-14T17:00:00Z',
            completedAt: '2026-03-15T06:00:00Z',
            location: 'NH-44',
            referenceNumber: 'TRK-MOCK-78291',
            recipientName: null,
            notes: null
          },
          {
            stepType: 'DELIVERED',
            stepName: 'Delivered at Delhi NCR Distribution Hub',
            status: 'COMPLETED',
            scheduledAt: '2026-03-15T10:00:00Z',
            completedAt: '2026-03-15T12:00:00Z',
            location: 'Delhi NCR',
            referenceNumber: null,
            recipientName: 'Main Warehouse Manager',
            notes: null
          }
        ]
      },
      qualityChecks: [
        {
          checkType: 'Moisture Control',
          result: 'PASS',
          grade: 'A',
          checkedAt: '2026-03-11T10:00:00Z',
          notes: 'Moisture level at 12.8% within NPOP specifications.'
        },
        {
          checkType: 'Pesticide Screening',
          result: 'PASS',
          grade: 'EXCELLENT',
          checkedAt: '2026-03-11T16:30:00Z',
          notes: 'Zero chemical residues found. NPOP organic standards met.'
        }
      ],
      authenticity: {
        qrCode: 'QR-ANAAD-ATTA5KG-MOCK',
        verifiedAt: new Date().toISOString(),
        scanCount: 1,
        message: 'Γ£à This is a simulated Sandbox QR code. All parameters are verified for demonstration purposes.'
      }
    };

    // Simulate small delay for premium loading experience
    setTimeout(() => {
      this.journey.set(mockJourney);
      this.updateStagesFromApi(mockJourney);
      this.isLoading.set(false);
    }, 600);
  }

  /** Update live data lines on front cards; narrative copy stays in the stages array */
  private updateStagesFromApi(journey: TraceabilityJourney): void {
    const crop = journey.cropCycle;
    const farmland = journey.farmland;
    const harvest = journey.harvest;
    const processing = journey.processing;
    const packaging = journey.packaging;
    const logistics = journey.logistics;
    const auth = journey.authenticity;
    const activities = journey.farmingActivities ?? [];
    const workEntries = farmland?.workEntries ?? [];

    const landPrepDate = this.findLandPreparationDate(journey);
    this.stages[0].detail = this.buildStage1Detail(journey, landPrepDate);

    const farmer = crop?.farmer;
    if (farmer) {
      const place = farmer.place ? `, ${farmer.place}` : '';
      const experience = farmer.experience
        ? ` · ${farmer.experience}${typeof farmer.experience === 'number' ? ' years on the land' : ''}`
        : '';
      this.stages[1].detail = `Cultivated by: ${farmer.name}${place}${experience}`;

      const photo = this.resolveFarmerPhoto(farmer);
      if (photo) {
        this.stages[1].image = photo;
        this.stages[1].alt = `${farmer.name}${farmer.place ? ', ' + farmer.place : ''} — Anaad farmer`;
        this.stages[1].imageFit = 'cover';
        this.stages[1].imagePosition = 'center';
      }
    } else {
      this.stages[1].detail = 'Cultivated by: To be recorded for this batch';
    }

    if (crop) {
      const parts = [crop.cropName];
      if (crop.season) parts.push(crop.season);
      if (crop.sowingDate) parts.push(`Sown ${this.formatDate(crop.sowingDate)}`);
      if (farmland?.patch?.name) parts.push(farmland.patch.name);
      this.stages[2].detail = parts.join(' · ');
    } else {
      this.stages[2].detail = 'Crop cycle: Pending';
    }

    const totalTasks = workEntries.length + activities.length;
    if (totalTasks > 0) {
      const latestActivity = [...activities]
        .filter((activity) => activity.date)
        .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
      const latestWork = [...workEntries]
        .filter((entry) => entry.startDate)
        .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0];

      if (latestActivity?.date) {
        const label = latestActivity.activityType.replace(/_/g, ' ').toLowerCase();
        this.stages[3].detail = `${totalTasks} field activit${totalTasks === 1 ? 'y' : 'ies'} recorded · Latest: ${label} on ${this.formatDate(latestActivity.date)}`;
      } else if (latestWork?.startDate) {
        this.stages[3].detail = `${totalTasks} field activit${totalTasks === 1 ? 'y' : 'ies'} recorded · Latest: ${latestWork.tag} on ${this.formatDate(latestWork.startDate)}`;
      } else {
        this.stages[3].detail = `${totalTasks} field activit${totalTasks === 1 ? 'y' : 'ies'} recorded for this batch`;
      }
    } else {
      this.stages[3].detail = 'Field activities: Pending';
    }

    const harvestDate = this.findHarvestDate(journey);
    this.stages[4].detail = harvestDate
      ? `Date of harvest: ${this.formatDate(harvestDate)}`
      : 'Date of harvest: Pending';

    if (harvest?.storedAt) {
      const facility = harvest.storageFacilityName ?? 'farm storage';
      this.stages[5].detail = `Stored at ${facility} since ${this.formatDateTime(harvest.storedAt)}`;
    } else if (harvest) {
      this.stages[5].detail = 'Awaiting entry into raw material storage';
    } else {
      this.stages[5].detail = 'Storage will be recorded after harvest';
    }

    if (processing?.length) {
      const primary = processing.find((item) => item.status === 'COMPLETED') ?? processing[0];
      const label = primary.processType.replace(/_/g, ' ').toLowerCase();
      const when = primary.completedAt
        ? ` on ${this.formatDateTime(primary.completedAt)}`
        : primary.startedAt
          ? ` · started ${this.formatDateTime(primary.startedAt)}`
          : '';
      this.stages[6].detail = `${this.capitalizeWords(label)} · ${primary.status.toLowerCase()}${when}`;
    } else {
      this.stages[6].detail = 'Processing: Pending';
    }

    if (packaging) {
      const packedOn = packaging.packagingDate ? this.formatDate(packaging.packagingDate) : null;
      const units = packaging.totalUnits ? `${packaging.totalUnits} units` : 'Batch packed';
      this.stages[7].detail = packedOn
        ? `${units} · Packed ${packedOn} · ${packaging.packagingCode}`
        : `${units} · ${packaging.packagingCode}`;
    } else {
      this.stages[7].detail = 'Packaging: Pending';
    }

    if (packaging?.warehouseReceivedAt) {
      const warehouse = packaging.warehouseName ?? 'Central warehouse';
      this.stages[8].detail = `At ${warehouse} since ${this.formatDateTime(packaging.warehouseReceivedAt)}`;
    } else {
      this.stages[8].detail = 'Warehouse entry: Pending';
    }

    if (logistics) {
      const parts: string[] = [];
      if (logistics.carrier) parts.push(logistics.carrier);
      if (logistics.origin) parts.push(`From ${logistics.origin}`);
      if (logistics.vehicleNumber) parts.push(`Vehicle ${logistics.vehicleNumber}`);
      this.stages[9].detail = parts.length ? parts.join(' · ') : 'Transit details: Pending';
    } else {
      this.stages[9].detail = 'Transit: Pending';
    }

    if (logistics?.destination) {
      this.stages[10].detail = logistics.deliveredAt
        ? `Delivered to ${logistics.destination} · ${this.formatDateTime(logistics.deliveredAt)}`
        : `En route to ${logistics.destination}`;
    } else {
      this.stages[10].detail = 'Delivery: Pending';
    }

    if (auth) {
      const verified = auth.verifiedAt ? ` · Verified ${this.formatDateTime(auth.verifiedAt)}` : '';
      this.stages[11].detail = `Scan #${auth.scanCount}${verified}`;
    } else {
      this.stages[11].detail = 'Verification: Pending';
    }

    if (this.isUnlocked() && (this.orderTracking() || this.subTracking()?.length)) {
      this.updateStagesFromDelivery();
    }
  }

  private capitalizeWords(value: string): string {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /** Resolve farmer photo from API (supports camelCase and snake_case keys) */
  resolveFarmerPhoto(farmer: TraceFarmer | null | undefined): string | null {
    if (!farmer) return null;
    const raw = farmer as TraceFarmer & { photo_url?: string | null; photo?: string | null; image_url?: string | null };
    const url = farmer.photoUrl ?? raw.photo_url ?? raw.photo ?? raw.image_url ?? null;
    return url && url.trim().length > 0 ? url.trim() : null;
  }

  /** Resolve land preparation date from farming activities or field work entries */
  private findLandPreparationDate(journey: TraceabilityJourney): string | null {
    const soilPrepActivity = (journey.farmingActivities ?? []).find((activity) =>
      activity.activityType === 'SOIL_PREPARATION' ||
      /land|soil|prep|plough/i.test(activity.activityType)
    );
    if (soilPrepActivity?.date) {
      return soilPrepActivity.date;
    }

    const landWork = (journey.farmland?.workEntries ?? []).find((entry) =>
      /plough|land|soil|prep/i.test(entry.tag) || /plough|land|soil|prep/i.test(entry.task ?? '')
    );
    return landWork?.startDate ?? landWork?.endDate ?? null;
  }

  private buildStage1Detail(journey: TraceabilityJourney, landPrepDate: string | null): string {
    const seed = journey.seed;
    const crop = journey.cropCycle;
    const parts: string[] = [];

    if (seed) {
      parts.push(seed.cropName);
      if (seed.variety) {
        parts.push(seed.variety);
      }
      if (seed.isOrganic) {
        parts.push('Organic');
      }
      if (seed.source) {
        parts.push(`from ${seed.source}`);
      }
    } else if (crop) {
      parts.push(crop.cropName);
      if (crop.seedCode) {
        parts.push(`Seed ${crop.seedCode}`);
      }
      if (crop.sourceOfSeed) {
        parts.push(`from ${crop.sourceOfSeed}`);
      }
    }

    if (landPrepDate) {
      parts.push(`Land prepared ${this.formatDate(landPrepDate)}`);
    }

    return parts.length ? parts.join(' · ') : 'Seed & land preparation: Pending';
  }

  /** Resolve harvest date from harvest record or crop cycle */
  private findHarvestDate(journey: TraceabilityJourney): string | null {
    return journey.harvest?.harvestDate ?? journey.cropCycle?.actualHarvestDate ?? null;
  }

  /** Format YYYY-MM-DD to human readable (e.g., "15 Mar 2026") */
  formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  formatBlockAddress(block: TraceFarmlandBlock): string | null {
    const parts = [block.villageName, block.district, block.state].filter(
      (part): part is string => !!part && part.trim().length > 0
    );
    return parts.length ? parts.join(', ') : null;
  }

  formatBlockLocation(
    block: TraceFarmlandBlock,
    farmerPlace?: string | null,
    patchName?: string | null
  ): string {
    const address = this.formatBlockAddress(block);
    if (address) {
      return address;
    }

    if (farmerPlace?.trim()) {
      return farmerPlace.trim();
    }

    if (block.name) {
      return patchName ? `${block.name} — ${patchName}` : block.name;
    }

    if (this.hasBlockGps(block)) {
      return this.formatBlockGps(block);
    }

    return 'On farm';
  }

  hasBlockGps(block: TraceFarmlandBlock): boolean {
    return block.gpsLatitude != null && block.gpsLongitude != null;
  }

  formatBlockGps(block: TraceFarmlandBlock): string {
    return `${block.gpsLatitude!.toFixed(6)}, ${block.gpsLongitude!.toFixed(6)}`;
  }

  getBlockMapsUrl(block: TraceFarmlandBlock): string | null {
    if (block.googleMapsUrl?.trim()) {
      return block.googleMapsUrl.trim();
    }
    if (this.hasBlockGps(block)) {
      return `https://www.google.com/maps/search/?api=1&query=${block.gpsLatitude},${block.gpsLongitude}`;
    }
    return null;
  }

  /** Format ISO timestamp to human readable (e.g., "15 Mar 2026, 8:00 AM") */
  processingSteps(steps: TraceProcessingStep[] | string | null | undefined): TraceProcessingStep[] {
    if (!steps || typeof steps === 'string') return [];
    return steps;
  }

  formatDateTime(isoStr: string): string {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' +
        d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  }


  protected readonly seeds = this.createParticles(18, 42, 23, 53, 26, 17, 14, 3, 7, 3, 31, 28, -14);
  protected readonly motes = this.createParticles(14, 8, 84, 41, 38, 13, 30, 2, 5, 4, 23, 20, -10);
  protected readonly chaff = this.createParticles(22, 28, 42, 27, 20, 19, 14, 2, 3, 4, 17, 34, -18);
  protected readonly smoke = this.createParticles(8, 36, 18, 19, 18, 11, 22, 6, 3, 0, 13, 14, -7);
  protected readonly dust = this.createParticles(20, 10, 80, 23, 32, 17, 28, 2, 5, 4, 19, 24, -12);
  protected readonly packageSpark = this.createParticles(10, 30, 40, 29, 30, 13, 24, 3, 4, 3, 21, 16, -8);
  protected readonly wheelDust = this.createParticles(18, 14, 68, 31, 22, 11, 20, 2, 4, 3, 17, 26, -10);
  protected readonly steam = this.createParticles(8, 32, 24, 27, 20, 15, 32, 10, 3, 0, 11, 16, -8);
  protected readonly haloSpark = this.createParticles(12, 20, 60, 17, 40, 14, 26, 2, 4, 4, 15, 18, -9);

  protected readonly routeNodes: RouteNode[] = [
    { left: 22, top: 22, delay: 0.2 },
    { left: 46, top: 18, delay: 0.6 },
    { left: 58, top: 34, delay: 0.9 },
    { left: 38, top: 46, delay: 1.2 },
    { left: 66, top: 52, delay: 1.5 },
    { left: 54, top: 66, delay: 1.8 },
    { left: 30, top: 72, delay: 2.1 }
  ];

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.setupStageObserver();

    // Layout settles after images/fonts load; build then and again on full load.
    requestAnimationFrame(() => this.buildVine());
    window.addEventListener('load', () => this.buildVine(), { once: true });
    setTimeout(() => this.buildVine(), 1200);

    const root = this.journeyRoot?.nativeElement;
    if (root) {
      let lastHeight = root.offsetHeight;
      this.resizeObserver = new ResizeObserver(() => {
        if (Math.abs(root.offsetHeight - lastHeight) > 10) {
          lastHeight = root.offsetHeight;
          this.buildVine();
        }
      });
      this.resizeObserver.observe(root);
    }

    if (this.gravityCanvas) {
      this.resizeCanvas();
      this.startCanvasLoop();
    }

    this.startCursorTrailLoop();
  }

  /** Rebuilds the vine path so it spans the real page height, bending at every stage. */
  private buildVine(): void {
    const root = this.journeyRoot?.nativeElement;
    const path = this.vinePath?.nativeElement;
    const svg = path?.ownerSVGElement;
    const scenes = this.sceneRefs?.toArray() ?? [];
    if (!root || !path || !svg || scenes.length === 0) return;

    const svgWidth = svg.getBoundingClientRect().width || 240;
    this.vineScale = svgWidth / 240;
    const rootRect = root.getBoundingClientRect();
    this.vbH = Math.max(root.offsetHeight / this.vineScale, 100);
    svg.setAttribute('viewBox', `0 0 240 ${Math.ceil(this.vbH)}`);

    const anchors: { x: number; y: number }[] = [{ x: 120, y: 0 }];
    scenes.forEach((scene, i) => {
      const r = scene.nativeElement.getBoundingClientRect();
      const y = (r.top - rootRect.top + r.height / 2) / this.vineScale;
      anchors.push({ x: i % 2 === 0 ? 178 : 58, y });
    });
    anchors.push({ x: 120, y: this.vbH });
    anchors.sort((a, b) => a.y - b.y);

    let d = `M ${anchors[0].x} ${anchors[0].y}`;
    for (let i = 1; i < anchors.length; i++) {
      const prev = anchors[i - 1];
      const curr = anchors[i];
      const midY = (prev.y + curr.y) / 2;
      d += ` C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
    }
    path.setAttribute('d', d);

    this.pathLength = path.getTotalLength();
    path.style.strokeDasharray = `${this.pathLength}`;
    path.style.strokeDashoffset = `${this.pathLength}`;
    path.classList.add('is-measured');

    this.vineAnchors = anchors;

    this.decorateVine(path);

    // Pre-calculate points along the path to avoid layout thrashing during scroll/animation
    this.cachedPoints = [];
    const steps = Math.min(Math.ceil(this.pathLength / 4), 1200); // point every 4px
    for (let i = 0; i <= steps; i++) {
      const dist = (i / steps) * this.pathLength;
      const pt = path.getPointAtLength(dist);
      const ahead = path.getPointAtLength(Math.min(this.pathLength, dist + 8));
      const tangent = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
      this.cachedPoints.push({ x: pt.x, y: pt.y, angle: tangent + 90 });
    }

    this.update();
  }

  /** Scatters leaves and blossoms along the freshly built path. */
  private decorateVine(path: SVGPathElement): void {
    const leaves: VineLeaf[] = [];
    const blossoms: Blossom[] = [];
    const leafCount = 24;
    for (let i = 1; i <= leafCount; i++) {
      const t = i / (leafCount + 1);
      const pt = path.getPointAtLength(this.pathLength * t);
      const ahead = path.getPointAtLength(Math.min(this.pathLength, this.pathLength * t + 8));
      const tangent = (Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI;
      const flip = i % 2 === 0;
      leaves.push({
        x: pt.x + (flip ? -10 : 10),
        y: pt.y,
        rot: tangent + (flip ? 140 : -40),
        flip,
        t: t * 0.985
      });
      if (i % 3 === 0) {
        blossoms.push({ x: pt.x + (flip ? -16 : 16), y: pt.y - 6, t: t * 0.985 });
      }
    }
    this.leaves.set(leaves);
    this.blossoms.set(blossoms);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.showRegisteredModal()) {
      this.closeDeliveryPreviewModal();
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.schedule();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.buildVine();
    this.resizeCanvas();
  }

  ngOnDestroy(): void {
    this.stageObserver?.disconnect();
    if (this.flipStampTimer) {
      clearTimeout(this.flipStampTimer);
    }
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.canvasRafId !== null) cancelAnimationFrame(this.canvasRafId);
    if (this.cursorRafId !== null) cancelAnimationFrame(this.cursorRafId);
    if (this.vineRafId !== null) cancelAnimationFrame(this.vineRafId);
    this.resizeObserver?.disconnect();
  }

  /** PERF: IntersectionObserver replaces 11├ù getBoundingClientRect per scroll frame.
   *  Tracks is-live visibility and currentStage with zero layout cost. */
  private setupStageObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const scenes = this.sceneRefs?.toArray() ?? [];
    if (scenes.length === 0) return;

    this.stageObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const idx = scenes.findIndex(s => s.nativeElement === el);
          if (idx < 0) continue;

          // is-live: trigger reveal once
          if (entry.isIntersecting && !el.classList.contains('is-live')) {
            el.classList.add('is-live');
          }

          // currentStage: the scene most centered in viewport
          if (entry.intersectionRatio > 0.1) {
            const stageId = idx + 1;
            if (stageId !== this.currentStage()) {
              this.currentStage.set(stageId);
            }
          }
        }
      },
      { threshold: [0, 0.15, 0.6] }
    );

    for (const scene of scenes) {
      this.stageObserver.observe(scene.nativeElement);
    }
  }

  private schedule(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  private update(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const root = this.journeyRoot?.nativeElement;
    const path = this.vinePath?.nativeElement;
    if (!root || !path || this.pathLength <= 0) return;

    const vh = window.innerHeight || 1;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const rect = root.getBoundingClientRect();

    // PERF: Only set if delta > 0.5px to reduce CD cycles
    const prevParallax = this.parallaxOffset();
    if (Math.abs(scrollTop - prevParallax) > 0.5) {
      this.parallaxOffset.set(scrollTop);
    }

    const heroShift = Math.min(scrollTop, vh * 0.92);
    if (Math.abs(heroShift - this.heroParallax()) > 0.5) {
      this.heroParallax.set(heroShift);
    }

    // Calculate scroll speed for wind-sway leaf animation and liquid warp
    const speed = scrollTop - this.lastScrollTop;
    this.lastScrollTop = scrollTop;
    this.scrollSpeed = this.scrollSpeed + (speed - this.scrollSpeed) * 0.12;
    const wind = Math.min(Math.max(this.scrollSpeed * 0.18, -15), 15);
    root.style.setProperty('--scroll-wind', `${wind}`);

    // PERF: currentStage tracked by IntersectionObserver
    // is-live reveal: only call getBoundingClientRect on scenes NOT yet revealed
    const scenes = this.sceneRefs?.toArray() ?? [];
    for (const scene of scenes) {
      const el = scene.nativeElement;
      if (el.classList.contains('is-live')) continue;  // skip BCR on already-revealed scenes
      const r = el.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible >= Math.min(r.height || 1, vh) * 0.24) {
        el.classList.add('is-live');
      }
    }

    // Pin the creeper to the line 55% down the viewport, in vine coordinates.
    const targetY = Math.min(Math.max((vh * 0.55 - rect.top) / this.vineScale, 0), this.vbH);
    const length = this.lengthAtY(targetY);
    const crawlerProgress = Math.min(Math.max(length / this.pathLength, 0), 1);

    // PERF: Only assign if delta > 0.0005 to avoid unnecessary vine RAF spawn
    if (Math.abs(crawlerProgress - this.targetProgress) > 0.0005) {
      this.targetProgress = crawlerProgress;
    }

    // Initialize easedProgress on first build/scroll to avoid jumping from 0
    if (this.easedProgress === 0) {
      this.easedProgress = crawlerProgress;
      this.drawVineAtProgress(this.easedProgress);
    } else {
      this.startVineGrowthLoop();
    }
  }

  /** Binary-search the pre-calculated cachedPoints array for the nearest y value, then interpolate. */
  private lengthAtY(y: number): number {
    if (this.cachedPoints.length === 0) return 0;

    let lo = 0;
    let hi = this.cachedPoints.length - 1;
    while (lo < hi - 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (this.cachedPoints[mid].y < y) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const p0 = this.cachedPoints[lo];
    const p1 = this.cachedPoints[hi];
    if (Math.abs(p1.y - p0.y) < 0.01) {
      return (lo / (this.cachedPoints.length - 1)) * this.pathLength;
    }

    const ratio = (y - p0.y) / (p1.y - p0.y);
    const interpolatedIdx = lo + ratio;
    return (interpolatedIdx / (this.cachedPoints.length - 1)) * this.pathLength;
  }

  private createParticles(
    count: number,
    leftBase: number,
    leftMod: number,
    delayMul: number,
    delayMod: number,
    durMul: number,
    durMod: number,
    sizeBase: number,
    sizeMul: number,
    sizeMod: number,
    driftMul: number,
    driftMod: number,
    driftBase: number
  ): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
      left: leftBase + ((i * delayMul) % leftMod),
      delay: ((i * delayMul) % delayMod) / 10,
      dur: 2.4 + ((i * durMul) % durMod) / 10,
      size: sizeBase + ((i * sizeMul) % Math.max(sizeMod, 1)),
      drift: driftBase + ((i * driftMul) % driftMod)
    }));
  }

  scrollToStage(id: number): void {
    const scenes = this.sceneRefs?.toArray() ?? [];
    const targetScene = scenes.find((_, idx) => idx + 1 === id);
    if (targetScene) {
      targetScene.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  scrollToTop(): void {
    const root = this.journeyRoot?.nativeElement;
    if (root) {
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onFrameMouseMove(event: MouseEvent, stageId: number): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.trailX.set(x);
    this.trailY.set(y);
    this.activeTrailStage.set(stageId);

    // Calculate normalized X (-1 to 1) relative to frame center
    const normX = (x / rect.width) * 2 - 1;
    // Map to tilt angle (-3 to +3 degrees)
    this.windTilt.set(normX * 3);
  }

  onFrameMouseLeave(): void {
    this.activeTrailStage.set(null);
    this.windTilt.set(0);
  }

  toggleFlipCard(event: MouseEvent, stageId: number | null): void {
    event.stopPropagation();
    if (stageId === null) {
      this.flippedCard.set(null);
      this.flipStampStage.set(null);
    } else if (this.flippedCard() === stageId) {
      this.flippedCard.set(null);
      this.flipStampStage.set(null);
    } else {
      this.flippedCard.set(stageId);
      this.triggerFlipStamp(stageId);
    }
  }

  private triggerFlipStamp(stageId: number): void {
    if (this.flipStampTimer) {
      clearTimeout(this.flipStampTimer);
    }
    this.flipStampStage.set(stageId);
    this.flipStampTimer = setTimeout(() => {
      this.flipStampStage.set(null);
      this.flipStampTimer = null;
    }, 900);
  }

  protected getStageDataLabel(stageId: number): string {
    if (stageId >= 12) {
      return 'Verified';
    }
    if (stageId >= 10 && (this.orderTracking() || (this.subTracking()?.length ?? 0) > 0)) {
      return 'Live';
    }
    return 'Recorded';
  }

  protected isLongStageTitle(title: string): boolean {
    return title.length > 16;
  }

  protected getStageBadges(stageId: number): StageBadge[] {
    const badges: StageBadge[] = [];
    const seed = this.traceSeed();
    const crop = this.traceCropCycle();
    const harvest = this.traceHarvest();
    const packaging = this.tracePackaging();
    const logistics = this.traceLogistics();
    const auth = this.traceAuthenticity();
    const orderTk = this.orderTracking();
    const subTk = this.subTracking();

    switch (stageId) {
      case 1:
        if (seed?.isOrganic) {
          badges.push({ label: 'Organic', tone: 'green' });
        }
        break;
      case 3:
        if (crop?.season) {
          badges.push({ label: crop.season, tone: 'neutral' });
        }
        break;
      case 5:
        if (harvest?.rawQuantity) {
          badges.push({ label: harvest.rawQuantity, tone: 'neutral' });
        }
        break;
      case 8:
        if (packaging?.status) {
          badges.push({ label: packaging.status, tone: 'neutral' });
        }
        if (packaging?.totalUnits) {
          badges.push({ label: `${packaging.totalUnits} units`, tone: 'gold' });
        }
        break;
      case 10:
        if (orderTk?.status === 'DELIVERED' || subTk?.some((s) => s.status === 'DELIVERED')) {
          badges.push({ label: 'Delivered', tone: 'green' });
        } else if (orderTk?.status) {
          badges.push({ label: orderTk.status, tone: 'gold' });
        } else if (logistics?.status) {
          badges.push({ label: logistics.status, tone: 'gold' });
        }
        break;
      case 11:
        if (orderTk?.status === 'DELIVERED') {
          badges.push({ label: 'Delivered', tone: 'green' });
        } else if (orderTk?.estimated_delivery) {
          badges.push({ label: `Est. ${orderTk.estimated_delivery}`, tone: 'gold' });
        } else if (logistics?.destination) {
          badges.push({ label: logistics.destination, tone: 'neutral' });
        }
        break;
      case 12:
        if (auth) {
          badges.push({ label: `Scan #${auth.scanCount}`, tone: 'green' });
        }
        break;
    }

    return badges;
  }

  /* ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ
     NEXT-GEN FEATURE 4: SEED SOWER CANVAS GRAVITY PHYSICS
     ΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉΓòÉ */
  @HostListener('mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent): void {
    this.realMouseX = event.clientX;
    this.realMouseY = event.clientY;
    this.addSeedParticles(event, 'move');

    if (!this.cursorLoopActive) {
      this.startCursorTrailLoop();
    }
  }

  @HostListener('click', ['$event'])
  onWindowClick(event: MouseEvent): void {
    this.addSeedParticles(event, 'click');
  }

  private resizeCanvas(): void {
    const canvas = this.gravityCanvas?.nativeElement;
    const root = this.journeyRoot?.nativeElement;
    if (!canvas || !root) return;
    canvas.width = root.clientWidth;
    canvas.height = root.clientHeight;
  }

  private addSeedParticles(event: MouseEvent, type: 'move' | 'click'): void {
    const canvas = this.gravityCanvas?.nativeElement;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) return;

    const count = type === 'click' ? 12 : (Math.random() < 0.15 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'click' ? 1 + Math.random() * 4 : 0.5 + Math.random() * 1.5;
      this.seedsList.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: type === 'click' ? Math.sin(angle) * speed - 2.5 : Math.sin(angle) * speed,
        radius: 2 + Math.random() * 3,
        alpha: 1,
        sprouted: false,
        sproutProgress: 0,
        color: i % 2 === 0 ? '#e9b949' : '#a8762e'
      });
    }

    if (this.seedsList.length > 250) {
      this.seedsList.shift();
    }

    if (this.seedsList.length > 0 && !this.canvasLoopActive) {
      this.startCanvasLoop();
    }
  }

  private getVineX(y: number, canvasWidth: number): number {
    const canvas = this.gravityCanvas?.nativeElement;
    if (this.vineAnchors.length === 0 || !canvas) return canvasWidth / 2;
    const svgY = (y / canvas.clientHeight) * this.vbH;
    
    let i = 0;
    while (i < this.vineAnchors.length - 1 && this.vineAnchors[i + 1].y < svgY) {
      i++;
    }
    const p0 = this.vineAnchors[i];
    const p1 = this.vineAnchors[i + 1];
    if (!p1) return (p0.x / 240) * canvasWidth;
    
    const ratio = (svgY - p0.y) / (p1.y - p0.y);
    const svgX = p0.x + (p1.x - p0.x) * ratio;
    return (svgX / 240) * canvasWidth;
  }

  private startCanvasLoop(): void {
    if (this.canvasLoopActive) return;
    const canvas = this.gravityCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    this.canvasLoopActive = true;

    const animate = () => {
      if (!isPlatformBrowser(this.platformId)) return;

      if (this.seedsList.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.canvasLoopActive = false;
        this.canvasRafId = null;
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;

      for (let i = this.seedsList.length - 1; i >= 0; i--) {
        const p = this.seedsList[i];
        if (p.sprouted) {
          p.sproutProgress += 0.04;
          if (p.sproutProgress > 1) {
            p.sproutProgress = 1;
            p.alpha -= 0.004;
            if (p.alpha <= 0) {
              this.seedsList.splice(i, 1);
              continue;
            }
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = p.alpha;
          
          const size = p.sproutProgress * 6;
          ctx.beginPath();
          ctx.strokeStyle = '#4a6b35';
          ctx.lineWidth = 1.2;
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-2, -size/2, -size/2, -size);
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(2, -size/2, size/2, -size);
          ctx.stroke();

          ctx.fillStyle = '#fdfaf2';
          ctx.beginPath();
          ctx.arc(-size/2, -size, 1.8, 0, Math.PI * 2);
          ctx.arc(size/2, -size, 1.8, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#e9b949';
          ctx.beginPath();
          ctx.arc(0, -size, 1.2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.16; // Gravity
          p.vx *= 0.98; // Friction

          if (p.y > canvas.height) {
            this.seedsList.splice(i, 1);
            continue;
          }

          const vineX = this.getVineX(p.y, w);
          const dx = p.x - vineX;
          
          if (Math.abs(dx) < 14) {
            p.sprouted = true;
            p.x = vineX;
            p.vx = 0;
            p.vy = 0;
          } else {
            ctx.beginPath();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      this.canvasRafId = requestAnimationFrame(animate);
    };

    this.canvasRafId = requestAnimationFrame(animate);
  }

  private startCursorTrailLoop(): void {
    if (this.cursorLoopActive) return;
    this.cursorLoopActive = true;

    const ease = 0.14;
    const animate = () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const curX = this.cursorX();
      const curY = this.cursorY();
      const diffX = this.realMouseX - curX;
      const diffY = this.realMouseY - curY;

      // Stop loop if the trail has settled at the mouse coordinates
      if (Math.abs(diffX) < 0.08 && Math.abs(diffY) < 0.08) {
        this.cursorX.set(this.realMouseX);
        this.cursorY.set(this.realMouseY);
        this.cursorLoopActive = false;
        this.cursorRafId = null;
        return;
      }

      const nX = curX + diffX * ease;
      const nY = curY + diffY * ease;
      this.cursorX.set(nX);
      this.cursorY.set(nY);
      this.cursorRafId = requestAnimationFrame(animate);
    };
    this.cursorRafId = requestAnimationFrame(animate);
  }

  onCardMouseMove(event: MouseEvent, stageId: number, type: 'copy' | 'art'): void {
    this.activeTiltCard.set(stageId);
    this.tiltType.set(type);
    this.isHoveringCard.set(true);

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Maintain existing mouse trail and wind-tilt triggers for overlays
    if (type === 'art') {
      this.trailX.set(x);
      this.trailY.set(y);
      this.activeTrailStage.set(stageId);
      const normX = (x / rect.width) * 2 - 1;
      this.windTilt.set(normX * 3);

      // Interactive lens zoom origin (percentage coordinates)
      const px = Math.min(Math.max((x / rect.width) * 100, 0), 100);
      const py = Math.min(Math.max((y / rect.height) * 100, 0), 100);
      this.zoomX.set(px);
      this.zoomY.set(py);
    }

    // 3D card tilt calculations
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = x - centerX;
    const dy = y - centerY;
    
    const normX = dx / centerX; // -1 to 1
    const normY = dy / centerY; // -1 to 1

    const maxTilt = 7; // tilt range up to 7 degrees
    this.cardTiltY.set(-normY * maxTilt); // vertical tilt
    this.cardTiltX.set(normX * maxTilt);  // horizontal tilt
  }

  onCardMouseLeave(): void {
    this.activeTiltCard.set(null);
    this.tiltType.set(null);
    this.isHoveringCard.set(false);
    this.cardTiltX.set(0);
    this.cardTiltY.set(0);
    this.zoomX.set(50);
    this.zoomY.set(50);

    // Reset mouse trail and wind tilt signals
    this.activeTrailStage.set(null);
    this.windTilt.set(0);
  }

  setInteractiveHover(state: boolean): void {
    this.isHoveringInteractive.set(state);
  }

  private startVineGrowthLoop(): void {
    if (this.vineRafId !== null) return;

    const animate = () => {
      if (!isPlatformBrowser(this.platformId)) return;
      const ease = 0.085; // smooth trailing easing
      const diff = this.targetProgress - this.easedProgress;

      if (Math.abs(diff) < 0.0001) {
        this.easedProgress = this.targetProgress;
        this.drawVineAtProgress(this.easedProgress);
        this.vineRafId = null;
        return;
      }

      this.easedProgress += diff * ease;
      this.drawVineAtProgress(this.easedProgress);
      this.vineRafId = requestAnimationFrame(animate);
    };
    this.vineRafId = requestAnimationFrame(animate);
  }

  private lastSetProgress = -1;
  private lastSetOrbX = -1;
  private lastSetOrbY = -1;
  private lastSetOrbAngle = -1;

  private drawVineAtProgress(prog: number): void {
    const path = this.vinePath?.nativeElement;
    if (!path || this.pathLength <= 0 || this.cachedPoints.length === 0) return;

    // PERF: Only set progress signal if delta > 0.05% to reduce CD cycles
    if (Math.abs(prog - this.lastSetProgress) > 0.0005) {
      this.progress.set(prog);
      this.lastSetProgress = prog;
    }

    path.style.strokeDashoffset = `${this.pathLength * (1 - prog)}`;

    // Look up point from cache to avoid layouts/getPointAtLength inside animation loop
    const idx = Math.min(Math.max(Math.floor(prog * (this.cachedPoints.length - 1)), 0), this.cachedPoints.length - 1);
    const cachedPt = this.cachedPoints[idx];

    // PERF: Only set orb signals if position changed by > 0.3px
    if (Math.abs(cachedPt.x - this.lastSetOrbX) > 0.3) {
      this.orbX.set(cachedPt.x);
      this.lastSetOrbX = cachedPt.x;
    }
    if (Math.abs(cachedPt.y - this.lastSetOrbY) > 0.3) {
      this.orbY.set(cachedPt.y);
      this.lastSetOrbY = cachedPt.y;
    }
    if (Math.abs(cachedPt.angle - this.lastSetOrbAngle) > 0.5) {
      this.orbAngle.set(cachedPt.angle);
      this.lastSetOrbAngle = cachedPt.angle;
    }
  }
}

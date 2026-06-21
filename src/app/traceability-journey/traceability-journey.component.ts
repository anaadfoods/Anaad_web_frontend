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
import { isPlatformBrowser } from '@angular/common';
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
  imports: [RouterLink],
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
  protected readonly devTokenInput = signal('');
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
      title: 'Know Your Seed',
      summary: 'Pure seeds. Pure intention. The journey begins.',
      detail:
        'Every grain starts with a seed ΓÇö traceably sourced, naturally stored, and ready to meet living soil.',
      image: 'assets/traceability/stage-1.png',
      alt: 'A farmer scattering seeds over red living soil at sunrise.',
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
      title: 'Know Your Farmer',
      summary: 'Meet the hands that nurture your food from seed to soil.',
      detail:
        'Every crop has a farmer behind it ΓÇö with years of natural farming experience and deep respect for the land.',
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
      title: 'Crop Cycle',
      summary: 'Season, soil and science ΓÇö the crop cycle tells the full growing story.',
      detail:
        'From sowing to harvest, every milestone is recorded with precision ΓÇö season, patch, technique and grade.',
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
      title: 'Farming Activities',
      summary: 'Every task on the farm ΓÇö ploughing, sowing, fertilizing ΓÇö logged and traceable.',
      detail:
        'The detailed field log captures every action taken on the land, from soil preparation to the final harvest.',
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
      summary: 'Harvested at the right time to preserve nature\'s true goodness.',
      detail:
        'The field is cut when grain, moisture and maturity align ΓÇö protecting quality before processing begins.',
      image: 'assets/traceability/stage-5.png',
      alt: 'A traditional stone grinding room with firelight and tools.',
      effect: 'fire',
      align: 'right',
      artShiftX: 62,
      artShiftY: -16,
      copyShiftX: -28,
      copyShiftY: 24,
      frameTilt: 5,
      artWidth: 'min(100%, 21rem)',
      imageFit: 'cover',
      imageAspect: '3 / 5',
      imagePosition: 'center'
    },
    {
      id: 6,
      title: 'Raw Material Inventory',
      summary: 'Stored in natural conditions. Every day in the silo is tracked.',
      detail:
        'The harvested grain rests in breathable storage, with temperature and humidity monitored until it moves to processing.',
      image: 'assets/traceability/stage-6.png',
      alt: 'Sacks of grain stored carefully in a traditional interior.',
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
      summary: 'Slow traditional processing retains natural nutrition and aroma.',
      detail:
        'Instead of industrial heat and speed, the grain meets a slower, grounded process that respects texture, flavor and life force.',
      image: 'assets/traceability/stage-7.png',
      alt: 'Anaad products being processed with traditional methods.',
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
      summary: 'Packed hygienically with care, clarity and traceable discipline.',
      detail:
        'The product is portioned, weighed and packed ΓÇö every packet carries its own unique traceable identity.',
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
      title: 'Finished Goods Inventory',
      summary: 'Warehouse-tracked. Every packet accounted for before dispatch.',
      detail:
        'Finished products are logged into the central warehouse with precise entry and exit timestamps.',
      image: 'assets/traceability/stage-9.png',
      alt: 'A warehouse with neatly stacked product boxes ready for dispatch.',
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
      title: 'Transportation',
      summary: 'Delivered with care through ethical and sustainable transport.',
      detail:
        'Movement begins ΓÇö the carrier, vehicle and route become part of the same living traceability thread.',
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
      title: 'Delivery Across India',
      summary: 'Traceable nourishment travelling across the country with visible intent.',
      detail:
        'The route glows outward from source, making nationwide delivery transparent rather than abstract.',
      image: 'assets/traceability/stage-11.png',
      alt: 'A final branded traceability illustration closing the journey.',
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
      title: 'Trust Complete',
      summary: 'Purity verified. Traceability complete. From soil to soul.',
      detail:
        'The journey closes with confidence ΓÇö the brand seals its promise after all previous proof.',
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
      if (accessToken && refreshToken && isPlatformBrowser(this.platformId)) {
        this.authState.setTokens(accessToken, refreshToken);
        this.authService.fetchProfile().subscribe({
          next: () => {
            if (unlockedParam === '1') {
              this.isUnlocked.set(true);
            }
            this.stripTokensFromUrl();
          },
          error: () => {
            this.stripTokensFromUrl();
          }
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

  /** Redirect to login, returning to this page with unlocked=1 flag */
  unlockDelivery(): void {
    const cropId = this.currentCropId() ?? this.DEFAULT_CROP_ID;
    const returnPath = `/traceability-journey?crop_id=${encodeURIComponent(cropId)}&unlocked=1`;

    // Localhost: skip external login (CloudFront blocks cross-origin returnUrl)
    if (this.isLocalDev()) {
      this.isUnlocked.set(true);
      this.deliveryError.set(null);
      return;
    }

    this.router.navigate(['/login'], { queryParams: { returnUrl: returnPath } });
  }

  /** True when running on localhost — dev-only unlock + token paste flow */
  isLocalDev(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }

  /** Dev-only: apply JWT copied from web.anaadfoods.com localStorage */
  applyDevToken(): void {
    const token = this.devTokenInput().trim();
    if (!token) {
      this.deliveryError.set('Paste your access token from web.anaadfoods.com.');
      return;
    }

    this.deliveryError.set(null);
    this.authState.setAccessToken(token);
    this.authService.fetchProfile().subscribe({
      next: () => this.deliveryError.set(null),
      error: () => {
        this.deliveryError.set(
          'Token invalid or expired. Open web.anaadfoods.com/login in a new tab, sign in, then copy anaad_access_token from DevTools → Application → Local Storage.'
        );
      }
    });
  }

  openDevLogin(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    window.open('https://web.anaadfoods.com/login', '_blank', 'noopener,noreferrer');
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

    // Stage 10 — Transportation
    if (orderTk) {
      const events = orderTk.tracking_events ?? [];
      const latest = events[events.length - 1];
      const isFallback = this.trackingFromFallback();
      this.stages[9].summary = isFallback
        ? `Order ${orderTk.status} — awaiting shipment`
        : `${orderTk.status}${latest ? ' — ' + latest.location : ''}`;
      this.stages[9].detail = isFallback
        ? `Order ${orderTk.order_number} · Est. ${orderTk.estimated_delivery ?? 'TBD'}`
        : `AWB: ${orderTk.awb_number ?? 'N/A'} | ${events.length} tracking event(s) | Order: ${orderTk.order_number}`;
    } else if (subTk && subTk.length > 0) {
      const latest = subTk[subTk.length - 1];
      this.stages[9].summary = `${latest.status} — ${subTk.length} shipment(s)`;
      this.stages[9].detail = `Latest AWB: ${latest.awb_number ?? 'N/A'} | Subscription tracking active`;
    }

    // Stage 11 — Delivery Across India
    if (orderTk) {
      const delivered = orderTk.tracking_events?.find(e => e.status === 'DELIVERED');
      const isDelivered = orderTk.status === 'DELIVERED';
      const isFallback = this.trackingFromFallback();
      this.stages[10].summary = isDelivered
        ? 'Delivered ✓ — Product reached you'
        : isFallback
          ? `Order ${orderTk.status} — Est. ${orderTk.estimated_delivery ?? 'TBD'}`
          : `In Transit — Est. ${orderTk.estimated_delivery ?? 'TBD'}`;
      this.stages[10].detail = delivered
        ? `Delivered at ${delivered.location} on ${delivered.timestamp}`
        : isFallback
          ? `Delivery to your address once the order ships from our warehouse`
          : `${orderTk.tracking_events.length} milestone(s) tracked | Est: ${orderTk.estimated_delivery ?? 'TBD'}`;
    } else if (subTk && subTk.length > 0) {
      const deliveredCount = subTk.filter(s => s.status === 'DELIVERED').length;
      this.stages[10].summary = `${deliveredCount} of ${subTk.length} deliveries completed`;
      this.stages[10].detail = `Subscription active — Next delivery scheduled`;
    }

    // Stage 12 — Trust Complete
    const isFullyDelivered = (orderTk?.status === 'DELIVERED') ||
      (subTk?.some(s => s.status === 'DELIVERED') ?? false);
    if (isFullyDelivered) {
      this.stages[11].summary = 'Delivery Confirmed — From Soil to Soul, complete.';
      this.stages[11].detail = 'Your product was grown, processed, packed and delivered with full traceability.';
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

  /** Update stage titles and summaries with live API data */
  private updateStagesFromApi(journey: TraceabilityJourney): void {
    const seed = journey.seed;
    const crop = journey.cropCycle;
    const farmland = journey.farmland;
    const harvest = journey.harvest;
    const processing = journey.processing;
    const packaging = journey.packaging;
    const logistics = journey.logistics;
    const product = journey.product;
    const qc = journey.qualityChecks;
    const auth = journey.authenticity;

    // Stage 1 ΓÇö Know Your Seed
    if (seed) {
      this.stages[0].summary = `${seed.cropName}${seed.variety ? ' (' + seed.variety + ')' : ''} ΓÇö ${seed.isOrganic ? 'Organic Γ£à' : 'Conventional'}`;
      this.stages[0].detail = `Sourced from ${seed.source}.${seed.purchaseDate ? ' Purchased on ' + this.formatDate(seed.purchaseDate) + '.' : ''} Seed Code: ${seed.seedCode}.`;
    } else if (crop?.seedCode) {
      this.stages[0].summary = `${crop.cropName}${crop.scientificName ? ' (' + crop.scientificName + ')' : ''}`;
      this.stages[0].detail = `Seed: ${crop.seedCode}.${crop.sourceOfSeed ? ' Source: ' + crop.sourceOfSeed + '.' : ''}`;
    }

    // Stage 2 — Know Your Farmer
    if (crop?.farmer) {
      const f = crop.farmer;
      const photo = this.resolveFarmerPhoto(f);
      this.stages[1].summary = `${f.name}${f.place ? ' — ' + f.place : ''}`;
      this.stages[1].detail = `${f.experience ? 'Experience: ' + f.experience + (typeof f.experience === 'number' ? ' years' : '') + '. ' : ''}${f.age ? 'Age: ' + f.age + '.' : ''}`;
      if (photo) {
        this.stages[1].image = photo;
        this.stages[1].alt = `${f.name}${f.place ? ', ' + f.place : ''} — Anaad farmer`;
        this.stages[1].imageFit = 'cover';
        this.stages[1].imagePosition = 'center';
      }
    }

    // Stage 3 ΓÇö Crop Cycle
    if (crop) {
      this.stages[2].summary = `${crop.cropName}${crop.season ? ' ΓÇö ' + crop.season : ''} ${crop.sowingDate ? new Date(crop.sowingDate + 'T00:00:00').getFullYear() : ''}`;
      const details: string[] = [];
      if (crop.sowingDate) details.push('Sown: ' + this.formatDate(crop.sowingDate));
      if (crop.expectedHarvestDate) details.push('Expected Harvest: ' + this.formatDate(crop.expectedHarvestDate));
      if (crop.naturalFarmingTechniques) details.push('Techniques: ' + crop.naturalFarmingTechniques);
      if (crop.cropGrade) details.push('Grade: ' + crop.cropGrade);
      if (farmland?.block?.name) details.push('Block: ' + farmland.block.name);
      if (farmland?.patch?.name) details.push('Patch: ' + farmland.patch.name);
      details.push('Cycle: ' + crop.cycleCode);
      this.stages[2].detail = details.join(' | ');
    }

    // Stage 4 ΓÇö Farming Activities & Work Entries
    const workEntries = farmland?.workEntries ?? [];
    const activities = journey.farmingActivities ?? [];
    const totalTasks = workEntries.length + activities.length;
    if (totalTasks > 0) {
      this.stages[3].summary = `${totalTasks} farming task(s) logged for this crop cycle.`;
      const taskDescs: string[] = [];
      workEntries.forEach(w => taskDescs.push(`${w.tag}${w.task ? ' (' + w.task + ')' : ''}: ${w.status}`));
      activities.forEach(a => taskDescs.push(`${a.activityType.replace(/_/g, ' ')}${a.date ? ' on ' + this.formatDate(a.date) : ''}`));
      this.stages[3].detail = taskDescs.slice(0, 6).join(' | ') + (totalTasks > 6 ? ` + ${totalTasks - 6} moreΓÇª` : '');
    } else {
      this.stages[3].summary = 'Farming tasks will appear as field work progresses.';
      this.stages[3].detail = 'No farming activities or work entries recorded yet for this cycle.';
    }

    // Stage 5 ΓÇö Harvest
    if (harvest) {
      this.stages[4].summary = `${harvest.cropName} ΓÇö ${harvest.rawQuantity ?? 'N/A'}${harvest.qualityGrade ? ' | Grade: ' + harvest.qualityGrade : ''}`;
      this.stages[4].detail = `Harvested on ${harvest.harvestDate ? this.formatDate(harvest.harvestDate) : 'N/A'}.${harvest.harvestType ? ' Method: ' + harvest.harvestType + '.' : ''}${harvest.moistureLevel !== null ? ' Moisture: ' + harvest.moistureLevel + '%.' : ''} Batch: ${harvest.batchCode}.`;
    } else if (crop?.actualHarvestDate) {
      this.stages[4].summary = `${crop.cropName} ΓÇö Harvest Completed`;
      this.stages[4].detail = `Harvested from ${crop.blockName || 'fields'}${crop.patchName ? ' (' + crop.patchName + ')' : ''} on ${this.formatDate(crop.actualHarvestDate)}.`;
    } else {
      this.stages[4].summary = 'Harvest Pending';
      this.stages[4].detail = 'The crop is still growing. Harvest details will appear after the crop is harvested.';
    }

    // Stage 6 ΓÇö Raw Material Inventory
    if (harvest?.storedAt) {
      this.stages[5].summary = `Stored at ${harvest.storageFacilityName ?? 'farm silo'}${harvest.curingDurationDays !== null ? ' ΓÇö ' + harvest.curingDurationDays + ' days' : ''}`;
      const invDetails: string[] = [];
      invDetails.push('Received: ' + this.formatDateTime(harvest.storedAt));
      if (harvest.curedUntil) invDetails.push('Released: ' + this.formatDateTime(harvest.curedUntil));
      if (harvest.storageCondition) invDetails.push('Conditions: ' + harvest.storageCondition);
      this.stages[5].detail = invDetails.join(' | ');
    } else if (harvest) {
      this.stages[5].summary = 'Storage Pending';
      this.stages[5].detail = 'Harvest completed. Awaiting transfer to raw material storage.';
    } else {
      this.stages[5].summary = 'Awaiting Harvest';
      this.stages[5].detail = 'Raw material inventory tracking will begin after the harvest is stored.';
    }

    // Stage 7 ΓÇö Processing
    if (processing && processing.length > 0) {
      this.stages[6].summary = `${processing.length} processing stage(s): ${processing.map(p => p.processType.replace(/_/g, ' ')).join(', ')}.`;
      this.stages[6].detail = processing.map(p => `${p.processType}: ${p.status}${p.completedAt ? ' (completed ' + this.formatDateTime(p.completedAt) + ')' : ''}`).join(' | ');
    } else {
      this.stages[6].summary = 'Processing Pending';
      this.stages[6].detail = 'Processing will be scheduled after the raw material inventory phase.';
    }

    // Stage 8 ΓÇö Packaging
    if (packaging) {
      this.stages[7].summary = `${packaging.totalUnits} packets of ${packaging.unitSize ?? product?.unitSize ?? 'N/A'} ΓÇö ${packaging.status}`;
      this.stages[7].detail = `Packed on ${packaging.packagingDate ? this.formatDate(packaging.packagingDate) : 'N/A'}. Mfg: ${packaging.manufacturingDate ? this.formatDate(packaging.manufacturingDate) : 'N/A'} | Exp: ${packaging.expiryDate ? this.formatDate(packaging.expiryDate) : 'N/A'}. Code: ${packaging.packagingCode}.`;
    } else {
      this.stages[7].summary = 'Packaging Pending';
      this.stages[7].detail = 'Packaging will begin after processing is complete.';
    }

    // Stage 9 ΓÇö Finished Goods Inventory
    if (packaging?.warehouseReceivedAt) {
      this.stages[8].summary = `${packaging.warehouseName ?? 'Warehouse'}${packaging.warehouseDurationDays !== null ? ' ΓÇö ' + packaging.warehouseDurationDays + ' days' : ''}`;
      const whDetails: string[] = [];
      whDetails.push('Received: ' + this.formatDateTime(packaging.warehouseReceivedAt));
      if (packaging.warehouseDispatchedAt) whDetails.push('Dispatched: ' + this.formatDateTime(packaging.warehouseDispatchedAt));
      this.stages[8].detail = whDetails.join(' | ');
    } else {
      this.stages[8].summary = 'Warehouse Pending';
      this.stages[8].detail = 'Finished goods will be tracked after packaging is complete.';
    }

    // Stage 10 ΓÇö Transportation
    if (logistics) {
      this.stages[9].summary = `${logistics.carrier ?? 'Carrier N/A'}${logistics.status ? ' ΓÇö ' + logistics.status : ''}`;
      const transDetails: string[] = [];
      if (logistics.origin) transDetails.push('From: ' + logistics.origin);
      if (logistics.vehicleNumber) transDetails.push('Vehicle: ' + logistics.vehicleNumber);
      this.stages[9].detail = transDetails.join(' | ') || 'Transit details pending.';
    } else {
      this.stages[9].summary = 'Transportation Pending';
      this.stages[9].detail = 'Logistics tracking will begin after warehouse dispatch.';
    }

    // Stage 11 ΓÇö Delivery Across India
    if (logistics?.destination) {
      this.stages[10].summary = `${logistics.destination}${logistics.deliveredAt ? ' ΓÇö Delivered Γ£à' : ' ΓÇö In Transit'}`;
      const delDetails: string[] = [];
      if (logistics.deliveredAt) delDetails.push('Delivered: ' + this.formatDateTime(logistics.deliveredAt));
      if (logistics.steps?.length) delDetails.push(logistics.steps.length + ' milestone(s) tracked');
      this.stages[10].detail = delDetails.join(' | ') || 'Delivery details pending.';
    } else {
      this.stages[10].summary = 'Delivery Pending';
      this.stages[10].detail = 'Delivery tracking will appear once the shipment is in transit.';
    }

    // Stage 12 ΓÇö Trust Complete
    if (auth) {
      this.stages[11].summary = `${auth.message}`;
      this.stages[11].detail = `Scan #${auth.scanCount}${auth.verifiedAt ? ' | Verified: ' + this.formatDateTime(auth.verifiedAt) : ''}${auth.qrCode ? ' | QR: ' + auth.qrCode : ''}`;
    }
  }

  /** Resolve farmer photo from API (supports camelCase and snake_case keys) */
  resolveFarmerPhoto(farmer: TraceFarmer | null | undefined): string | null {
    if (!farmer) return null;
    const raw = farmer as TraceFarmer & { photo_url?: string | null; photo?: string | null; image_url?: string | null };
    const url = farmer.photoUrl ?? raw.photo_url ?? raw.photo ?? raw.image_url ?? null;
    return url && url.trim().length > 0 ? url.trim() : null;
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
    } else if (this.flippedCard() === stageId) {
      this.flippedCard.set(null);
    } else {
      this.flippedCard.set(stageId);
    }
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

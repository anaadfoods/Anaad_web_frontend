import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
  signal
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

type StageEffect =
  | 'seeds'
  | 'motes'
  | 'crop'
  | 'chaff'
  | 'fire'
  | 'dust'
  | 'package'
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

@Component({
  selector: 'app-traceability-journey',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './traceability-journey.component.html',
  styleUrl: './traceability-journey.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TraceabilityJourneyComponent implements AfterViewInit, OnDestroy {
  @ViewChild('journeyRoot') private journeyRoot?: ElementRef<HTMLElement>;
  @ViewChild('vinePath') private vinePath?: ElementRef<SVGPathElement>;
  @ViewChildren('scene') private sceneRefs?: QueryList<ElementRef<HTMLElement>>;

  private readonly platformId = inject(PLATFORM_ID);
  private pathLength = 0;
  private rafId: number | null = null;
  private vineScale = 1;
  private vbH = 4700;

  protected readonly progress = signal(0);
  protected readonly orbX = signal(110);
  protected readonly orbY = signal(0);
  protected readonly orbAngle = signal(0);
  protected readonly leaves = signal<VineLeaf[]>([]);
  protected readonly blossoms = signal<Blossom[]>([]);

  protected readonly petalAngles = [0, 72, 144, 216, 288];
  protected readonly stems = Array.from({ length: 7 }, (_, i) => 18 + i * 11);

  protected readonly stages: Stage[] = [
    {
      id: 1,
      title: 'Seed Sowing',
      summary: 'Pure seeds. Pure intention. The journey begins.',
      detail:
        'Heirloom seeds, saved and never bought, leave the farmers hand and meet living soil with no chemical coating or treatment.',
      image: 'assets/traceability/stage-2.png',
      alt: 'A farmer scattering seeds over red living soil at sunrise.',
      effect: 'seeds',
      align: 'right',
      artShiftX: 50,
      artShiftY: -22,
      copyShiftX: -20,
      copyShiftY: 28,
      frameTilt: 4,
      artWidth: 'min(100%, 37rem)'
    },
    {
      id: 2,
      title: 'Natural Farming',
      summary: 'Cow-based farming. Jeevamrit and herbal preparations. The soil breathes.',
      detail:
        'The desi cow anchors fertility, microbe life and field health. Her presence is not symbolic, it is biological infrastructure.',
      image: 'assets/traceability/stage-1.png',
      alt: 'A desi cow walking across the field beside farm tools and living soil inputs.',
      effect: 'motes',
      align: 'left',
      artShiftX: -64,
      artShiftY: 18,
      copyShiftX: 32,
      copyShiftY: -24,
      frameTilt: -5,
      artWidth: 'min(100%, 39rem)',
      dawnGlow: true
    },
    {
      id: 3,
      title: 'Crop Growth',
      summary: 'Healthy soil. Healthy crops. A promise of wholesome nutrition.',
      detail:
        'The field thickens with life as roots, microbes, sunlight and time begin turning seed memory into nourishment.',
      image: 'assets/traceability/stage-3.png',
      alt: 'Young crop rows rising from a fertile field under warm light.',
      effect: 'crop',
      align: 'right',
      artShiftX: 70,
      artShiftY: -8,
      copyShiftX: -34,
      copyShiftY: 18,
      frameTilt: 3,
      artWidth: 'min(100%, 38rem)'
    },
    {
      id: 4,
      title: 'Harvesting',
      summary: 'Harvested at the right time to preserve natures true goodness.',
      detail:
        'The field is cut when grain, moisture and maturity line up. This stage protects quality long before processing begins.',
      image: 'assets/traceability/stage-4.png',
      alt: 'A farmer harvesting a golden crop by hand in the field.',
      effect: 'chaff',
      align: 'left',
      artShiftX: -78,
      artShiftY: 26,
      copyShiftX: 38,
      copyShiftY: -18,
      frameTilt: -4,
      artWidth: 'min(100%, 37rem)'
    },
    {
      id: 5,
      title: 'Stone Grinding',
      summary: 'Slow traditional processing retains natural nutrition and aroma.',
      detail:
        'Instead of industrial heat and speed, the grain meets a slower, grounded process that respects texture, flavor and life force.',
      image: 'assets/traceability/stage-5.png',
      alt: 'A traditional stone grinding room with firelight and tools.',
      effect: 'fire',
      align: 'right',
      artShiftX: 62,
      artShiftY: -16,
      copyShiftX: -28,
      copyShiftY: 24,
      frameTilt: 5,
      artWidth: 'min(100%, 36rem)'
    },
    {
      id: 6,
      title: 'Natural Storage',
      summary: 'Stored in seed-safe conditions to protect freshness, purity and life.',
      detail:
        'The grain pauses in breathable storage, away from harsh industrial handling, while quality is preserved for the next stage.',
      image: 'assets/traceability/stage-6.png',
      alt: 'Sacks of grain stored carefully in a traditional interior.',
      effect: 'dust',
      align: 'left',
      artShiftX: -54,
      artShiftY: 14,
      copyShiftX: 24,
      copyShiftY: -20,
      frameTilt: -3,
      artWidth: 'min(100%, 34rem)'
    },
    {
      id: 7,
      title: 'Packaging',
      summary: 'Packed hygienically with care, clarity and traceable discipline.',
      detail:
        'The product is portioned, weighed and packed for transit with the same premium visual language the user should feel on this page.',
      image: 'assets/traceability/stage-7.png',
      alt: 'Anaad products being packed on a work table with sacks and tools.',
      effect: 'package',
      align: 'right',
      artShiftX: 84,
      artShiftY: -12,
      copyShiftX: -36,
      copyShiftY: 12,
      frameTilt: 4,
      artWidth: 'min(100%, 40rem)'
    },
    {
      id: 8,
      title: 'Transportation',
      summary: 'Delivered with care through ethical and sustainable transport.',
      detail:
        'Movement begins, but without breaking the story. The cart, wheel and route become part of the same living traceability thread.',
      image: 'assets/traceability/stage-8.png',
      alt: 'A bullock cart transporting produce through a rural landscape.',
      effect: 'wheel',
      align: 'left',
      artShiftX: -70,
      artShiftY: 18,
      copyShiftX: 36,
      copyShiftY: -12,
      frameTilt: -5,
      artWidth: 'min(100%, 41rem)'
    },
    {
      id: 9,
      title: 'Delivery Across India',
      summary: 'Traceable nourishment travelling across the country with visible intent.',
      detail:
        'The route glows outward from source, making the idea of nationwide delivery feel transparent rather than abstract.',
      image: 'assets/traceability/stage-9.png',
      alt: 'A map of India with route lines showing product delivery across regions.',
      effect: 'route',
      align: 'right',
      artShiftX: 76,
      artShiftY: -10,
      copyShiftX: -30,
      copyShiftY: 18,
      frameTilt: 3,
      artWidth: 'min(100%, 35rem)'
    },
    {
      id: 10,
      title: 'Nourishing Lives',
      summary: 'From living soil to the family table. Warmth, trust and nourishment.',
      detail:
        'The final food experience should feel emotionally complete: the field is still present in the meal, the packaging and the family moment.',
      image: 'assets/traceability/stage-10.png',
      alt: 'A family sharing a meal with Anaad products on the table.',
      effect: 'steam',
      align: 'left',
      artShiftX: -62,
      artShiftY: 20,
      copyShiftX: 28,
      copyShiftY: -22,
      frameTilt: -4,
      artWidth: 'min(100%, 39rem)'
    },
    {
      id: 11,
      title: 'Trust Complete',
      summary: 'Purity verified. Traceability complete. From soil to soul.',
      detail:
        'The journey closes with confidence, not noise. This final scene should feel like the brand sealing the promise after all previous proof.',
      image: 'assets/traceability/stage-11.png',
      alt: 'A final branded traceability illustration closing the journey.',
      effect: 'halo',
      align: 'right',
      artShiftX: 40,
      artShiftY: -8,
      copyShiftX: -18,
      copyShiftY: 20,
      frameTilt: 2,
      artWidth: 'min(100%, 30rem)',
      dawnGlow: true
    }
  ];


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

    // Layout settles after images/fonts load; build then and again on full load.
    requestAnimationFrame(() => this.buildVine());
    window.addEventListener('load', () => this.buildVine(), { once: true });
    setTimeout(() => this.buildVine(), 1200);
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

    // Anchor a bend at each stage centre, alternating sides for the serpentine flow.
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

    this.decorateVine(path);
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
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
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

    const rect = root.getBoundingClientRect();
    const vh = window.innerHeight || 1;

    // Reveal scenes once a quarter of them enters the viewport.
    const scenes = this.sceneRefs?.toArray() ?? [];
    for (const scene of scenes) {
      const el = scene.nativeElement;
      if (el.classList.contains('is-live')) continue;
      const r = el.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible >= Math.min(r.height, vh) * 0.24) {
        el.classList.add('is-live');
      }
    }

    // Pin the creeper to the line 55% down the viewport, in vine coordinates.
    const targetY = Math.min(Math.max((vh * 0.55 - rect.top) / this.vineScale, 0), this.vbH);
    const length = this.lengthAtY(path, targetY);
    const crawlerProgress = Math.min(Math.max(length / this.pathLength, 0), 1);

    this.progress.set(crawlerProgress);

    path.style.strokeDashoffset = `${this.pathLength * (1 - crawlerProgress)}`;
    const point = path.getPointAtLength(length);
    const nextPoint = path.getPointAtLength(Math.min(this.pathLength, length + 10));
    const angle = (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI;

    this.orbX.set(point.x);
    this.orbY.set(point.y);
    this.orbAngle.set(angle + 90);
  }

  /** Binary-search the path length whose point sits at the given y (path is monotonic in y). */
  private lengthAtY(path: SVGPathElement, y: number): number {
    let lo = 0;
    let hi = this.pathLength;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (path.getPointAtLength(mid).y < y) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
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
}

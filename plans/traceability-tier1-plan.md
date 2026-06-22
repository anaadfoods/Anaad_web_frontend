# Traceability Journey — Tier 1 UI Improvements Plan

## Overview
Five quick-win improvements for [`src/app/traceability-journey/traceability-journey.component.*`](src/app/traceability-journey/) with high visual impact and minimal code changes.

---

## 1. Fix Stage 1 & 2 Image Swap

**File**: [`src/app/traceability-journey/traceability-journey.component.ts`](src/app/traceability-journey/traceability-journey.component.ts)  
**Lines**: 175 & 192 in the `stages` array

**Current state (bug)**:
- Stage 1 ("Seed Sowing") → `image: 'assets/traceability/stage-2.png'` — shows a cow  
- Stage 2 ("Natural Farming") → `image: 'assets/traceability/stage-1.png'` — shows seed sowing

**Fix**:
- Stage 1 → `image: 'assets/traceability/stage-1.png'`
- Stage 2 → `image: 'assets/traceability/stage-2.png'`

**Also verify alt text**:
- Stage 1 alt is `'A farmer scattering seeds over red living soil at sunrise.'` — matches stage-1.png ✅
- Stage 2 alt is `'A desi cow walking across the field beside farm tools and living soil inputs.'` — matches stage-2.png ✅

---

## 2. Horizontal Stage Pill Navigator (Mobile)

**Changes needed in 3 files**: HTML, SCSS, TS

### 2a. HTML (`traceability-journey.component.html`)
Add below the `journey-progress` div (after line 40):

```html
<!-- Tier 1: Horizontal stage pill navigator for mobile -->
<nav class="journey-pills" aria-label="Quick jump to stage">
  @for (s of stages; track s.id) {
    <button
      class="journey-pills__pill"
      [class.is-active]="currentStage() === s.id"
      (click)="scrollToStage(s.id)"
      (mouseenter)="setInteractiveHover(true)"
      (mouseleave)="setInteractiveHover(false)"
      [attr.aria-label]="'Jump to Stage ' + s.id"
    >
      <span class="journey-pills__num">{{ s.id }}</span>
      <span class="journey-pills__title">{{ s.title }}</span>
    </button>
  }
</nav>
```

### 2b. SCSS (at end of scss file)
```scss
/* Tier 1: Mobile Horizontal Stage Pill Navigator */
.journey-pills {
  position: fixed;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10001; // above progress bar's stage counter
  display: none;
  gap: 6px;
  padding: 4px 8px;
  overflow-x: auto;
  max-width: calc(100vw - 80px);
  scrollbar-width: none;
  -ms-overflow-style: none;
  mask-image: linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%);
  pointer-events: auto;

  &::-webkit-scrollbar { display: none; }

  @media (max-width: 768px) {
    display: flex;
  }

  &__pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid rgba(168, 118, 46, 0.2);
    background: rgba(253, 250, 242, 0.85);
    backdrop-filter: blur(6px);
    white-space: nowrap;
    cursor: pointer;
    font-family: var(--font-sans);
    transition: background 0.25s, border-color 0.25s, box-shadow 0.25s;
    outline: none;

    &:hover {
      background: rgba(168, 118, 46, 0.08);
      border-color: #a8762e;
    }

    &.is-active {
      background: linear-gradient(135deg, #4a6b35, #3d5c2c);
      border-color: #2c4a1e;
      box-shadow: 0 2px 8px rgba(74, 107, 53, 0.35);
    }
  }

  &__num {
    font-size: 0.6rem;
    font-weight: 700;
    color: #a8762e;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(168, 118, 46, 0.1);
    transition: color 0.25s, background 0.25s;

    .is-active & {
      color: #fdfaf2;
      background: rgba(255, 255, 255, 0.2);
    }
  }

  &__title {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(46, 36, 23, 0.7);
    transition: color 0.25s;

    .is-active & { color: #fdfaf2; }
  }
}
```

### 2c. TS
No new logic needed — reuses existing `scrollToStage()` and `setInteractiveHover()`.

---

## 3. Progress Bar Stage Tick Marks

### 3a. HTML
Within `.journey-progress`, add after `__fill` (after line 38):

```html
<!-- Tier 1: Stage tick marks on progress bar -->
<div class="journey-progress__ticks" aria-hidden="true">
  @for (s of stages; track s.id) {
    <span
      class="journey-progress__tick"
      [class.is-passed]="currentStage() >= s.id"
      [style.left.%]="((s.id - 1) / 10) * 100"
    ></span>
  }
</div>
```

### 3b. SCSS
```scss
/* Tier 1: Progress Bar Stage Tick Marks */
.journey-progress__ticks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.journey-progress__tick {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(46, 36, 23, 0.15);
  border: 1px solid rgba(46, 36, 23, 0.08);
  transition: background 0.4s ease, box-shadow 0.4s ease, transform 0.3s ease;

  &.is-passed {
    background: #c9943a;
    box-shadow: 0 0 6px rgba(201, 148, 58, 0.6);
    transform: translate(-50%, -50%) scale(1.3);
  }
}
```

---

## 4. Enhanced Scroll-Down Indicator

### 4a. HTML
Replace the existing `journey-intro__sprout` (lines 72-79) with:

```html
<!-- Tier 1: Enhanced scroll-down indicator -->
<div class="journey-intro__scroll-hint" [class.is-hidden]="progress() > 0.02" aria-hidden="true">
  <div class="journey-intro__sprout">
    <svg viewBox="0 0 40 40">
      <path class="sprout__seed" d="M16 28 C16 24, 24 24, 24 28 C24 32, 16 32, 16 28 Z" fill="#a8762e" />
      <path class="sprout__stem" d="M20 27 C20 20, 18 16, 20 10" fill="none" stroke="#4a6b35" stroke-width="2" stroke-linecap="round" />
      <path class="sprout__leaf sprout__leaf--left" d="M20 12 C14 10, 10 14, 12 18 C16 18, 19 16, 20 12" fill="#4a6b35" />
      <path class="sprout__leaf sprout__leaf--right" d="M20 12 C26 10, 30 14, 28 18 C24 18, 21 16, 20 12" fill="#6c8f52" />
    </svg>
  </div>
  <span class="journey-intro__hint-text">Scroll to trace the journey</span>
  <div class="journey-intro__chevron">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  </div>
</div>
```

### 4b. SCSS
```scss
/* Tier 1: Enhanced Scroll Indicator */
.journey-intro__scroll-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-top: 4rem;
  position: relative;
  z-index: 2;
  animation: intro-rise 1.2s 0.8s cubic-bezier(0.165, 0.84, 0.44, 1) both;
  transition: opacity 0.6s ease, transform 0.6s ease;

  &.is-hidden {
    opacity: 0;
    transform: translateY(10px);
    pointer-events: none;
  }
}

.journey-intro__hint-text {
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(46, 36, 23, 0.45);
}

.journey-intro__chevron {
  width: 22px;
  height: 22px;
  color: #a8762e;
  animation: chevron-bounce 1.8s ease-in-out infinite;
}

@keyframes chevron-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(6px); opacity: 1; }
}
```

Keep existing sprout keyframes (`sprout-bob`, `seed-pulse`, `stem-grow`, `leaf-unfurl-left/right`) unchanged.

---

## 5. Back-to-Top Floating Button

### 5a. HTML
Add inside `.journey-page` (near the glass-cursor div at the bottom, before closing `</div>`):

```html
<!-- Tier 1: Back-to-Top Floating Button -->
<button
  class="journey-back-top"
  [class.is-visible]="progress() > 0.28"
  (click)="scrollToTop()"
  (mouseenter)="setInteractiveHover(true)"
  (mouseleave)="setInteractiveHover(false)"
  aria-label="Scroll back to top"
>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
</button>
```

### 5b. SCSS
```scss
/* Tier 1: Back-to-Top Floating Button */
.journey-back-top {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 9998;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(168, 118, 46, 0.3);
  background: rgba(253, 250, 242, 0.9);
  backdrop-filter: blur(8px);
  color: #a8762e;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(12px) scale(0.9);
  pointer-events: none;
  box-shadow: 0 4px 14px rgba(46, 36, 23, 0.08);
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), 
              background 0.25s, border-color 0.25s, box-shadow 0.25s;

  svg {
    width: 18px;
    height: 18px;
  }

  &.is-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  &:hover {
    background: rgba(168, 118, 46, 0.08);
    border-color: #a8762e;
    box-shadow: 0 6px 20px rgba(168, 118, 46, 0.18);
    transform: translateY(-2px) scale(1.05);
  }

  @media (max-width: 768px) {
    bottom: 20px;
    right: 16px;
    width: 38px;
    height: 38px;
  }
}
```

### 5c. TS — add `scrollToTop()` method
In the component class, add a method:

```typescript
scrollToTop(): void {
  const root = this.journeyRoot?.nativeElement;
  if (root) {
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
```

---

## Implementation Order & File Changes Summary

| # | File | Type | Change |
|---|------|------|--------|
| 1 | `traceability-journey.component.ts` | Edit | Swap `stage-1.png` / `stage-2.png` image paths |
| 2 | `traceability-journey.component.html` | Edit | Add pills nav HTML after progress bar |
| 2 | `traceability-journey.component.scss` | Append | Add pills nav styles |
| 3 | `traceability-journey.component.html` | Edit | Add tick marks HTML inside progress bar |
| 3 | `traceability-journey.component.scss` | Append | Add tick mark styles |
| 4 | `traceability-journey.component.html` | Edit | Replace sprout with enhanced indicator |
| 4 | `traceability-journey.component.scss` | Append | Add new indicator + chevron styles |
| 5 | `traceability-journey.component.html` | Edit | Add back-to-top button |
| 5 | `traceability-journey.component.scss` | Append | Add back-to-top button styles |
| 5 | `traceability-journey.component.ts` | Edit | Add `scrollToTop()` method |

**All 5 items are self-contained and can be implemented independently.** No external dependencies or new imports needed.

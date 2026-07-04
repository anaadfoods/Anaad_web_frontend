import {

  ChangeDetectionStrategy,

  Component,

  OnInit,

  inject,

  signal,

  computed,

  ChangeDetectorRef,

  PLATFORM_ID,

} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';

import { AaharVigyanWelcomeComponent } from './components/welcome/welcome.component';

import { AaharVigyanQuizComponent } from './components/quiz/quiz.component';

import { AaharVigyanPrakritiComponent } from './components/prakriti-result/prakriti-result.component';

import { AaharVigyanMainComponent } from './components/main/main.component';

import { FooterComponent } from '../layout/footer/footer.component';

import { AaharVigyanStateService } from './services/aahar-vigyan-state.service';

import { AaharVigyanStep, DoshaCode, PrakritiScores } from './models/aahar-vigyan.model';

import { AuthService } from '../core/services/auth.service';

import { AuthState } from '../core/state/auth.state';

import { environment } from '../../environments/environment';



@Component({

  changeDetection: ChangeDetectionStrategy.OnPush,

  selector: 'app-aahar-vigyan',

  standalone: true,

  imports: [

    AaharVigyanWelcomeComponent,

    AaharVigyanQuizComponent,

    AaharVigyanPrakritiComponent,

    AaharVigyanMainComponent,

    FooterComponent,

  ],

  templateUrl: './aahar-vigyan.component.html',

  styleUrl: './aahar-vigyan.component.scss',

})

export class AaharVigyanComponent implements OnInit {

  private readonly avState = inject(AaharVigyanStateService);

  private readonly authSvc = inject(AuthService);

  private readonly authState = inject(AuthState);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly platformId = inject(PLATFORM_ID);



  protected readonly step = signal<AaharVigyanStep>('welcome');

  protected readonly pendingPrakriti = signal<PrakritiScores | null>(null);



  protected readonly doshaAttr = computed(() => {

    const p = this.pendingPrakriti() ?? this.avState.prakriti();

    return p?.dominant ?? 'vata';

  });



  ngOnInit(): void {

    this.ensureDevSession();

    this.applyResetIfRequested();

    this.avState.loadForCurrentUser();

    if (this.avState.isOnboardingComplete()) {

      this.step.set('main');

    }

  }



  private ensureDevSession(): void {

    if (environment.devBypassAuth && !this.authState.isAuthenticated()) {

      this.authSvc.devBypassLogin();

    }

  }



  /** Local dev: /aahar-vigyan?reset clears quiz progress and returns to welcome */

  private applyResetIfRequested(): void {

    if (!environment.devBypassAuth || !isPlatformBrowser(this.platformId)) return;

    const params = new URLSearchParams(window.location.search);

    if (!params.has('reset')) return;

    this.avState.clearAllProfiles();

    sessionStorage.removeItem('av-hero-intro-seen');

    this.pendingPrakriti.set(null);

    this.step.set('welcome');

    window.history.replaceState({}, '', window.location.pathname);

  }



  onStartQuiz(): void {

    this.pendingPrakriti.set(null);

    this.step.set('quiz');

    this.cdr.markForCheck();

  }



  onQuizComplete(answers: DoshaCode[]): void {

    this.ensureDevSession();

    const prakriti = this.avState.savePrakriti(answers);

    this.pendingPrakriti.set(prakriti);

    this.step.set('prakriti');

    this.cdr.markForCheck();

  }



  onContinueToMain(): void {

    this.step.set('main');

    this.cdr.markForCheck();

  }



  onRetakeQuiz(): void {

    this.pendingPrakriti.set(null);

    this.avState.clearForCurrentUser();

    this.step.set('quiz');

    this.cdr.markForCheck();

  }



  onBackToWelcome(): void {

    this.step.set('welcome');

  }

}



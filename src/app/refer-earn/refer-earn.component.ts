import { Component, OnInit, inject, signal, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { ReferralsSummary, Referral } from '../core/models/auth.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-refer-earn',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './refer-earn.component.html',
  styleUrls: ['./refer-earn.component.scss']
})
export class ReferEarnComponent implements OnInit {
  private readonly authSvc = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  loading = signal<boolean>(true);
  error = signal<string>('');
  referralData = signal<ReferralsSummary | null>(null);
  copiedToast = signal<boolean>(false);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadReferralData();
    }
  }

  loadReferralData() {
    this.loading.set(true);
    this.error.set('');

    this.authSvc.getReferrals().subscribe({
      next: (data) => {
        this.referralData.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load referral details. Please try again.');
        this.loading.set(false);
      }
    });
  }

  get referralCode(): string {
    return this.referralData()?.referral_code || '—';
  }

  get totalReferrals(): number {
    return this.referralData()?.referrals_count ?? 0;
  }

  get pendingReferrals(): number {
    return this.referralData()?.pending_count ?? 0;
  }

  get orderedReferrals(): number {
    return this.referralData()?.ordered_count ?? 0;
  }

  get pendingRewards(): number {
    return this.referralData()?.pending_reward_count ?? 0;
  }

  get referredBy(): any {
    return this.referralData()?.referred_by;
  }

  get rewardsInfo(): { you_get: string; they_get: string } | undefined {
    return this.referralData()?.rewards_info;
  }

  get referredUsers(): Referral[] {
    return this.referralData()?.referred_users || this.referralData()?.referrals || [];
  }

  get heroDescription(): string {
    const info = this.rewardsInfo;
    if (info?.you_get && info?.they_get) {
      return `Invite friends and family to ANAAD. When they place their first order, they get ${info.they_get} and you get ${info.you_get}! 🎁`;
    }
    return `Invite friends and family to ANAAD. When they place their first order, you'll receive a special reward from us. 🎁`;
  }

  copyCode() {
    if (!isPlatformBrowser(this.platformId)) return;
    const code = this.referralCode;
    if (!code || code === '—') return;

    navigator.clipboard.writeText(code).then(() => {
      this.copiedToast.set(true);
      setTimeout(() => this.copiedToast.set(false), 2500);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.copiedToast.set(true);
      setTimeout(() => this.copiedToast.set(false), 2500);
    });
  }

  share(platform: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    const code = this.referralCode;
    const shareUrl = `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;
    const shareText = `Join Anaad — where food meets farming! Use my referral code: ${code} to sign up & place your first order.\n\nSign up here: ${shareUrl}`;

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Join Anaad! Referral code: ${code}`)}`, '_blank');
    } else if (platform === 'email') {
      window.open(`mailto:?subject=${encodeURIComponent('Join Anaad — Fresh from the Farm!')}&body=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'native' || platform === 'more') {
      if (navigator.share) {
        navigator.share({
          title: 'Join Anaad — Fresh from the Farm!',
          text: shareText,
          url: shareUrl,
        }).catch(() => {});
      } else {
        this.copyCode();
      }
    }
  }

  getReferralStatusClass(status: string | null | undefined): string {
    if (!status) return 'status-pending';
    const upper = status.toUpperCase();
    if (upper === 'ACCEPTED' || upper === 'ORDERED' || upper === 'COMPLETED') return 'status-ordered';
    if (upper === 'PENDING') return 'status-pending';
    return 'status-other';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_) {
      return dateStr;
    }
  }
}

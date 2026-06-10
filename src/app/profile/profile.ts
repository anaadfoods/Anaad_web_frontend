import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { ProfileService } from '../core/services/profile.service';
import { OrderService } from '../core/services/order.service';
import { Router, RouterLink } from '@angular/router';
import { CurrencyInrPipe } from '../shared/pipes/currency-inr.pipe';
import { SubscriptionService } from '../core/services/subscription.service';
import { FavoritesService } from '../core/services/favorites.service';
import { CartApiService } from '../core/services/cart-api.service';
import { UserSummaryService, UserSummaryData } from '../core/services/user-summary.service';
import { ProfileUpdateRequest, UserProfile, ReferralsSummary, ReferralRewardCount } from '../core/models/auth.model';
import { RfpService, RfpDelivery } from '../core/services/rfp.service';
import { Order } from '../core/models/order.model';
import { Subscription } from '../core/models/subscription.model';
import { ProductVariant } from '../core/models/product.model';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap, map } from 'rxjs/operators';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, CurrencyInrPipe, ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss'],
})
export class Profile implements OnInit {
  private readonly authSvc = inject(AuthService);
  private readonly profileSvc = inject(ProfileService);
  private readonly orderSvc = inject(OrderService);
  private readonly subscriptionSvc = inject(SubscriptionService);
  private readonly favoritesSvc = inject(FavoritesService);
  private readonly cartSvc = inject(CartApiService);
  private readonly userSummarySvc = inject(UserSummaryService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly rfpSvc = inject(RfpService);

  profileData = signal<UserProfile | null>(null);
  ordersData = signal<Order[]>([]);
  subscriptionsData = signal<Subscription[]>([]);
  favoritesData = signal<ProductVariant[]>([]);
  userSummaryData = signal<UserSummaryData | null>(null);
  referralsSummary = signal<ReferralsSummary | null>(null);
  referralRewardCount = signal<ReferralRewardCount | null>(null);
  rfpDeliveries = signal<RfpDelivery[]>([]);
  activeTab = signal<string>('overview');
  loading = signal<boolean>(true);
  error = signal<string>('');
  savingProfile = signal<boolean>(false);
  savingAddress = signal<boolean>(false);
  uploadingPicture = signal<boolean>(false);
  actionMessage = signal<string>('');
  deactivateStep = signal<'idle' | 'confirm' | 'otp'>('idle');
  deactivating = signal<boolean>(false);
  deactivateError = signal<string>('');
  editAddressMode = signal<boolean>(false);
  isSidebarOpen = signal<boolean>(false);
  activeSubTab = signal<string>('ACTIVE');
  filteredSubscriptions = computed(() => {
    const all = this.subscriptionsData();
    const tab = this.activeSubTab();
    if (tab === 'ALL') return all;
    return all.filter(s => s.status === tab);
  });

  profileForm = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', Validators.required],
    last_name: [''],
    phone_number: ['', Validators.pattern('^[+]?[0-9]{10,13}$')],
    gender: [''],
  });

  addressForm = this.fb.group({
    address: ['', Validators.required],
    city: ['', Validators.required],
    state: ['', Validators.required],
    pincode: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]],
  });

  deactivateForm = this.fb.group({
    password: ['', Validators.required],
    otp: ['', [Validators.required, Validators.minLength(4)]],
  });

  readonly orderCount = computed(() => this.ordersData().length);
  readonly subscriptionCount = computed(() => this.subscriptionsData().length);
  readonly favoriteCount = computed(() => this.favoritesData().length);

  ngOnInit() {
    this.loadAccountData();
  }

  loadAccountData() {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      profile: this.profileSvc.getProfile().pipe(catchError(() => of(null))),
      orders: this.orderSvc.getOrders().pipe(catchError(() => of([]))),
      subscriptions: this.subscriptionSvc.getSubscriptions().pipe(catchError(() => of([]))),
      favorites: this.favoritesSvc.getFavorites().pipe(catchError(() => of([]))),
      userSummary: this.userSummarySvc.getSummary().pipe(catchError(() => of(null))),
      referrals: this.authSvc.getReferrals().pipe(catchError(() => of(null))),
      rewards: this.authSvc.getReferralRewardCount().pipe(catchError(() => of(null))),
    }).pipe(
      switchMap(data => {
        if (data.profile?.is_rfp) {
          return this.rfpSvc.getAllDeliveries().pipe(
            catchError(() => of([])),
            map(deliveries => ({ ...data, rfpDeliveries: deliveries }))
          );
        }
        return of({ ...data, rfpDeliveries: [] });
      }),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ profile, orders, subscriptions, favorites, userSummary, referrals, rewards, rfpDeliveries }) => {
        this.profileData.set(profile);
        if (profile) this.patchForms(profile);
        this.ordersData.set(orders);
        this.subscriptionsData.set(subscriptions);
        this.favoritesData.set(favorites as ProductVariant[]);
        this.userSummaryData.set(userSummary);
        this.rfpDeliveries.set(rfpDeliveries);

        // Populate referrals and referred_users fallbacks
        if (referrals) {
          if (referrals.referred_users && !referrals.referrals) {
            referrals.referrals = referrals.referred_users;
          } else if (referrals.referrals && !referrals.referred_users) {
            referrals.referred_users = referrals.referrals;
          }
        }
        this.referralsSummary.set(referrals);

        // Populate rewards fallbacks
        if (rewards) {
          if (rewards.total_referred_users === undefined && referrals) {
            rewards.total_referred_users = referrals.referrals_count;
          }
          if (rewards.rewards_earned === undefined) {
            rewards.rewards_earned = rewards.pending_rewards_count;
          }
        }
        this.referralRewardCount.set(rewards);

        if (!profile) this.error.set('We could not load your profile details right now.');
      }
    });
  }

  setTab(tabId: string) {
    this.activeTab.set(tabId);
    this.actionMessage.set('');
    this.error.set('');
  }

  logout() {
    this.authSvc.logout();
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.actionMessage.set('');
    this.error.set('');
    const raw = this.profileForm.getRawValue();
    const current = this.profileData() || {} as UserProfile;
    const payload: ProfileUpdateRequest = {
      username: raw.username ?? current.username ?? '',
      email: raw.email ?? current.email ?? '',
      first_name: raw.first_name ?? current.first_name ?? '',
      last_name: raw.last_name ?? current.last_name ?? '',
      phone_number: raw.phone_number ?? current.phone_number ?? '',
      gender: (raw.gender ?? current.gender ?? '') as ProfileUpdateRequest['gender'],
      address: current.address ?? '',
      city: current.city ?? '',
      state: current.state ?? '',
      pincode: current.pincode ?? '',
    };

    this.profileSvc.updateProfile(payload).pipe(
      finalize(() => this.savingProfile.set(false))
    ).subscribe({
      next: profile => {
        this.profileData.set(profile);
        this.patchForms(profile);
        this.actionMessage.set('Profile updated successfully.');
      },
      error: err => this.error.set(err.error?.message || 'Could not update profile.'),
    });
  }

  saveAddress() {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }
    this.savingAddress.set(true);
    this.actionMessage.set('');
    this.error.set('');
    const raw = this.addressForm.getRawValue();
    const current = this.profileData() || {} as UserProfile;
    const payload: ProfileUpdateRequest = {
      username: current.username ?? '',
      email: current.email ?? '',
      first_name: current.first_name ?? '',
      last_name: current.last_name ?? '',
      phone_number: current.phone_number ?? '',
      gender: current.gender as ProfileUpdateRequest['gender'],
      address: raw.address ?? current.address ?? '',
      city: raw.city ?? current.city ?? '',
      state: raw.state ?? current.state ?? '',
      pincode: raw.pincode ?? current.pincode ?? '',
    };

    this.profileSvc.updateProfile(payload).pipe(
      finalize(() => this.savingAddress.set(false))
    ).subscribe({
      next: profile => {
        this.profileData.set(profile);
        this.patchForms(profile);
        this.actionMessage.set('Address saved successfully.');
      },
      error: err => this.error.set(err.error?.message || 'Could not save address.'),
    });
  }

  onProfilePictureChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.uploadingPicture.set(true);
    this.actionMessage.set('');
    this.authSvc.uploadProfilePicture(file).pipe(
      finalize(() => this.uploadingPicture.set(false))
    ).subscribe({
      next: () => {
        this.actionMessage.set('Profile picture updated.');
        // Refresh profile to get new picture URL
        this.profileSvc.getProfile().subscribe({
          next: profile => {
            this.profileData.set(profile);
          }
        });
      },
      error: () => this.error.set('Could not upload profile picture.'),
    });
  }

  addFavoriteToCart(variant: ProductVariant) {
    this.cartSvc.addItem(variant.id, 1).subscribe({
      next: () => this.actionMessage.set('Added to cart.'),
      error: err => this.error.set(err.error?.message || 'Could not add to cart.'),
    });
  }

  removeFavorite(variant: ProductVariant) {
    this.favoritesSvc.toggleFavorite(variant.id).subscribe({
      next: () => {
        this.favoritesData.set(this.favoritesData().filter(f => f.id !== variant.id));
        this.actionMessage.set('Removed from favorites.');
      },
      error: () => undefined
    });
  }

  cancelOrder(orderId: number) {
    this.orderSvc.cancelOrder(orderId).subscribe({
      next: () => {
        this.actionMessage.set('Cancellation request submitted.');
        this.loadAccountData();
      },
      error: err => this.error.set(err.error?.message || 'Could not cancel order.'),
    });
  }

  downloadInvoice(orderNumber: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    this.orderSvc.getInvoice(orderNumber).subscribe({
      next: (res) => {
        if (res?.invoice?.s3_url) {
          window.open(res.invoice.s3_url, '_blank');
        }
      },
      error: () => this.error.set('Could not download invoice.'),
    });
  }

  initiateDeactivate() { this.deactivateStep.set('confirm'); }
  cancelDeactivate() { this.deactivateStep.set('idle'); this.deactivateForm.reset(); this.deactivateError.set(''); }

  confirmDeactivate() {
    const pw = this.deactivateForm.get('password')?.value;
    if (!pw) { this.deactivateError.set('Please enter your password.'); return; }
    this.deactivating.set(true);
    this.authSvc.deactivate(pw).pipe(
      finalize(() => this.deactivating.set(false))
    ).subscribe({
      next: () => this.deactivateStep.set('otp'),
      error: err => this.deactivateError.set(err.error?.message || 'Incorrect password.'),
    });
  }

  submitDeactivateOtp() {
    const otp = this.deactivateForm.get('otp')?.value;
    if (!otp) { this.deactivateError.set('Please enter the OTP.'); return; }
    this.deactivating.set(true);
    this.authSvc.deactivateConfirm(otp).pipe(
      finalize(() => this.deactivating.set(false))
    ).subscribe({
      next: () => {
        this.authSvc.logout();
      },
      error: err => this.deactivateError.set(err.error?.message || 'Invalid OTP.'),
    });
  }

  shopProducts() { this.router.navigate(['/products']); }
  browseSubscriptions() { this.router.navigate(['/registry']); }

  getInitials(): string {
    const p = this.profileData();
    if (!p) return 'U';
    const first = p.first_name ? p.first_name[0] : '';
    const last = p.last_name ? p.last_name[0] : '';
    return (first + last).toUpperCase() || p.username?.[0]?.toUpperCase() || 'U';
  }

  getProfileAddress(): string[] {
    const p = this.profileData();
    return [p?.address, p?.city, p?.state, p?.pincode].filter(Boolean) as string[];
  }

  parseOrderDate(dateStr: string | undefined | null): any {
    if (!dateStr) return '';
    // If it's already ISO format or standard date format
    if (dateStr.includes('T') || dateStr.includes('/') || !isNaN(Date.parse(dateStr))) {
      return dateStr;
    }
    // If it's in DD-MM-YYYY format
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
    if (match) {
      const [_, day, month, year, hour = '00', minute = '00'] = match;
      // Convert to standard YYYY-MM-DDTHH:mm:00
      return `${year}-${month}-${day}T${hour}:${minute}:00`;
    }
    return dateStr;
  }

  getOrderTotal(order: Order): string {
    return order.total ?? order.total_price ?? '0.00';
  }

  getOrderStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return 'status-delivered';
      case 'SHIPPED': return 'status-shipped';
      case 'CANCELLED': return 'status-cancelled';
      case 'PENDING': return 'status-pending';
      default: return 'status-processing';
    }
  }

  getOrderItemName(item: any): string {
    return item.product_name ?? item.product_details?.product_name ?? item.product_variant?.product_name ?? 'Product';
  }

  getReferralStatusClass(status: string | undefined): string {
    const s = status?.toUpperCase();
    if (s === 'QUALIFIED' || s === 'REWARD_AVAILABLE' || s === 'REWARD_REDEEMED') {
      return 'status-delivered';
    } else if (s === 'DISQUALIFIED') {
      return 'status-cancelled';
    } else {
      return 'status-pending';
    }
  }

  getSubscriptionPlanName(subscription: Subscription): string {
    return subscription.plan_name
      ?? (typeof subscription.plan === 'object' ? (subscription.plan as any)?.name : `Plan #${subscription.plan}`)
      ?? 'Subscription';
  }

  getFavoriteImage(variant: ProductVariant): string {
    return variant.images?.[0]?.image ?? variant.product_images?.[0]?.image ?? '';
  }

  getFavoritePrice(variant: ProductVariant): string {
    return variant.final_price ?? variant.price ?? '0.00';
  }

  private patchForms(profile: UserProfile) {
    this.profileForm.patchValue({
      username: profile.username ?? '',
      email: profile.email ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone_number: profile.phone_number ?? '',
      gender: profile.gender ?? '',
    });
    this.addressForm.patchValue({
      address: profile.address ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      pincode: profile.pincode ?? '',
    });
  }
}

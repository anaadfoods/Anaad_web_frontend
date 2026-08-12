import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { cartNotEmptyGuard } from './core/guards/cart-not-empty.guard';
import { HomeComponent } from './home/home.component';
import { AppleCallbackComponent } from './auth/apple-callback/apple-callback.component';
import { legacyRedirectGuard } from './core/guards/legacy-redirect.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home • Anaad Foods' },

  // Traceability journey preview
  {
    path: 'traceability-journey/:crop_id',
    loadComponent: () =>
      import('./traceability-journey/traceability-journey.component').then(
        m => m.TraceabilityJourneyComponent
      ),
    title: 'From Soil to Soul • Anaad Foods'
  },
  {
    path: 'traceability-journey',
    loadComponent: () =>
      import('./traceability-journey/traceability-journey.component').then(
        m => m.TraceabilityJourneyComponent
      ),
    title: 'From Soil to Soul • Anaad Foods'
  },

  // Auth
  { path: 'auth/apple/callback', component: AppleCallbackComponent },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login').then(m => m.Login),
    canActivate: [guestGuard],
    title: 'Sign In • Anaad Foods'
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/register/register').then(m => m.Register),
    canActivate: [guestGuard],
    title: 'Create Account • Anaad Foods'
  },

  // Products / Pantry
  {
    path: 'products',
    loadComponent: () => import('./products/product-list/product-list').then(m => m.ProductList),
    title: 'Heirloom Pantry • Anaad Foods'
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./products/product-detail/product-detail').then(m => m.ProductDetail),
    title: 'Product • Anaad Foods'
  },

  // RFP & Panchang
  {
    path: 'rfp',
    loadComponent: () => import('./rfp/rfp').then(m => m.Rfp),
    canActivate: [authGuard],
    title: 'Contract Farming RFP • Anaad Foods'
  },
  {
    path: 'panchang',
    loadComponent: () => import('./panchang/panchang').then(m => m.Panchang),
    title: 'Vedic Panchang Calendar • Anaad Foods'
  },
  {
    path: 'aahar-vigyan',
    loadComponent: () => import('./aahar-vigyan/aahar-vigyan.component').then(m => m.AaharVigyanComponent),
    canActivate: [authGuard],
    title: 'Aahar Vigyan • Anaad Foods'
  },
  {
    path: 'wholesale',
    redirectTo: 'rfp',
    pathMatch: 'full'
  },

  // Cart & Checkout
  {
    path: 'cart',
    loadComponent: () => import('./cart/cart').then(m => m.Cart),
    title: 'Cart • Anaad Foods'
  },
  {
    path: 'checkout',
    loadComponent: () => import('./checkout/checkout').then(m => m.Checkout),
    canActivate: [authGuard, cartNotEmptyGuard],
    title: 'Checkout • Anaad Foods'
  },

  // Account (protected)
  {
    path: 'profile',
    loadComponent: () => import('./profile/profile').then(m => m.Profile),
    canActivate: [authGuard],
    title: 'My Account • Anaad Foods'
  },
  {
    path: 'refer-earn',
    loadComponent: () =>
      import('./refer-earn/refer-earn.component').then(m => m.ReferEarnComponent),
    canActivate: [authGuard],
    title: 'Refer & Earn • Anaad Foods'
  },
  {
    path: 'referral',
    redirectTo: 'refer-earn',
    pathMatch: 'full'
  },
  {
    path: 'refer',
    redirectTo: 'refer-earn',
    pathMatch: 'full'
  },
  {
    path: 'order/:id',
    loadComponent: () =>
      import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent),
    canActivate: [authGuard],
    title: 'Order Details • Anaad Foods'
  },
  {
    path: 'subscription/:id',
    loadComponent: () =>
      import('./subscriptions/subscription-detail/subscription-detail.component').then(
        m => m.SubscriptionDetailComponent
      ),
    canActivate: [authGuard],
    title: 'Subscription Details • Anaad Foods'
  },

  // Static pages
  {
    path: 'our-soil',
    loadComponent: () => import('./soil/soil').then(m => m.Soil),
    title: 'Our Soil • Anaad Foods'
  },
  {
    path: 'registry',
    loadComponent: () => import('./registry/registry').then(m => m.Registry),
    title: 'The Registry • Anaad Foods'
  },
  {
    path: 'commitment',
    loadComponent: () => import('./commitment/commitment').then(m => m.Commitment),
    title: 'The Commitment • Anaad Foods'
  },
  {
    path: 'ledger',
    loadComponent: () =>
      import('./evidence-archive/evidence-archive.component').then(m => m.EvidenceArchiveComponent),
    title: 'Open Lab Ledger • Anaad Foods'
  },

  // Thank You
  {
    path: 'thank-you',
    loadComponent: () => import('./thank-you/thank-you.component').then(m => m.ThankYouComponent),
    title: 'Order Confirmed • Anaad Foods'
  },

  // Payment Gateway Return Handlers
  {
    path: 'payment-success',
    loadComponent: () => import('./payment-success/payment-success').then(m => m.PaymentSuccess),
    title: 'Processing Payment • Anaad Foods'
  },
  {
    path: 'payment-failure',
    loadComponent: () => import('./payment-failure/payment-failure').then(m => m.PaymentFailure),
    title: 'Payment Cancelled • Anaad Foods'
  },

  // Marketing, content, and legacy aliases
  {
    path: 'offerings',
    loadComponent: () => import('./offerings/offerings.component').then(m => m.OfferingsComponent),
    title: 'Offerings • Anaad Foods'
  },
  {
    path: 'our-story',
    loadComponent: () => import('./our-story/our-story.component').then(m => m.OurStoryComponent),
    title: 'Our Story • Anaad Foods'
  },
  {
    path: 'about-us',
    loadComponent: () => import('./our-story/our-story.component').then(m => m.OurStoryComponent),
    title: 'About Us • Anaad Foods'
  },
  {
    path: 'contact',
    loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent),
    title: 'Contact • Anaad Foods'
  },
  {
    path: 'help',
    loadComponent: () => import('./help/help.component').then(m => m.HelpComponent),
    title: 'Help & Support • Anaad Foods'
  },
  {
    path: 'blog',
    loadComponent: () => import('./blogs/blogs.component').then(m => m.BlogsComponent),
    title: 'Journal • Anaad Foods'
  },
  {
    path: 'blog/:id',
    loadComponent: () => import('./blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
    title: 'Journal • Anaad Foods'
  },
  {
    path: 'blogs',
    loadComponent: () => import('./blogs/blogs.component').then(m => m.BlogsComponent),
    title: 'Journal • Anaad Foods'
  },
  {
    path: 'blogs/:id',
    loadComponent: () => import('./blog-detail/blog-detail.component').then(m => m.BlogDetailComponent),
    title: 'Journal • Anaad Foods'
  },
  {
    path: 'join-waitlist',
    loadComponent: () =>
      import('./join-waitlist/join-waitlist.component').then(m => m.JoinWaitlistComponent),
    title: 'Join Waitlist • Anaad Foods'
  },
  {
    path: 'communities',
    loadComponent: () => import('./communities/communities.component').then(m => m.CommunitiesComponent),
    title: 'Communities • Anaad Foods'
  },

  // Flutter app sync / fallbacks
  {
    path: 'contract-farming',
    loadComponent: () => import('./rfp/rfp').then(m => m.Rfp),
    canActivate: [authGuard],
    title: 'Contract Farming RFP • Anaad Foods'
  },
  {
    path: 'legal',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Legal • Anaad Foods'
  },
  {
    path: 'delivery',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Delivery • Anaad Foods'
  },

  // Legal
  {
    path: 'terms-conditions',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Terms & Conditions • Anaad Foods'
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Terms & Conditions • Anaad Foods'
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
    title: 'Privacy Policy • Anaad Foods'
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent),
    title: 'Privacy Policy • Anaad Foods'
  },
  {
    path: 'refund-policy',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Refund Policy • Anaad Foods'
  },
  {
    path: 'shipping-policy',
    loadComponent: () =>
      import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent),
    title: 'Shipping Policy • Anaad Foods'
  },
  {
    path: 'delete-account',
    loadComponent: () =>
      import('./delete-account/delete-account.component').then(m => m.DeleteAccountComponent),
    canActivate: [authGuard],
    title: 'Delete Account • Anaad Foods'
  },

  {
    path: '**',
    canActivate: [legacyRedirectGuard],
    loadComponent: () => import('./error-page/error-page').then(m => m.ErrorPageComponent),
    title: '404 Page Not Found • Anaad Foods'
  },
];

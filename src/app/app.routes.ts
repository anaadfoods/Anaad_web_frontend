import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { cartNotEmptyGuard } from './core/guards/cart-not-empty.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home • Anaad Foods' },

  // Auth
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login), canActivate: [guestGuard], title: 'Sign In • Anaad Foods' },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register), canActivate: [guestGuard], title: 'Create Account • Anaad Foods' },

  // Products / Pantry
  { path: 'products', loadComponent: () => import('./products/product-list/product-list').then(m => m.ProductList), title: 'Heirloom Pantry • Anaad Foods' },
  { path: 'products/:id', loadComponent: () => import('./products/product-detail/product-detail').then(m => m.ProductDetail), title: 'Product • Anaad Foods' },

  // RFP & Panchang
  { path: 'rfp', loadComponent: () => import('./rfp/rfp').then(m => m.Rfp), canActivate: [authGuard], title: 'Contract Farming RFP • Anaad Foods' },
  { path: 'panchang', loadComponent: () => import('./panchang/panchang').then(m => m.Panchang), title: 'Vedic Panchang Calendar • Anaad Foods' },
  { path: 'wholesale', redirectTo: 'rfp', pathMatch: 'full' },

  // Cart & Checkout
  { path: 'cart', loadComponent: () => import('./cart/cart').then(m => m.Cart), title: 'Cart • Anaad Foods' },
  { path: 'checkout', loadComponent: () => import('./checkout/checkout').then(m => m.Checkout), canActivate: [authGuard, cartNotEmptyGuard], title: 'Checkout • Anaad Foods' },

  // Account (protected)
  { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.Profile), canActivate: [authGuard], title: 'My Account • Anaad Foods' },
  { path: 'orders/:id', loadComponent: () => import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent), canActivate: [authGuard], title: 'Order Details • Anaad Foods' },
  { path: 'subscriptions/:id', loadComponent: () => import('./subscriptions/subscription-detail/subscription-detail.component').then(m => m.SubscriptionDetailComponent), canActivate: [authGuard], title: 'Subscription Details • Anaad Foods' },

  // Static pages
  { path: 'our-soil', loadComponent: () => import('./soil/soil').then(m => m.Soil), title: 'Our Soil • Anaad Foods' },
  { path: 'registry', loadComponent: () => import('./registry/registry').then(m => m.Registry), title: 'The Registry • Anaad Foods' },
  { path: 'commitment', loadComponent: () => import('./commitment/commitment').then(m => m.Commitment), title: 'The Commitment • Anaad Foods' },
  { path: 'ledger', loadComponent: () => import('./evidence-archive/evidence-archive.component').then(m => m.EvidenceArchiveComponent), title: 'Open Lab Ledger • Anaad Foods' },

  // Thank You (COD order confirmation)
  { path: 'thank-you', loadComponent: () => import('./thank-you/thank-you.component').then(m => m.ThankYouComponent), title: 'Order Confirmed • Anaad Foods' },

  // Payment Gateway Return Handlers
  // Juspay redirects to /api/payments/success → Django → Angular /payment-success
  { path: 'payment-success', loadComponent: () => import('./payment-success/payment-success').then(m => m.PaymentSuccess), title: 'Processing Payment • Anaad Foods' },
  // Juspay failure/cancellation redirect
  { path: 'payment-failure', loadComponent: () => import('./payment-failure/payment-failure').then(m => m.PaymentFailure), title: 'Payment Cancelled • Anaad Foods' },
  // Legacy aliases matching Flutter's intercepted URL patterns
  { path: 'api/payments/success', redirectTo: 'payment-success', pathMatch: 'full' },
  { path: 'api/payment/success', redirectTo: 'payment-success', pathMatch: 'full' },
  { path: 'api/payments/failure', redirectTo: 'payment-failure', pathMatch: 'full' },
  { path: 'api/payment/failure', redirectTo: 'payment-failure', pathMatch: 'full' },

  // Redirects
  { path: 'shop', redirectTo: 'products', pathMatch: 'full' },
  { path: 'offerings', loadComponent: () => import('./offerings/offerings.component').then(m => m.OfferingsComponent), title: 'Offerings • Anaad Foods' },
  { path: 'our-story', loadComponent: () => import('./our-story/our-story.component').then(m => m.OurStoryComponent), title: 'Our Story • Anaad Foods' },
  { path: 'about', redirectTo: 'our-soil', pathMatch: 'full' },
  { path: 'contact', loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent), title: 'Contact • Anaad Foods' },
  { path: 'help', loadComponent: () => import('./help/help.component').then(m => m.HelpComponent), title: 'Help & Support • Anaad Foods' },
  { path: 'blogs', loadComponent: () => import('./blogs/blogs.component').then(m => m.BlogsComponent), title: 'Journal • Anaad Foods' },
  { path: 'blogs/:id', loadComponent: () => import('./blog-detail/blog-detail.component').then(m => m.BlogDetailComponent), title: 'Journal • Anaad Foods' },
  { path: 'evidence', redirectTo: 'ledger', pathMatch: 'full' },
  { path: 'join-waitlist', loadComponent: () => import('./join-waitlist/join-waitlist.component').then(m => m.JoinWaitlistComponent), title: 'Join Waitlist • Anaad Foods' },
  { path: 'communities', loadComponent: () => import('./communities/communities.component').then(m => m.CommunitiesComponent), title: 'Communities • Anaad Foods' },

  // Legal
  { path: 'terms-conditions', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Terms & Conditions • Anaad Foods' },
  { path: 'terms', redirectTo: 'terms-conditions', pathMatch: 'full' },
  { path: 'privacy-policy', loadComponent: () => import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent), title: 'Privacy Policy • Anaad Foods' },
  { path: 'refund-policy', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Refund Policy • Anaad Foods' },
  { path: 'shipping-policy', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Shipping Policy • Anaad Foods' },
  { path: 'delete-account', loadComponent: () => import('./delete-account/delete-account.component').then(m => m.DeleteAccountComponent), title: 'Delete Account • Anaad Foods' },

  { path: '**', loadComponent: () => import('./error-page/error-page').then(m => m.ErrorPageComponent), title: '404 Page Not Found • Anaad Foods' },
];

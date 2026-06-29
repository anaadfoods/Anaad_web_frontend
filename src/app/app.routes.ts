import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { cartNotEmptyGuard } from './core/guards/cart-not-empty.guard';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home â€¢ Anaad Foods' },

  // Traceability journey preview (isolated - safe to delete)
  { path: 'traceability-journey', loadComponent: () => import('./traceability-journey/traceability-journey.component').then(m => m.TraceabilityJourneyComponent), title: 'From Soil to Soul • Anaad Foods' },
  { path: 'traceability', redirectTo: 'traceability-journey', pathMatch: 'full' },
  { path: 'tracebility', redirectTo: 'traceability-journey', pathMatch: 'full' },
  { path: 'tracibility', redirectTo: 'traceability-journey', pathMatch: 'full' },

  // Auth
  { path: 'login', loadComponent: () => import('./auth/login/login').then(m => m.Login), canActivate: [guestGuard], title: 'Sign In â€¢ Anaad Foods' },
  { path: 'register', loadComponent: () => import('./auth/register/register').then(m => m.Register), canActivate: [guestGuard], title: 'Create Account â€¢ Anaad Foods' },

  // Products / Pantry
  { path: 'products', loadComponent: () => import('./products/product-list/product-list').then(m => m.ProductList), title: 'Heirloom Pantry â€¢ Anaad Foods' },
  { path: 'products/:id', loadComponent: () => import('./products/product-detail/product-detail').then(m => m.ProductDetail), title: 'Product â€¢ Anaad Foods' },

  // RFP & Panchang
  { path: 'rfp', loadComponent: () => import('./rfp/rfp').then(m => m.Rfp), canActivate: [authGuard], title: 'Contract Farming RFP â€¢ Anaad Foods' },
  { path: 'panchang', loadComponent: () => import('./panchang/panchang').then(m => m.Panchang), title: 'Vedic Panchang Calendar â€¢ Anaad Foods' },
  { path: 'aahar-vigyan', loadComponent: () => import('./aahar-vigyan/aahar-vigyan.component').then(m => m.AaharVigyanComponent), canActivate: [authGuard], title: 'Aahar Vigyan • Anaad Foods' },
  { path: 'wholesale', redirectTo: 'rfp', pathMatch: 'full' },

  // Cart & Checkout
  { path: 'cart', loadComponent: () => import('./cart/cart').then(m => m.Cart), title: 'Cart â€¢ Anaad Foods' },
  { path: 'checkout', loadComponent: () => import('./checkout/checkout').then(m => m.Checkout), canActivate: [authGuard, cartNotEmptyGuard], title: 'Checkout â€¢ Anaad Foods' },

  // Account (protected)
  { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.Profile), canActivate: [authGuard], title: 'My Account â€¢ Anaad Foods' },
  { path: 'orders/:id', loadComponent: () => import('./orders/order-detail/order-detail.component').then(m => m.OrderDetailComponent), canActivate: [authGuard], title: 'Order Details â€¢ Anaad Foods' },
  { path: 'subscriptions/:id', loadComponent: () => import('./subscriptions/subscription-detail/subscription-detail.component').then(m => m.SubscriptionDetailComponent), canActivate: [authGuard], title: 'Subscription Details â€¢ Anaad Foods' },

  // Static pages
  { path: 'our-soil', loadComponent: () => import('./soil/soil').then(m => m.Soil), title: 'Our Soil â€¢ Anaad Foods' },
  { path: 'registry', loadComponent: () => import('./registry/registry').then(m => m.Registry), title: 'The Registry â€¢ Anaad Foods' },
  { path: 'commitment', loadComponent: () => import('./commitment/commitment').then(m => m.Commitment), title: 'The Commitment â€¢ Anaad Foods' },
  { path: 'ledger', loadComponent: () => import('./evidence-archive/evidence-archive.component').then(m => m.EvidenceArchiveComponent), title: 'Open Lab Ledger â€¢ Anaad Foods' },

  // Thank You (COD order confirmation)
  { path: 'thank-you', loadComponent: () => import('./thank-you/thank-you.component').then(m => m.ThankYouComponent), title: 'Order Confirmed â€¢ Anaad Foods' },

  // Payment Gateway Return Handlers
  // Juspay redirects to /api/payments/success â†’ Django â†’ Angular /payment-success
  { path: 'payment-success', loadComponent: () => import('./payment-success/payment-success').then(m => m.PaymentSuccess), title: 'Processing Payment â€¢ Anaad Foods' },
  // Juspay failure/cancellation redirect
  { path: 'payment-failure', loadComponent: () => import('./payment-failure/payment-failure').then(m => m.PaymentFailure), title: 'Payment Cancelled â€¢ Anaad Foods' },
  // Legacy aliases matching Flutter's intercepted URL patterns
  { path: 'api/payments/success', redirectTo: 'payment-success', pathMatch: 'full' },
  { path: 'api/payment/success', redirectTo: 'payment-success', pathMatch: 'full' },
  { path: 'api/payments/failure', redirectTo: 'payment-failure', pathMatch: 'full' },
  { path: 'api/payment/failure', redirectTo: 'payment-failure', pathMatch: 'full' },

  // Redirects
  { path: 'shop', redirectTo: 'products', pathMatch: 'full' },
  { path: 'offerings', loadComponent: () => import('./offerings/offerings.component').then(m => m.OfferingsComponent), title: 'Offerings â€¢ Anaad Foods' },
  { path: 'our-story', loadComponent: () => import('./our-story/our-story.component').then(m => m.OurStoryComponent), title: 'Our Story â€¢ Anaad Foods' },
  { path: 'about', redirectTo: 'our-soil', pathMatch: 'full' },
  { path: 'contact', loadComponent: () => import('./contact/contact.component').then(m => m.ContactComponent), title: 'Contact â€¢ Anaad Foods' },
  { path: 'help', loadComponent: () => import('./help/help.component').then(m => m.HelpComponent), title: 'Help & Support â€¢ Anaad Foods' },
  { path: 'blogs', loadComponent: () => import('./blogs/blogs.component').then(m => m.BlogsComponent), title: 'Journal â€¢ Anaad Foods' },
  { path: 'blogs/:id', loadComponent: () => import('./blog-detail/blog-detail.component').then(m => m.BlogDetailComponent), title: 'Journal â€¢ Anaad Foods' },
  { path: 'evidence', redirectTo: 'ledger', pathMatch: 'full' },
  { path: 'join-waitlist', loadComponent: () => import('./join-waitlist/join-waitlist.component').then(m => m.JoinWaitlistComponent), title: 'Join Waitlist â€¢ Anaad Foods' },
  { path: 'communities', loadComponent: () => import('./communities/communities.component').then(m => m.CommunitiesComponent), title: 'Communities â€¢ Anaad Foods' },

  // Legal
  { path: 'terms-conditions', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Terms & Conditions â€¢ Anaad Foods' },
  { path: 'terms', redirectTo: 'terms-conditions', pathMatch: 'full' },
  { path: 'privacy-policy', loadComponent: () => import('./privacy-policy/privacy-policy.component').then(m => m.PrivacyPolicyComponent), title: 'Privacy Policy â€¢ Anaad Foods' },
  { path: 'refund-policy', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Refund Policy â€¢ Anaad Foods' },
  { path: 'shipping-policy', loadComponent: () => import('./terms-conditions/terms-conditions.component').then(m => m.TermsConditionsComponent), title: 'Shipping Policy â€¢ Anaad Foods' },
  { path: 'delete-account', loadComponent: () => import('./delete-account/delete-account.component').then(m => m.DeleteAccountComponent), canActivate: [authGuard], title: 'Delete Account • Anaad Foods' },

  { path: '**', loadComponent: () => import('./error-page/error-page').then(m => m.ErrorPageComponent), title: '404 Page Not Found â€¢ Anaad Foods' },
];

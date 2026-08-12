// ============================================
// Centralized API Endpoint Constants
// All backend routes in one place
// ============================================

export const API = {
  AUTH: {
    REGISTER: '/api/auth/register/',
    LOGIN: '/api/auth/token/',
    REFRESH: '/api/auth/token/refresh/',
    GOOGLE: '/api/auth/google/',
    APPLE: '/api/auth/apple/callback/',
    APPLE_LOGIN: '/api/auth/apple/',
    SEND_OTP: '/api/auth/send-otp/',
    VERIFY_OTP: '/api/auth/verify-otp/',
    TEST_TOKEN: '/api/auth/test-token/',
    PROFILE: '/api/auth/profile/',
    DEACTIVATE: '/api/auth/deactivate/',
    DEACTIVATE_CONFIRM: '/api/auth/deactivate_confirm/',
    FAVORITES: '/api/auth/favorites/',
    REFERRAL_REWARD_COUNT: '/api/auth/referral_reward_count/',
    REFERRALS: '/api/auth/referrals/',
  },

  PRODUCTS: {
    VARIANTS: '/api/products/variants/',
    CATEGORIES: '/api/products/categories/',
    FEATURED: '/api/products/featured/',
    BESTSELLERS: '/api/products/bestsellers/',
    SEARCH: '/api/products/variants/search/',
  },

  CART: {
    DETAILS: '/api/cart/details/',
    ADD: '/api/cart/items/add/',
    UPDATE: '/api/cart/items/update/',
    REMOVE: '/api/cart/items/remove/',
    CLEAR: '/api/cart/clear/',
  },

  ORDERS: {
    LIST: '/api/orders/',
    CREATE: '/api/orders/create/',
    DETAIL: '/api/orders/',        // append {id}/
    SHIPPING: '/api/user/details/',
    TRACKING: '/api/shiprocket/orders/tracking_by_order/',
    PAYMENT_STATUS: '/api/payments/status/',
    INVOICE: '/api/invoicing/orders/',  // append {orderNumber}/invoice/
  },

  SUBSCRIPTIONS: {
    PLANS: '/api/subscriptions/plans/',
    PLAN_PRODUCTS: '/api/subscriptions/plans/', // append {planId}/products
    PLAN_SEARCH: '/api/subscriptions/plans/search/',
    LIST: '/api/subscriptions/',
    CREATE: '/api/subscriptions/create/',
    DETAIL: '/api/subscriptions/',             // append {id}/
    NEXT_INSTALLMENT_PAYMENT: '/api/subscriptions/', // append {id}/next-installment-payment/
    PAYMENT_STATUS: '/api/payments/status/',
    INVOICES: '/api/invoicing/subscriptions/',      // append {id}/invoices/
  },

  CORE: {
    BANNERS: '/api/core/banners/',
    LEGAL: '/api/core/legal/latest/',
    STATES: '/api/core/states/',
    CITIES: '/api/core/cities/',
    USER_SUMMARY: '/api/core/user-summary/',
    DELIVERY_CHARGES: '/api/core/delivery/calculate-charges/',
  },

  BLOGS: {
    LIST: '/api/blog/articles/',
    DETAIL: '/api/blog/articles/',
    FILTER: '/api/blog/articles/filter/',
    TAGS: '/api/blog/tags/',
  },

  RESEARCH_PAPERS: {
    LIST: '/api/blog/research-papers/',
    DETAIL: '/api/blog/research-papers/',
  },

  USER_QUERIES: {
    SUBMIT: '/api/user-queries/',
  },

  PLANS: {
    LIST: '/api/plans/',
    DETAIL: '/api/plans/',
  },

  PANCHANG: {
    DAY: '/api/panchang-calender/day/',
    MONTH: '/api/panchang-calender/month/',
    HIGHLIGHTS: '/api/panchang-calender/highlights/',
    FESTIVALS: '/api/panchang-calender/festivals/',
    FESTIVAL_SEARCH: '/api/panchang-calender/festivals/search/',
    MUHURATS: '/api/panchang-calender/muhurats/',
    VRAT_CALENDAR: '/api/panchang-calender/vrat-calendar/',
    GUIDANCE_TODAY: '/api/panchang-calender/guidance/today/',
    GUIDANCE_PROFILE: '/api/panchang-calender/guidance/profile/',
  },

  RFP: {
    PLANS: '/api/rfp/plans/',
    DELIVERIES: '/api/rfp/plans/',
  },

  NOTIFICATIONS: {
    REGISTER_TOKEN: '/api/notifications/register-token/',
    LOGOUT_DEVICE: '/api/notifications/logout-device/',
    REGISTER_LOCAL: '/api/notifications/register-local/',
    READ: '/api/notifications/read/',
    DISMISS: '/api/notifications/dismiss/',
    SYNC: '/api/notifications/sync/',
    UNREAD_COUNT: '/api/notifications/unread-count/',
  },

  PAYMENTS: {
    STATUS: '/api/payments/status/',                        // append {orderId}/ or {subscriptionNumber}/
    SUBSCRIPTION_STATUS: '/api/payments/status/', // append {subId}/
  },

  TRACEABILITY: {
    TRACE: 'https://nwmimvqcoxxdulpmdqvp.supabase.co/functions/v1/trace',
  },

  CROP_DELIVERY: {
    CROP_ORDERS: '/api/core/crop-cycle-orders/',
    TRACKING_BY_ORDER: '/api/shiprocket/orders/tracking_by_order/',
    TRACKING_BY_SUBSCRIPTION: '/api/shiprocket/orders/tracking_by_subscription/',
  },
} as const;

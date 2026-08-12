// ============================================
// Auth Models
// Mapped from: /api/auth/* endpoints
// ============================================

/** POST /api/auth/register/ */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'M' | 'F' | 'O' | '';
  address?: string;
  pincode?: string;
  city?: string;
  state?: string;
  referral_code?: string;
}

/** POST /api/auth/token/ */
export interface LoginRequest {
  email: string;
  password: string;
}

/** Response from /api/auth/token/ */
export interface LoginResponse {
  access: string;
  refresh: string;
  user?: UserProfile;
}

/** POST /api/auth/token/refresh/ */
export interface TokenRefreshRequest {
  refresh: string;
}

/** Response from /api/auth/token/refresh/ */
export interface TokenRefreshResponse {
  access: string;
  refresh?: string;  // Backend rotates refresh tokens — must store the new one
}

/** POST /api/auth/google/ */
export interface GoogleLoginRequest {
  id_token: string;
}

/** POST /api/auth/apple/ */
export interface AppleLoginRequest {
  id_token: string;
  name?: string;
}

/** POST /api/auth/send-otp/ */
export interface OtpSendRequest {
  identifier: string;
  type: 'email' | 'phone';
}

/** POST /api/auth/verify-otp/ */
export interface OtpVerifyRequest {
  identifier: string;
  otp: string;
  type: 'email' | 'phone';
}

/** POST /api/auth/deactivate/ */
export interface DeactivateRequest {
  password: string;
}

/** POST /api/auth/deactivate_confirm/ */
export interface DeactivateConfirmRequest {
  otp: string;
}

/** GET /api/auth/profile/ & PATCH /api/auth/profile/ */
export interface UserProfile {
  id?: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  gender: 'Male' | 'Female' | 'Other' | 'M' | 'F' | 'O' | '';
  address: string | null;
  pincode: string | null;
  city: string | null;
  state: string | null;
  profile_picture: string | null;
  referral_code: string | null;
  is_email_verified: boolean;
  is_rfp: boolean;
  date_joined?: string;
}

/** PATCH /api/auth/profile/ — partial update */
export type ProfileUpdateRequest = Partial<
  Pick<
    UserProfile,
    | 'username'
    | 'email'
    | 'first_name'
    | 'last_name'
    | 'phone_number'
    | 'gender'
    | 'address'
    | 'pincode'
    | 'city'
    | 'state'
  >
>;

/** GET /api/auth/referrals/ */
export interface Referral {
  id?: number;
  email?: string;
  username?: string;
  referred_user_username?: string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
  created_at?: string;
  status?: string;
  status_display?: string;
  reward_issued?: boolean;
  reward_you_get?: string;
}

export interface ReferralsSummary {
  referral_code: string | null;
  referrals_count: number;
  ordered_count?: number;
  pending_count?: number;
  pending_reward_count?: number;
  referred_by: string | null;
  rewards_info?: {
    you_get: string;
    they_get: string;
  };
  referred_users?: Referral[];
  referrals?: Referral[];
}

/** GET /api/auth/referral_reward_count/ */
export interface ReferralRewardCount {
  pending_rewards_count: number;
  total_referred_users?: number;
  rewards_earned?: number;
}

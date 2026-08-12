export interface ReferralUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  status: string | null;
  status_display?: string;
  reward_you_get?: string;
}

export interface ReferralsResponse {
  data: {
    referral_code: string;
    referrals_count: number;
    ordered_count: number;
    pending_count: number;
    pending_reward_count: number;
    referred_by: string | null;
    rewards_info?: {
      you_get: string;
      they_get: string;
    };
    referred_users: ReferralUser[];
  };
}

export interface ReferralRewardCount {
  pending_rewards_count: number;
}

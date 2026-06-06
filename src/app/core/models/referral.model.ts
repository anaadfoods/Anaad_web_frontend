export interface ReferralUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  status: string | null;
}

export interface ReferralsResponse {
  data: {
    referral_code: string;
    referrals_count: number;
    referred_by: string | null;
    referred_users: ReferralUser[];
  };
}

export interface ReferralRewardCount {
  pending_rewards_count: number;
}

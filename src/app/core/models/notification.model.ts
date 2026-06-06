export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  channel?: 'push' | 'email' | 'sms' | 'whatsapp';
  status?: 'pending' | 'sent' | 'failed' | 'cancelled';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  sent?: boolean;
  scheduled_time?: string;
  created_at: string;
  metadata?: any;
  source?: 'SERVER' | 'LOCAL_DEVICE_APP';
  origin_device_id?: string;
  is_read: boolean;
  is_dismissed: boolean;
  sync_version: number;
}

export interface NotificationSyncResponse {
  notifications: NotificationItem[];
  latest_version: number;
}

export interface UnreadCountResponse {
  unread_count: number;
}

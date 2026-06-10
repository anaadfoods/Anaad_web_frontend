export interface UserQueryRequest {
  name: string;
  phone_number: string;
  email?: string;
  message: string;
  requirement_type: 'INDIVIDUAL' | 'B2B' | 'FAMILY' | 'BUSINESS' | string;
  is_from_rfp: boolean;
  is_rfp?: boolean;
  redirection_from: 'USER_QUERY' | 'RFP';
}

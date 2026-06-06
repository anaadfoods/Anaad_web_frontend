export interface UserQueryRequest {
  name: string;
  phone_number: string;
  email?: string;
  message: string;
  requirement_type: 'INDIVIDUAL' | 'B2B' | 'FAMILY';
  is_from_rfp: boolean;
  redirection_from: 'USER_QUERY' | 'RFP';
}

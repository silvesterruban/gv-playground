export enum PaymentMethod {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  ZELLE = 'zelle',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  CANCELLED = 'cancelled',
  UNKNOWN = 'unknown',
}

export enum PaymentType {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  ZELLE = 'zelle',
}

export interface OrderResponse {
  id: string;
  status: string;
  links: any[];
}

export interface CaptureResponse {
  id: string;
  status: string;
  amount: any;
}

export interface RefundResponse {
  id: string;
  status: string;
  amount: any;
} 
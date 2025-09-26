import { PaymentMethod, PaymentStatus, PaymentType } from '../../types/payment';

export interface PaymentService {
  createOrder(amount: number, currency: string, description: string, metadata: any): Promise<string>;
  capturePayment(orderId: string): Promise<{ transactionId: string; status: PaymentStatus }>;
  refundPayment(paymentId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  getPaymentMethod(): PaymentMethod;
  getPaymentType(): PaymentType;
} 
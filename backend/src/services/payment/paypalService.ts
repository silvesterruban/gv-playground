// backend/src/services/payment/paypalService.ts
import { PaymentService } from './paymentService';
import { config } from '../../config';
import { Logger } from '../../utils/logger';
import { ApiError } from '../../utils/errors';
import { OrderResponse, CaptureResponse, RefundResponse, PaymentStatus, PaymentMethod, PaymentType } from '../../types/payment';

// Import PayPal SDK
const paypal = require('@paypal/checkout-server-sdk');

export class PayPalService implements PaymentService {
  private client: any;
  private orders: any;
  private payments: any;

  constructor() {
    const environment = new paypal.core.SandboxEnvironment(
      config.paypal.clientId,
      config.paypal.clientSecret
    );
    this.client = new paypal.core.PayPalHttpClient(environment);
    this.orders = new paypal.orders.OrdersCreateRequest();
    this.payments = new paypal.payments.PaymentsController(this.client);
  }

  async createOrder(amount: number, currency: string, description: string, metadata: any): Promise<string> {
    try {
      const request = new paypal.orders.OrdersCreateRequest();
      request.prefer("return=representation");
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: currency,
            value: amount.toString()
          },
          description
        }]
      });

      const response = await this.client.execute(request);
      return response.result.id;
    } catch (error: any) {
      Logger.error('Error creating PayPal order:', error);
      if (error.name === 'UNPROCESSABLE_ENTITY') {
        throw new ApiError('Invalid order details provided', 422);
      }
      throw new ApiError('Failed to create PayPal order', 500);
    }
  }

  async capturePayment(orderId: string): Promise<{ transactionId: string; status: PaymentStatus }> {
    try {
      const request = new paypal.orders.OrdersCaptureRequest(orderId);
      const response = await this.client.execute(request);
      return {
        transactionId: response.result.id,
        status: this.mapPayPalStatusToPaymentStatus(response.result.status)
      };
    } catch (error: any) {
      Logger.error('Error capturing PayPal payment:', error);
      if (error.name === 'RESOURCE_NOT_FOUND') {
        throw new ApiError('Order not found', 404);
      }
      if (error.name === 'UNPROCESSABLE_ENTITY') {
        throw new ApiError('Order cannot be captured', 422);
      }
      throw new ApiError('Failed to capture PayPal payment', 500);
    }
  }

  async refundPayment(paymentId: string, amount: number): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const request = new paypal.payments.CapturesRefundRequest(paymentId);
      request.requestBody({
        amount: {
          value: amount.toString(),
          currency_code: 'USD'
        }
      });

      const response = await this.client.execute(request);
      return {
        success: true,
        transactionId: response.result.id
      };
    } catch (error: any) {
      Logger.error('Error refunding PayPal payment:', error);
      if (error.name === 'RESOURCE_NOT_FOUND') {
        return {
          success: false,
          error: 'Payment not found'
        };
      }
      if (error.name === 'UNPROCESSABLE_ENTITY') {
        return {
          success: false,
          error: 'Payment cannot be refunded'
        };
      }
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    try {
      const request = new paypal.payments.CapturesGetRequest(paymentId);
      const response = await this.client.execute(request);
      return this.mapPayPalStatus(response.result.status);
    } catch (error: any) {
      Logger.error("PayPal get payment status error:", error);
      if (error.name === 'RESOURCE_NOT_FOUND') {
        throw new ApiError('Payment not found', 404);
      }
      throw new ApiError('Failed to get PayPal payment status', 500);
    }
  }

  private mapPayPalStatus(paypalStatus: string): PaymentStatus {
    switch (paypalStatus) {
      case "COMPLETED":
        return PaymentStatus.COMPLETED;
      case "PENDING":
        return PaymentStatus.PENDING;
      case "FAILED":
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.UNKNOWN;
    }
  }

  private mapPayPalStatusToPaymentStatus(paypalStatus: string): PaymentStatus {
    switch (paypalStatus) {
      case 'COMPLETED':
        return PaymentStatus.COMPLETED;
      case 'PENDING':
        return PaymentStatus.PENDING;
      case 'FAILED':
        return PaymentStatus.FAILED;
      default:
        return PaymentStatus.UNKNOWN;
    }
  }

  getPaymentMethod(): PaymentMethod {
    return PaymentMethod.PAYPAL;
  }

  getPaymentType(): PaymentType {
    return PaymentType.PAYPAL;
  }
}
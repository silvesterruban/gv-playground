import { PayPalService } from '../paypalService';
import { ApiError } from '../../../utils/errors';
import { PaymentStatus, PaymentMethod, PaymentType } from '../../../types/payment';

// Mock the PayPal SDK
jest.mock('@paypal/checkout-server-sdk', () => ({
  core: {
    SandboxEnvironment: jest.fn(),
    PayPalHttpClient: jest.fn()
  },
  orders: {
    OrdersCreateRequest: jest.fn(),
    OrdersCaptureRequest: jest.fn()
  },
  payments: {
    CapturesRefundRequest: jest.fn(),
    CapturesGetRequest: jest.fn(),
    PaymentsController: jest.fn()
  }
}));

describe('PayPalService', () => {
  let paypalService: PayPalService;
  let mockClient: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock client
    mockClient = {
      execute: jest.fn()
    };

    // Mock the PayPalHttpClient constructor
    const paypal = require('@paypal/checkout-server-sdk');
    paypal.core.PayPalHttpClient.mockImplementation(() => mockClient);

    paypalService = new PayPalService();
  });

  describe('createOrder', () => {
    it('should create an order with correct parameters', async () => {
      const mockOrderId = 'test-order-id';
      const mockResponse = {
        result: {
          id: mockOrderId,
          status: 'CREATED',
          links: []
        }
      };

      const mockRequest = {
        prefer: jest.fn(),
        requestBody: jest.fn()
      };

      const paypal = require('@paypal/checkout-server-sdk');
      paypal.orders.OrdersCreateRequest.mockImplementation(() => mockRequest);
      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await paypalService.createOrder(100, 'USD', 'Test Order', {});

      expect(result).toBe(mockOrderId);
      expect(mockRequest.prefer).toHaveBeenCalledWith('return=representation');
      expect(mockRequest.requestBody).toHaveBeenCalledWith({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: '100'
          },
          description: 'Test Order'
        }]
      });
    });

    it('should throw ApiError when order creation fails', async () => {
      const error = new Error('API Error');
      (error as any).name = 'UNPROCESSABLE_ENTITY';
      mockClient.execute.mockRejectedValue(error);

      await expect(
        paypalService.createOrder(100, 'USD', 'Test order', { orderId: 'test-order-123' })
      ).rejects.toThrow(ApiError);
    });
  });

  describe('capturePayment', () => {
    it('should capture payment successfully', async () => {
      const mockResponse = {
        result: {
          id: 'test-capture-id',
          status: 'COMPLETED'
        }
      };

      const paypal = require('@paypal/checkout-server-sdk');
      paypal.orders.OrdersCaptureRequest.mockImplementation(() => ({}));
      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await paypalService.capturePayment('test-order-id');

      expect(result).toEqual({
        transactionId: 'test-capture-id',
        status: PaymentStatus.COMPLETED
      });
    });

    it('should throw ApiError when payment capture fails', async () => {
      const error = new Error('API Error');
      (error as any).name = 'RESOURCE_NOT_FOUND';
      mockClient.execute.mockRejectedValue(error);

      await expect(paypalService.capturePayment('test-order-id')).rejects.toThrow(ApiError);
    });
  });

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const mockResponse = {
        result: {
          id: 'test-refund-id',
          status: 'COMPLETED'
        }
      };

      const mockRequest = { requestBody: jest.fn() };
      const paypal = require('@paypal/checkout-server-sdk');
      paypal.payments.CapturesRefundRequest.mockImplementation(() => mockRequest);
      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await paypalService.refundPayment('test-payment-id', 100);

      expect(result).toEqual({
        success: true,
        transactionId: 'test-refund-id'
      });
    });

    it('should handle refund failure gracefully', async () => {
      const error = new Error('Refund failed');
      (error as any).name = 'RESOURCE_NOT_FOUND';
      mockClient.execute.mockRejectedValue(error);

      const result = await paypalService.refundPayment('test-payment-id', 100);

      expect(result).toEqual({
        success: false,
        error: 'Payment not found'
      });
    });
  });

  describe('getPaymentStatus', () => {
    it('should return correct payment status', async () => {
      const mockResponse = {
        result: {
          status: 'COMPLETED'
        }
      };

      const paypal = require('@paypal/checkout-server-sdk');
      paypal.payments.CapturesGetRequest.mockImplementation(() => ({}));
      mockClient.execute.mockResolvedValue(mockResponse);

      const result = await paypalService.getPaymentStatus('test-payment-id');

      expect(result).toBe(PaymentStatus.COMPLETED);
    });

    it('should throw ApiError when status check fails', async () => {
      const error = new Error('API Error');
      (error as any).name = 'RESOURCE_NOT_FOUND';
      mockClient.execute.mockRejectedValue(error);

      await expect(paypalService.getPaymentStatus('test-payment-id')).rejects.toThrow(ApiError);
    });
  });

  describe('getPaymentMethod and getPaymentType', () => {
    it('should return correct payment method', () => {
      expect(paypalService.getPaymentMethod()).toBe(PaymentMethod.PAYPAL);
    });

    it('should return correct payment type', () => {
      expect(paypalService.getPaymentType()).toBe(PaymentType.PAYPAL);
    });
  });
}); 
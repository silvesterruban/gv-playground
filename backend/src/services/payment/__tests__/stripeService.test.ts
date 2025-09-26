import { StripeService } from '../stripeService';
import Stripe from 'stripe';
import { ApiError } from '../../../utils/errors';

// Mock environment variables
process.env.STRIPE_SECRET_KEY = 'test-key';
process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock Stripe
jest.mock('stripe', () => {
  const mockStripe = {
    paymentIntents: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  return jest.fn(() => mockStripe);
});

describe('StripeService', () => {
  let stripe: any;

  beforeEach(() => {
    jest.clearAllMocks();
    stripe = new Stripe('test-key');
    // Reset the static stripe instance
    (StripeService as any).stripe = undefined;
  });

  describe('initialize', () => {
    it('should initialize Stripe with correct configuration', () => {
      const stripe = StripeService.initialize();
      expect(stripe).toBeDefined();
    });
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test123_secret',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await StripeService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
        metadata: { donationId: 'test-donation-id' },
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
          currency: 'usd',
          metadata: expect.objectContaining({
            donationId: 'test-donation-id',
            nonprofit_id: 'gradvillage-501c3',
            platform: 'gradvillage-app',
          }),
          application_fee_amount: 0,
          statement_descriptor: 'GRADVILLAGE DONATION',
          statement_descriptor_suffix: 'TAX DEDUCTIBLE',
        }),
        undefined
      );
    });

    it('should create payment intent with payment method and customer', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test123_secret',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await StripeService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
        paymentMethodId: 'pm_test123',
        customerId: 'cus_test123',
        metadata: { donationId: 'test-donation-id' },
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: 'pm_test123',
          customer: 'cus_test123',
          confirmation_method: 'manual',
          confirm: true,
          return_url: 'http://localhost:3000/donation/complete',
        }),
        undefined
      );
    });

    it('should create payment intent with stripe account', async () => {
      const mockPaymentIntent = {
        id: 'pi_test123',
        amount: 1000,
        currency: 'usd',
        status: 'requires_payment_method',
        client_secret: 'pi_test123_secret',
      };

      stripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await StripeService.createPaymentIntent({
        amount: 1000,
        currency: 'usd',
        metadata: { donationId: 'test-donation-id' },
        stripeAccount: 'acct_test123',
      });

      expect(result).toEqual(mockPaymentIntent);
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.any(Object),
        { stripeAccount: 'acct_test123' }
      );
    });

    it('should throw error when payment intent creation fails', async () => {
      stripe.paymentIntents.create.mockRejectedValue(new Error('API Error'));

      await expect(
        StripeService.createPaymentIntent({
          amount: 1000,
          currency: 'usd',
          metadata: { donationId: 'test-donation-id' },
        })
      ).rejects.toThrow('API Error');
    });
  });

  describe('handleWebhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      const mockEvent = {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test123',
            metadata: { donationId: 'test-donation-id' },
          },
        },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StripeService.handleWebhook('payload', 'signature');

      expect(result).toEqual({ received: true });
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'test-webhook-secret'
      );
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const mockEvent = {
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test123',
            metadata: { donationId: 'test-donation-id' },
          },
        },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StripeService.handleWebhook('payload', 'signature');

      expect(result).toEqual({ received: true });
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'payload',
        'signature',
        'test-webhook-secret'
      );
    });

    it('should handle unknown event types', async () => {
      const mockEvent = {
        type: 'unknown.event',
        data: {
          object: {
            id: 'pi_test123',
            metadata: { donationId: 'test-donation-id' },
          },
        },
      };

      stripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await StripeService.handleWebhook('payload', 'signature');

      expect(result).toEqual({ received: true });
      expect(console.log).toHaveBeenCalledWith('Unhandled event type: unknown.event');
    });

    it('should throw error when webhook handling fails', async () => {
      stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      try {
        await StripeService.handleWebhook('payload', 'signature');
        // If no error is thrown, fail the test
        fail('Expected error was not thrown');
      } catch (error: any) {
        expect(error.message).toBe('Invalid signature');
      }
    });
  });
}); 
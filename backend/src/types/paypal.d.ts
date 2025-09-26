declare module '@paypal/checkout-server-sdk' {
  export class Client {
    constructor(config: { environment: Environment });
    orders: OrdersController;
    payments: PaymentsController;
  }

  export class Environment {
    constructor(clientId: string, clientSecret: string);
  }

  export class OrdersController {
    constructor(client: Client);
    createOrder(request: OrdersCreateRequest): Promise<ApiResponse<OrderResult>>;
    captureOrder(request: OrdersCaptureRequest): Promise<ApiResponse<CaptureResult>>;
  }

  export class PaymentsController {
    constructor(client: Client);
    refundCapturedPayment(request: CapturesRefundRequest): Promise<ApiResponse<RefundResult>>;
    getCapturedPayment(request: CapturesGetRequest): Promise<ApiResponse<CaptureResult>>;
  }

  export class OrdersCreateRequest {
    prefer(prefer: string): void;
    requestBody(body: any): void;
  }

  export class OrdersCaptureRequest {
    constructor(orderId: string);
  }

  export class CapturesRefundRequest {
    constructor(captureId: string);
    requestBody(body: any): void;
  }

  export class CapturesGetRequest {
    constructor(captureId: string);
  }

  interface ApiResponse<T> {
    result: T;
  }

  interface OrderResult {
    id: string;
    status: string;
    links: Array<{ href: string; rel: string; method: string }>;
  }

  interface CaptureResult {
    id: string;
    status: string;
    amount: {
      currency_code: string;
      value: string;
    };
  }

  interface RefundResult {
    id: string;
    status: string;
    amount: {
      currency_code: string;
      value: string;
    };
  }
}

declare module '@paypal/checkout-server-sdk/lib/core' {
  export class Environment {
    constructor(clientId: string, clientSecret: string);
  }
}

declare module '@paypal/checkout-server-sdk/lib/orders' {
  export class OrdersCreateRequest {
    prefer(prefer: string): void;
    requestBody(body: any): void;
  }

  export class OrdersCaptureRequest {
    constructor(orderId: string);
  }
}

declare module '@paypal/checkout-server-sdk/lib/payments' {
  export class CapturesRefundRequest {
    constructor(captureId: string);
    requestBody(body: any): void;
  }

  export class CapturesGetRequest {
    constructor(captureId: string);
  }
} 
declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    export class PayPalEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    export class LiveEnvironment extends PayPalEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    export class SandboxEnvironment extends PayPalEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    export class PayPalHttpClient {
      constructor(environment: PayPalEnvironment);
      execute(request: any): Promise<{ result: any }>;
    }
  }

  export namespace orders {
    export class OrdersCreateRequest {
      constructor();
      prefer(prefer: string): void;
      requestBody(body: any): void;
    }
    export class OrdersCaptureRequest {
      constructor(orderId: string);
    }
  }

  export namespace payments {
    export class CapturesRefundRequest {
      constructor(captureId: string);
      requestBody(body: any): void;
    }
    export class CapturesGetRequest {
      constructor(captureId: string);
    }
  }
} 
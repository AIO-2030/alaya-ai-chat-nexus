// BitPay API Service - Handle backend communication for order management
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { 
  _SERVICE,
  CreateOrderArgs,
  Order,
  InvoiceResp
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Import environment configuration from shared module
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Canister configuration using shared environment module
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

// Log environment configuration for this module
logEnvironmentConfig('AIO_BASE_BACKEND');

// Initialize agent with proper configuration
const agent = new HttpAgent({ 
  host: HOST,
  // Add identity if available (for authenticated calls)
  // identity: await getIdentity()
});

// Configure agent for local development
if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}

// Actor singleton for re-use
let actor: ActorSubclass<_SERVICE> | null = null;

// Get or create actor instance
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[BitPayApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};

// Type definitions for frontend compatibility
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateOrderRequest {
  orderId: string;
  amount: number;
  currency: string;
  buyerEmail?: string | null;
  shippingAddress: string;
  sku: string;
  redirectBase: string;
}

export interface CreateOrderResponse {
  invoiceId: string;
  invoiceUrl: string;
}

export interface OrderRecord {
  orderId: string;
  amount: number;
  currency: string;
  buyerEmail?: string | null;
  shippingAddress: string;
  sku: string;
  bitpayInvoiceId?: string | null;
  bitpayInvoiceUrl?: string | null;
  status: string;
  shipmentNo?: string | null;
  createdAtNs: number;
  updatedAtNs: number;
}

class BitPayApiService {
  // Helper method to convert CreateOrderRequest to CreateOrderArgs
  private convertToCreateOrderArgs(request: CreateOrderRequest): CreateOrderArgs {
    return {
      order_id: request.orderId,
      amount: request.amount,
      currency: request.currency,
      buyer_email: request.buyerEmail ? [request.buyerEmail] : [],
      shipping_address: request.shippingAddress,
      sku: request.sku,
      redirect_base: request.redirectBase,
    };
  }

  // Helper method to convert Order to OrderRecord
  private convertOrderToRecord(order: Order): OrderRecord {
    return {
      orderId: order.order_id,
      amount: order.amount,
      currency: order.currency,
      buyerEmail: order.buyer_email.length > 0 ? order.buyer_email[0] : null,
      shippingAddress: order.shipping_address,
      sku: order.sku,
      bitpayInvoiceId: order.bitpay_invoice_id.length > 0 ? order.bitpay_invoice_id[0] : null,
      bitpayInvoiceUrl: order.bitpay_invoice_url.length > 0 ? order.bitpay_invoice_url[0] : null,
      status: this.getOrderStatusString(order.status),
      shipmentNo: order.shipment_no.length > 0 ? order.shipment_no[0] : null,
      createdAtNs: Number(order.created_at_ns),
      updatedAtNs: Number(order.updated_at_ns),
    };
  }

  // Helper method to convert OrderStatus variant to string
  private getOrderStatusString(status: any): string {
    if (typeof status === 'object' && status !== null) {
      const keys = Object.keys(status);
      if (keys.length === 1) {
        return keys[0];
      }
    }
    return 'Unknown';
  }

  // Helper method to handle canister responses
  private handleCanisterResponse<T>(result: any): ApiResponse<T> {
    if ('Ok' in result) {
      return {
        success: true,
        data: result.Ok,
      };
    } else if ('Err' in result) {
      return {
        success: false,
        error: result.Err,
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  // Create order and get invoice URL
  async createOrderAndGetInvoiceUrl(request: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
    try {
      console.log('[BitPayApi] Creating order:', request);
      
      const actor = getActor();
      const createOrderArgs = this.convertToCreateOrderArgs(request);
      console.log('[BitPayApi] Converted create order args:', createOrderArgs);
      
      const result = await actor.create_order_and_invoice(createOrderArgs);
      
      const response = this.handleCanisterResponse<InvoiceResp>(result);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: {
            invoiceId: response.data.invoice_id,
            invoiceUrl: response.data.invoice_url,
          },
        };
      } else {
        return {
          success: false,
          error: response.error || 'Failed to create order',
        };
      }
    } catch (error) {
      console.error('[BitPayApi] Failed to create order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<ApiResponse<OrderRecord>> {
    try {
      console.log('[BitPayApi] Getting order by ID:', orderId);
      
      const actor = getActor();
      const result = await actor.get_order_by_id(orderId);
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Order not found',
        };
      }

      const orderRecord = this.convertOrderToRecord(result[0]);
      return {
        success: true,
        data: orderRecord,
      };
    } catch (error) {
      console.error('[BitPayApi] Failed to get order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const bitPayApiService = new BitPayApiService();

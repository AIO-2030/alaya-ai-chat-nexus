import { createActor, canisterId } from '../../declarations/aio-base-backend';
import { HttpAgent } from '@dfinity/agent';

export type CreateOrderArgs = {
    orderId: string;
    amount: number;
    currency: string;
    buyerEmail?: string | null;
    shippingAddress: string;
    sku: string;
    redirectBase: string;
};

export async function createOrderAndGetInvoiceUrl(args: CreateOrderArgs) {
    const agent = new HttpAgent();
    if (process.env.DFX_NETWORK !== 'ic') await agent.fetchRootKey();
    const actor = createActor(canisterId, { agent });

    const res = await actor.create_order_and_invoice({
        order_id: args.orderId,
        amount: args.amount,
        currency: args.currency,
        buyer_email: args.buyerEmail ? [args.buyerEmail] : [],
        shipping_address: args.shippingAddress,
        sku: args.sku,
        redirect_base: args.redirectBase,
    });

    const invoiceUrl = (res as any).invoice_url as string;
    const invoiceId  = (res as any).invoice_id as string;
    if (!invoiceUrl) throw new Error('No invoiceUrl from backend');
    return { invoiceId, invoiceUrl };
}

export async function getOrderById(orderId: string) {
    const agent = new HttpAgent();
    if (process.env.DFX_NETWORK !== 'ic') await agent.fetchRootKey();
    const actor = createActor(canisterId, { agent });
    return await actor.get_order_by_id(orderId);
}

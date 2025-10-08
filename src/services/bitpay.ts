import {createActor, canisterId} from '../../declarations/alaya-chat-nexus-frontend';
import {HttpAgent} from '@dfinity/agent';

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((globalThis as any).process?.env?.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
    }

    const actor = createActor(canisterId, {agent});
    // const res = await actor.createOrderAndInvoice({
    //     orderId: args.orderId,
    //     amount: args.amount,
    //     currency: args.currency,
    //     buyerEmail: args.buyerEmail ? [args.buyerEmail] : [],
    //     shippingAddress: args.shippingAddress,
    //     sku: args.sku,
    //     redirectBase: args.redirectBase,
    // });

    // const invoiceId = (res.invoiceId ?? res['invoiceId']) as string;
    // const invoiceUrl = (res.invoiceUrl ?? res['invoiceUrl']) as string;
    // if (!invoiceUrl) {
    //     throw new Error('No invoiceUrl from canister');
    // }

    // return {invoiceId, invoiceUrl};
    return {};
}



/**
 * Solana USDT (SPL token) transfer for AI subscription payment.
 * USDT on Solana: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB (6 decimals)
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const HELIUS_API_KEY = import.meta.env.VITE_HELIUS_API_KEY || '22e64403-eb95-4b21-bedc-5d0f360e9037';
const SOLANA_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

/** USDT (Tether) SPL token mint on Solana mainnet */
export const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
export const USDT_DECIMALS = 6;

/** Recipient wallet for AI subscription payments */
export const SUBSCRIPTION_RECIPIENT_ADDRESS = '8qu5uqXcLFv2nyD7bKf6zAc73THzSqQFopvZm7zQMc6r';

/**
 * Build a Transaction that transfers USDT from sender to SUBSCRIPTION_RECIPIENT_ADDRESS.
 * @param fromWalletAddress - Sender Solana wallet (base58)
 * @param amountUsdt - Amount in USDT (human, e.g. 5 for 5 USDT)
 * @returns Transaction ready to sign and send
 */
export async function buildUsdtTransferTransaction(
  fromWalletAddress: string,
  amountUsdt: number
): Promise<Transaction> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const fromPubkey = new PublicKey(fromWalletAddress);
  const toPubkey = new PublicKey(SUBSCRIPTION_RECIPIENT_ADDRESS);

  const fromAta = await getAssociatedTokenAddress(
    USDT_MINT,
    fromPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const toAta = await getAssociatedTokenAddress(
    USDT_MINT,
    toPubkey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const amountRaw = BigInt(Math.round(amountUsdt * 10 ** USDT_DECIMALS));
  const instructions: TransactionInstruction[] = [];

  try {
    await getAccount(connection, toAta);
  } catch {
    // Recipient does not have an ATA for USDT - create it (sender pays rent)
    instructions.push(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        toAta,
        toPubkey,
        USDT_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  instructions.push(
    createTransferInstruction(
      fromAta,
      toAta,
      fromPubkey,
      amountRaw,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const tx = new Transaction().add(...instructions);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = fromPubkey;
  return tx;
}

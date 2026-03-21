import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { solanaWalletManager } from '@/lib/solanaWallet';

/**
 * Phantom redirect callback page: /wallet-callback
 * - Parses Phantom return params (public_key, session, errorCode, errorMessage, etc.)
 * - Restores wallet connection state
 * - Redirects to home
 */
const WalletCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const publicKey = searchParams.get('public_key') ?? searchParams.get('publicKey');
    const errorCode = searchParams.get('errorCode');
    const errorMessage = searchParams.get('errorMessage');

    if (errorCode || errorMessage) {
      if (import.meta.env.DEV) {
        console.warn('[WalletCallback] Phantom returned error:', { errorCode, errorMessage });
      }
      navigate('/', { replace: true });
      return;
    }

    if (publicKey) {
      solanaWalletManager.applyPhantomRedirect(publicKey);
    } else {
      solanaWalletManager.checkExistingConnection();
    }

    navigate('/', { replace: true });
  }, [searchParams, navigate]);

  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      Redirecting…
    </div>
  );
};

export default WalletCallback;

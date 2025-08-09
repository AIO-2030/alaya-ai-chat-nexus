import { useEffect, useState } from 'react';
import { ensurePrincipalId, getPrincipalId } from '../lib/principal';

export const useEnsurePrincipal = (options?: { autoConnect?: boolean; redirectIfMissing?: boolean }) => {
  const [principalId, setPrincipal] = useState<string | null>(() => getPrincipalId());
  const [loading, setLoading] = useState<boolean>(!principalId);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (principalId) return;
    let mounted = true;
    (async () => {
      try {
        const p = await ensurePrincipalId({ autoConnect: options?.autoConnect ?? true, redirectIfMissing: options?.redirectIfMissing });
        if (!mounted) return;
        setPrincipal(p);
      } catch (err) {
        if (!mounted) return;
        setError(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [principalId, options?.autoConnect, options?.redirectIfMissing]);

  return { principalId, loading, error } as const;
};


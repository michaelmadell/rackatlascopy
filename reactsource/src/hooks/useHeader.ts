import { useEffect, useRef } from 'react';
import { useHeaderConfig, type HeaderConfig } from '@/contexts/HeaderContext';

export function useHeader(config: HeaderConfig) {
  const { setConfig } = useHeaderConfig();
  const lastTitleRef = useRef<string>('');

  useEffect(() => {
    if (config && config.title !== lastTitleRef.current) {
      lastTitleRef.current = config.title;
      setConfig(config);
    }
  }, [config?.title]);
}

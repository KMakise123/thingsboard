/**
 * Mobile viewport flag for the dashboard runtime (<768px, brief §1.4 —
 * single-column stack below this width).
 */
import { useEffect, useState } from 'react';

import { MOBILE_BREAKPOINT_PX } from '@/core/dashboard/model';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT_PX,
  );

  useEffect(() => {
    const onResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return isMobile;
}

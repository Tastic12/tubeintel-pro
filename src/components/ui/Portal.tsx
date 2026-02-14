'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
}

export default function Portal({ children }: PortalProps) {
  const [mounted, setMounted] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current && typeof document !== 'undefined') {
    elRef.current = document.createElement('div');
  }

  useEffect(() => {
    if (!elRef.current) return;
    
    const el = elRef.current;
    document.body.appendChild(el);
    setMounted(true);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  return mounted && elRef.current ? createPortal(children, elRef.current) : null;
}

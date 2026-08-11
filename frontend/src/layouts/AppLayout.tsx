import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import type { HeaderContext } from './headerContext';

export function AppLayout() {
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);

  const setEventTitleStable = useCallback((title: string | null) => setEventTitle(title), []);

  const context: HeaderContext = { setEventTitle: setEventTitleStable };

  // The header is fixed (out of document flow), so the content wrapper needs an
  // explicit top offset matching its real rendered height — measured instead of
  // hardcoded since the header's height varies with viewport width (clamp()s).
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty('--photip-header-height', `${el.offsetHeight}px`);
    };
    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="photip-app">
      <Header ref={headerRef} eventTitle={eventTitle} />
      <main className="photip-app__content">
        <Outlet context={context} />
      </main>
    </div>
  );
}

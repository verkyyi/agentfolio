import { useEffect, useRef } from 'react';

interface Props {
  name: string;
  onDwell: (section: string, ms: number) => void;
  children: React.ReactNode;
}

export function SectionDwellTracker({ name, onDwell, children }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const flushIfVisible = () => {
      if (visibleSince.current !== null) {
        const ms = Date.now() - visibleSince.current;
        visibleSince.current = null;
        if (ms > 0) onDwell(name, ms);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (visibleSince.current === null) visibleSince.current = Date.now();
        } else {
          flushIfVisible();
        }
      }
    });
    observer.observe(el);

    return () => {
      flushIfVisible();
      observer.disconnect();
    };
  }, [name, onDwell]);

  return <div ref={ref}>{children}</div>;
}

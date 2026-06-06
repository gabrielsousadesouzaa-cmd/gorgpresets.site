import { useEffect, useRef, useState } from "react";

interface UseInViewOptions {
  threshold?: number;
  triggerOnce?: boolean;
}

export function useInView(options: UseInViewOptions = { threshold: 0.1, triggerOnce: true }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options.triggerOnce) {
            observer.unobserve(currentRef);
          }
        }
      },
      { threshold: options.threshold }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
      observer.disconnect();
    };
  }, [options.threshold, options.triggerOnce]);

  return { ref, inView };
}

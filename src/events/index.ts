import { useRef, useCallback, useMemo } from 'react';



type Callback<T> = (data: T) => void;

const debounce = (fn: Function, delay: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

/**
 * Custom event hook with memoized handlers to prevent recreations on every render.
 */
export function useReactEvent<EventKey extends string, T = any>(eventKey: EventKey, debounceDelay?: number) {
    const onceFired = useRef(false);

    // Emit event, memoized so `emit` has stable reference
    const emit = useCallback((payload?: T) => {
        window.dispatchEvent(new CustomEvent(eventKey, { detail: payload }));
    }, [eventKey]);

    // Emit only once, memoized and uses latest `emit`
    const emitOnce = useCallback((payload?: T) => {
        if (!onceFired.current) {
            emit(payload);
            onceFired.current = true;
        }
    }, [emit]);

    // Stable debounced emit: uses useMemo so the debounced function is created once per delay
    const emitDebounced = useMemo(() => {
        const delay = debounceDelay ?? 300;
        return debounce((payload: T) => {
            emit(payload);
        }, delay);
    }, [emit, debounceDelay]);

    // Listen to event, returns unsubscribe function
    const listen = useCallback((handler: Callback<T>) => {
        const wrapper = (e: Event) => handler((e as CustomEvent<T>).detail);
        window.addEventListener(eventKey, wrapper);
        return () => window.removeEventListener(eventKey, wrapper);
    }, [eventKey]);

    // Listen once to event, auto removes listener after first call
    const listenOnce = useCallback((handler: Callback<T>) => {
        const wrapper = (e: Event) => {
            handler((e as CustomEvent<T>).detail);
            window.removeEventListener(eventKey, wrapper);
        };
        window.addEventListener(eventKey, wrapper);
    }, [eventKey]);

    return {
        emit,
        emitOnce,
        emitDebounced,
        listen,
        listenOnce,
    };
}
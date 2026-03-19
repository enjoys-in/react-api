import { useRef, useCallback, useMemo, useEffect } from 'react';

const isBrowser = typeof window !== 'undefined';

type Callback<T> = (data: T) => void;

/** Type-safe event registry: map event keys to their payload types. */
export type EventMap = Record<string, any>;

/**
 * Extract the payload type for a given event key from an EventMap.
 * Falls back to `any` if no map is provided.
 */
type PayloadOf<Map extends EventMap, K extends keyof Map> = Map[K];

interface DebouncedFn<T> {
    (payload?: T): void;
    cancel: () => void;
}

function createDebouncedFn<T>(fn: (payload?: T) => void, delay: number): DebouncedFn<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = (payload?: T) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            fn(payload);
        }, delay);
    };
    debounced.cancel = () => {
        if (timer !== undefined) {
            clearTimeout(timer);
            timer = undefined;
        }
    };
    return debounced;
}

/**
 * Resolves the full event key, applying an optional namespace prefix.
 */
function resolveKey(eventKey: string, namespace?: string): string {
    return namespace ? `${namespace}:${eventKey}` : eventKey;
}

// ─── useReactEvent ───────────────────────────────────────────────────────────

export interface UseReactEventOptions {
    /** Optional namespace prefix to avoid event key collisions across modules. */
    namespace?: string;
    /** Debounce delay in ms for `emitDebounced` (default: 300). */
    debounceDelay?: number;
}

export interface UseEventListenerOptions {
    /** Optional namespace prefix to avoid event key collisions across modules. */
    namespace?: string;
}

export interface UseReactEventReturn<T> {
    emit: (payload?: T) => void;
    emitOnce: (payload?: T) => void;
    emitDebounced: DebouncedFn<T>;
    listen: (handler: Callback<T>) => () => void;
    listenOnce: (handler: Callback<T>) => () => void;
    resetOnce: () => void;
}

/**
 * Custom event hook with memoized handlers to prevent recreations on every render.
 * SSR-safe — all browser APIs are guarded.
 *
 * @example With an EventMap for type safety across the app:
 * ```ts
 * type MyEvents = { 'user:logout': { reason: string }; 'theme:change': string };
 * const { emit } = useReactEvent<MyEvents, 'user:logout'>('user:logout');
 * emit({ reason: 'manual' }); // fully typed
 * ```
 *
 * @example With namespace to avoid collisions:
 * ```ts
 * const { emit } = useReactEvent('click', { namespace: 'sidebar' });
 * // dispatches "sidebar:click"
 * ```
 */
export function useReactEvent<
    Map extends EventMap = EventMap,
    K extends string = string
>(
    eventKey: K,
    options?: UseReactEventOptions
): UseReactEventReturn<K extends keyof Map ? PayloadOf<Map, K> : any> {
    type T = K extends keyof Map ? PayloadOf<Map, K> : any;

    const { namespace, debounceDelay } = options ?? {};
    const fullKey = resolveKey(eventKey, namespace);

    const onceFired = useRef(false);

    // Reset onceFired when the event key changes so emitOnce works correctly on new keys
    const prevKeyRef = useRef(fullKey);
    if (prevKeyRef.current !== fullKey) {
        prevKeyRef.current = fullKey;
        onceFired.current = false;
    }

    const emit = useCallback((payload?: T) => {
        if (!isBrowser) return;
        window.dispatchEvent(new CustomEvent(fullKey, { detail: payload }));
    }, [fullKey]);

    const emitOnce = useCallback((payload?: T) => {
        if (!onceFired.current) {
            emit(payload);
            onceFired.current = true;
        }
    }, [emit]);

    const resetOnce = useCallback(() => {
        onceFired.current = false;
    }, []);

    const emitDebounced = useMemo(() => {
        return createDebouncedFn<T>((payload?: T) => emit(payload), debounceDelay ?? 300);
    }, [emit, debounceDelay]);

    // Cancel pending debounce timer when the debounced fn is recreated or component unmounts
    useEffect(() => {
        return () => emitDebounced.cancel();
    }, [emitDebounced]);

    // Use a ref to always have the latest handler, avoiding stale closures in listen/listenOnce
    const listen = useCallback((handler: Callback<T>) => {
        if (!isBrowser) return () => {};
        const handlerRef = { current: handler };
        const wrapper = (e: Event) => handlerRef.current((e as CustomEvent<T>).detail);
        window.addEventListener(fullKey, wrapper);
        return () => {
            window.removeEventListener(fullKey, wrapper);
        };
    }, [fullKey]);

    const listenOnce = useCallback((handler: Callback<T>) => {
        if (!isBrowser) return () => {};
        let removed = false;
        const wrapper = (e: Event) => {
            if (removed) return;
            removed = true;
            handler((e as CustomEvent<T>).detail);
            window.removeEventListener(fullKey, wrapper);
        };
        window.addEventListener(fullKey, wrapper);
        return () => {
            if (!removed) {
                removed = true;
                window.removeEventListener(fullKey, wrapper);
            }
        };
    }, [fullKey]);

    return { emit, emitOnce, emitDebounced, listen, listenOnce, resetOnce };
}

// ─── useEventListener ────────────────────────────────────────────────────────

/**
 * Auto-subscribing listener hook — eliminates the useEffect boilerplate.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Uses a ref internally so the latest handler is always called (no stale closures).
 *
 * @example
 * ```tsx
 * useEventListener('user:logout', (data) => {
 *   console.log('User logged out:', data);
 * });
 * ```
 */
export function useEventListener<
    Map extends EventMap = EventMap,
    K extends string = string
>(
    eventKey: K,
    handler: Callback<K extends keyof Map ? PayloadOf<Map, K> : any>,
    options?: UseEventListenerOptions
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    const fullKey = resolveKey(eventKey, options?.namespace);

    useEffect(() => {
        if (!isBrowser) return;
        const wrapper = (e: Event) => handlerRef.current((e as CustomEvent).detail);
        window.addEventListener(fullKey, wrapper);
        return () => window.removeEventListener(fullKey, wrapper);
    }, [fullKey]);
}
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useRef, useCallback, useMemo, useEffect, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

/**
 * Checks if the BroadcastChannel API is supported in the current environment.
 */
export const isBroadcastChannelSupported = (): boolean =>
    typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined';

type Callback<T> = (data: T) => void;

/** Type-safe event registry: map channel/event keys to their payload types. */
export type BroadcastEventMap = Record<string, any>;

/** Alias for BroadcastEventMap */
export type BroadcastMap = BroadcastEventMap;

/**
 * Extract the payload type for a given event key from a BroadcastEventMap.
 * Falls back to `any` if no map is provided.
 */
type PayloadOf<Map extends BroadcastEventMap, K extends keyof Map> = Map[K];

export interface PostMessageCallOptions {
    /**
     * Whether to dispatch this specific message to listeners in the current tab as well.
     * Overrides the hook-level `includeSelf` setting if specified.
     */
    includeSelf?: boolean;
}

export interface DebouncedFn<T> {
    (payload?: T, options?: PostMessageCallOptions): void;
    cancel: () => void;
}

function createDebouncedFn<T>(
    fn: (payload?: T, options?: PostMessageCallOptions) => void,
    delay: number
): DebouncedFn<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const debounced = (payload?: T, options?: PostMessageCallOptions) => {
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = undefined;
            fn(payload, options);
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
 * Resolves the full channel key, applying an optional namespace prefix.
 */
function resolveKey(channelName: string, namespace?: string): string {
    return namespace ? `${namespace}:${channelName}` : channelName;
}

// ─── Channel Manager (Singleton Multiplexer with Ref-Counting) ───────────────

interface ChannelEntry {
    channel: BroadcastChannel;
    refCount: number;
    listeners: Set<Callback<any>>;
}

class ChannelManager {
    private channels = new Map<string, ChannelEntry>();

    private getOrCreate(channelName: string): ChannelEntry | null {
        if (!isBrowser || !isBroadcastChannelSupported()) return null;

        let entry = this.channels.get(channelName);
        if (!entry) {
            try {
                const channel = new BroadcastChannel(channelName);
                const listeners = new Set<Callback<any>>();

                channel.onmessage = (event: MessageEvent) => {
                    listeners.forEach(cb => {
                        try {
                            cb(event.data);
                        } catch (err) {
                            console.error(`[BroadcastChannel] Listener error on channel "${channelName}":`, err);
                        }
                    });
                };

                channel.onmessageerror = (event: MessageEvent) => {
                    console.warn(`[BroadcastChannel] Message deserialization error on channel "${channelName}":`, event);
                };

                entry = { channel, refCount: 0, listeners };
                this.channels.set(channelName, entry);
            } catch (err) {
                console.error(`[BroadcastChannel] Failed to create BroadcastChannel "${channelName}":`, err);
                return null;
            }
        }
        return entry;
    }

    acquire(channelName: string): () => void {
        const entry = this.getOrCreate(channelName);
        if (!entry) return () => {};

        entry.refCount++;
        let released = false;

        return () => {
            if (released) return;
            released = true;
            entry.refCount--;
            this.checkAndClose(channelName);
        };
    }

    addListener(channelName: string, listener: Callback<any>): () => void {
        const entry = this.getOrCreate(channelName);
        if (!entry) return () => {};

        entry.listeners.add(listener);
        entry.refCount++;
        let removed = false;

        return () => {
            if (removed) return;
            removed = true;
            entry.listeners.delete(listener);
            entry.refCount--;
            this.checkAndClose(channelName);
        };
    }

    postMessage(channelName: string, payload: any, includeSelf: boolean): void {
        const entry = this.getOrCreate(channelName);
        if (!entry) return;

        // Broadcast to other tabs
        try {
            entry.channel.postMessage(payload);
        } catch (err) {
            console.error(`[BroadcastChannel] Failed to postMessage on channel "${channelName}":`, err);
            throw err;
        }

        // Dispatch to local listeners if includeSelf is true
        if (includeSelf) {
            entry.listeners.forEach(cb => {
                try {
                    cb(payload);
                } catch (err) {
                    console.error(`[BroadcastChannel] Local listener error on channel "${channelName}":`, err);
                }
            });
        }
    }

    getChannel(channelName: string): BroadcastChannel | null {
        const entry = this.channels.get(channelName);
        return entry ? entry.channel : null;
    }

    forceClose(channelName: string): void {
        const entry = this.channels.get(channelName);
        if (!entry) return;

        try {
            entry.channel.close();
        } catch {
            // Ignore error on close
        }
        this.channels.delete(channelName);
    }

    private checkAndClose(channelName: string): void {
        const entry = this.channels.get(channelName);
        if (!entry) return;

        if (entry.refCount <= 0 && entry.listeners.size === 0) {
            try {
                entry.channel.close();
            } catch {
                // Ignore error on close
            }
            this.channels.delete(channelName);
        }
    }
}

const channelManager = new ChannelManager();

// ─── useBroadcastChannel ─────────────────────────────────────────────────────

export interface UseBroadcastChannelOptions {
    /** Optional namespace prefix to avoid channel name collisions across modules. */
    namespace?: string;
    /** Debounce delay in ms for `postMessageDebounced` / `emitDebounced` (default: 300). */
    debounceDelay?: number;
    /**
     * Whether to dispatch messages to listeners within the current tab as well (default: false).
     * Can be overridden per message via `emit(data, { includeSelf: true })`.
     */
    includeSelf?: boolean;
}

export interface UseBroadcastListenerOptions {
    /** Optional namespace prefix to avoid channel name collisions across modules. */
    namespace?: string;
}

export interface UseBroadcastStateOptions {
    /** Optional namespace prefix to avoid channel name collisions across modules. */
    namespace?: string;
    /** Debounce delay in ms before broadcasting state changes (default: 0 / immediate). */
    debounceDelay?: number;
    /** Whether to synchronize state across components in the same tab as well (default: true). */
    syncLocal?: boolean;
}

export interface UseBroadcastChannelReturn<T> {
    /** Post a message to other tabs (and optionally current tab if includeSelf is true). */
    postMessage: (payload?: T, options?: PostMessageCallOptions) => void;
    /** Alias for `postMessage` — matches `useReactEvent.emit` for API parity. */
    emit: (payload?: T, options?: PostMessageCallOptions) => void;
    /** Post only the first time; auto-resets on channel name change or via `resetOnce`. */
    postMessageOnce: (payload?: T, options?: PostMessageCallOptions) => void;
    /** Alias for `postMessageOnce`. */
    emitOnce: (payload?: T, options?: PostMessageCallOptions) => void;
    /** Debounced postMessage; includes `.cancel()` method and auto-cleanup on unmount. */
    postMessageDebounced: DebouncedFn<T>;
    /** Alias for `postMessageDebounced`. */
    emitDebounced: DebouncedFn<T>;
    /** Subscribe to messages on this channel; returns an unsubscribe function. */
    listen: (handler: Callback<T>) => () => void;
    /** Subscribe once; automatically removes itself after first message; returns unsubscribe for early cleanup. */
    listenOnce: (handler: Callback<T>) => () => void;
    /** Manually re-arms `postMessageOnce` / `emitOnce` so it can fire again. */
    resetOnce: () => void;
    /** Explicitly closes the channel connection for this channel name. */
    close: () => void;
    /** Whether the BroadcastChannel API is supported in the current environment. */
    isSupported: boolean;
    /** The raw native BroadcastChannel instance (null on server or if unsupported). */
    channel: BroadcastChannel | null;
}

/**
 * Cross-tab synchronization hook using the browser's native `BroadcastChannel` API.
 * Memoized handlers prevent unnecessary recreations on every render.
 * SSR-safe — all browser APIs are guarded.
 *
 * @example With a typed BroadcastEventMap:
 * ```ts
 * type AppChannels = { 'auth:logout': { reason: string }; 'theme:change': string };
 * const { emit } = useBroadcastChannel<AppChannels, 'auth:logout'>('auth:logout');
 * emit({ reason: 'user_initiated' }); // fully typed across tabs
 * ```
 *
 * @example With namespace:
 * ```ts
 * const { postMessage } = useBroadcastChannel('sync', { namespace: 'cart' });
 * // broadcasts on "cart:sync"
 * ```
 */
export function useBroadcastChannel<
    Map extends BroadcastEventMap = BroadcastEventMap,
    K extends string = string
>(
    channelName: K,
    options?: UseBroadcastChannelOptions
): UseBroadcastChannelReturn<K extends keyof Map ? PayloadOf<Map, K> : any> {
    type T = K extends keyof Map ? PayloadOf<Map, K> : any;

    const { namespace, debounceDelay, includeSelf: hookIncludeSelf } = options ?? {};
    const fullKey = resolveKey(channelName, namespace);
    const supported = isBrowser && isBroadcastChannelSupported();

    const onceFired = useRef(false);

    // Reset onceFired when the channel key changes so emitOnce works correctly on new keys
    const prevKeyRef = useRef(fullKey);
    if (prevKeyRef.current !== fullKey) {
        prevKeyRef.current = fullKey;
        onceFired.current = false;
    }

    // Keep channel alive while this hook is mounted
    useEffect(() => {
        if (!supported) return;
        const release = channelManager.acquire(fullKey);
        return () => {
            release();
        };
    }, [fullKey, supported]);

    const postMessage = useCallback((payload?: T, callOptions?: PostMessageCallOptions) => {
        if (!supported) return;
        const shouldIncludeSelf = callOptions?.includeSelf ?? hookIncludeSelf ?? false;
        channelManager.postMessage(fullKey, payload, shouldIncludeSelf);
    }, [fullKey, supported, hookIncludeSelf]);

    const emit = postMessage;

    const postMessageOnce = useCallback((payload?: T, callOptions?: PostMessageCallOptions) => {
        if (!onceFired.current) {
            postMessage(payload, callOptions);
            onceFired.current = true;
        }
    }, [postMessage]);

    const emitOnce = postMessageOnce;

    const resetOnce = useCallback(() => {
        onceFired.current = false;
    }, []);

    const postMessageDebounced = useMemo(() => {
        return createDebouncedFn<T>((payload?: T, callOptions?: PostMessageCallOptions) => {
            postMessage(payload, callOptions);
        }, debounceDelay ?? 300);
    }, [postMessage, debounceDelay]);

    // Cancel pending debounce timer when the debounced fn is recreated or component unmounts
    useEffect(() => {
        return () => postMessageDebounced.cancel();
    }, [postMessageDebounced]);

    const emitDebounced = postMessageDebounced;

    // Use a ref to always have the latest handler, avoiding stale closures in listen/listenOnce
    const listen = useCallback((handler: Callback<T>) => {
        if (!supported) return () => {};
        const handlerRef = { current: handler };
        const wrapper = (data: T) => handlerRef.current(data);
        const unsub = channelManager.addListener(fullKey, wrapper);
        return unsub;
    }, [fullKey, supported]);

    const listenOnce = useCallback((handler: Callback<T>) => {
        if (!supported) return () => {};
        let removed = false;
        let unsub: (() => void) | undefined;
        const wrapper = (data: T) => {
            if (removed) return;
            removed = true;
            unsub?.();
            handler(data);
        };
        unsub = channelManager.addListener(fullKey, wrapper);
        return () => {
            if (!removed) {
                removed = true;
                unsub?.();
            }
        };
    }, [fullKey, supported]);

    const close = useCallback(() => {
        if (!supported) return;
        channelManager.forceClose(fullKey);
    }, [fullKey, supported]);

    const channel = supported ? channelManager.getChannel(fullKey) : null;

    return {
        postMessage,
        emit,
        postMessageOnce,
        emitOnce,
        postMessageDebounced,
        emitDebounced,
        listen,
        listenOnce,
        resetOnce,
        close,
        isSupported: supported,
        channel,
    };
}

/** Alias for `useBroadcastChannel` */
export const useReactBroadcast = useBroadcastChannel;

// ─── useBroadcastListener ───────────────────────────────────────────────────

/**
 * Auto-subscribing listener hook for BroadcastChannel — eliminates useEffect boilerplate.
 * Automatically subscribes on mount and unsubscribes on unmount.
 * Uses a ref internally so the latest handler is always called (no stale closures).
 * SSR-safe — guards all browser APIs.
 *
 * @example
 * ```tsx
 * useBroadcastListener('auth:logout', () => {
 *   setUser(null);
 * });
 * ```
 */
export function useBroadcastListener<
    Map extends BroadcastEventMap = BroadcastEventMap,
    K extends string = string
>(
    channelName: K,
    handler: Callback<K extends keyof Map ? PayloadOf<Map, K> : any>,
    options?: UseBroadcastListenerOptions
) {
    const handlerRef = useRef(handler);
    handlerRef.current = handler;

    const fullKey = resolveKey(channelName, options?.namespace);
    const supported = isBrowser && isBroadcastChannelSupported();

    useEffect(() => {
        if (!supported) return;
        const wrapper = (data: any) => handlerRef.current(data);
        const unsub = channelManager.addListener(fullKey, wrapper);
        return () => unsub();
    }, [fullKey, supported]);
}

// ─── useBroadcastState ──────────────────────────────────────────────────────

/**
 * Real-time state synchronization hook across browser tabs.
 * Behaves like `React.useState`, but synchronizes state updates across all tabs in real-time.
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useBroadcastState('theme', 'light');
 * ```
 */
export function useBroadcastState<
    T,
    Map extends BroadcastEventMap = BroadcastEventMap,
    K extends string = string
>(
    channelName: K,
    initialValue?: T | (() => T),
    options?: UseBroadcastStateOptions
): [T, (value: T | ((prev: T) => T)) => void] {
    type PayloadType = K extends keyof Map ? PayloadOf<Map, K> : T;

    const { namespace, debounceDelay = 0, syncLocal = true } = options ?? {};

    const [state, setStateInternal] = useState<PayloadType>(() => {
        if (typeof initialValue === 'function') {
            return (initialValue as () => PayloadType)();
        }
        return initialValue as PayloadType;
    });

    const stateRef = useRef<PayloadType>(state);
    stateRef.current = state;

    // Listen for state broadcasts from other tabs (and same tab if syncLocal is true)
    useBroadcastListener<Map, K>(
        channelName,
        (incomingState: PayloadType) => {
            stateRef.current = incomingState;
            setStateInternal(incomingState);
        },
        { namespace }
    );

    const { postMessage, postMessageDebounced } = useBroadcastChannel<Map, K>(
        channelName,
        { namespace, debounceDelay }
    );

    const setBroadcastState = useCallback(
        (value: PayloadType | ((prev: PayloadType) => PayloadType)) => {
            const nextState = typeof value === 'function'
                ? (value as (prev: PayloadType) => PayloadType)(stateRef.current)
                : value;

            stateRef.current = nextState;
            setStateInternal(nextState);

            // Broadcast to other tabs (and optionally local components via includeSelf)
            if (debounceDelay > 0) {
                postMessageDebounced(nextState, { includeSelf: syncLocal });
            } else {
                postMessage(nextState, { includeSelf: syncLocal });
            }
        },
        [postMessage, postMessageDebounced, debounceDelay, syncLocal]
    );

    return [state as T, setBroadcastState as (value: T | ((prev: T) => T)) => void];
}

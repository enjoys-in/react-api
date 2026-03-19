import { useState, useCallback } from "react";
import { OFSManager } from "../ofs-manager";

export interface UseOFSReturn {
    /** The file system manager instance. */
    ofs: OFSManager;
    /** Whether directory access has been granted. */
    ready: boolean;
    /** Error from the last `requestAccess` call (e.g. user cancelled picker). */
    error: Error | null;
    /** Opens the directory picker. Sets `ready` on success, `error` on failure. */
    requestAccess: () => Promise<void>;
    /** Re-checks readwrite permission. Updates `ready` state and returns the result. */
    checkPermission: () => Promise<boolean>;
}

export function useOFS(): UseOFSReturn {
    const [ofs] = useState(() => new OFSManager());
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const requestAccess = useCallback(async () => {
        try {
            setError(null);
            await ofs.requestAccess();
            setReady(true);
        } catch (e) {
            const err = e instanceof Error ? e : new Error(String(e));
            setError(err);
            setReady(false);
            throw err;
        }
    }, [ofs]);

    const checkPermission = useCallback(async () => {
        const allowed = await ofs.isAllowed();
        setReady(allowed);
        return allowed;
    }, [ofs]);

    return {
        ofs,
        ready,
        error,
        requestAccess,
        checkPermission,
    };
}

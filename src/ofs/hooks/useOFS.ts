import { useState, useCallback } from "react";
import { OFSManager } from "../ofs-manager";

export function useOFS() {
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

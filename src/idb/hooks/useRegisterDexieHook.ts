"use client";

import { useEffect } from "react";

export function useDexieObservable() {
    useEffect(() => {
        if (typeof window !== "undefined") {
            import("dexie-observable")
        }
    }, []);
}

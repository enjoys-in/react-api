
import { useState } from "react";
import { OFSManager } from "../ofs-manager";

export function useOFS() {
  const [ofs] = useState(() => new OFSManager());
  const [ready, setReady] = useState(false);

  const requestAccess = async () => {
    await ofs.requestAccess();
    setReady(true);
  };

  const checkPermission = async () => {
    const allowed = await ofs.isAllowed();
    setReady(allowed);
  };

  return {
    ofs,
    ready,
    requestAccess,
    checkPermission,
  };
}

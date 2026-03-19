```tsx
import React from "react";
import dot from "dot-object";

const IdbSyncHookApi<T> = ({ db } = { db: any }) => {
  React.useEffect(() => {
    const handler = async (changes: any) => {
      // console.log('changes', changes); // use dot.object(changes.mods) to convert dotted paths to object
    };

    (db as any).on("changes", handler);

    return () => {
      db.on("changes").unsubscribe(handler);
    };
  }, []);

  return null;
};

export default IdbSyncHookApi;
```

```tsx
"use client";
import React, { createContext } from "react";
import dynamic from "next/dynamic";
import { IDB, type TableSchema } from "@enjoys/react-api/idb";
import { type EntityTable } from "dexie";

const IdbSyncHookApi = dynamic(() => import("./hook-api"), {
  ssr: false,
});

// Step 1: Define your entity
interface Demo {
  id: number;
  name: string;
}

// Step 2: Define Tables — EntityTable<Entity, PK> selects the primary key
type MyTables = {
  demo: EntityTable<Demo, "id">; // 'id' is the primary key
};

interface ReactApiContextProps {
  db: IDB<MyTables>;
}

export const ReactApiContext = createContext<ReactApiContextProps | undefined>(
  undefined
);

export const ReactApiContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Step 3: Define schema — '++id' = auto-increment PK, 'name' = indexed field
  const tables = {
    demo: "++id,name",
  } satisfies TableSchema<MyTables>;

  const db = new IDB<MyTables>(tables, "idb", 1);

  return (
    <ReactApiContext.Provider value={{ db }}>
      <IdbSyncHookApi db={db} />
      {children}
    </ReactApiContext.Provider>
  );
};
```

```tsx
"use client";
import React, { createContext } from "react";
import dynamic from "next/dynamic";
import { IDB, CreatePKTableSchema } from "@enjoys/react-api/dist/idb";
import { EntityTable } from "dexie";

const IdbSyncHookApi = dynamic(() => import("./hook-api"), {
  ssr: false,
});
interface MyTables {
  demo: EntityTable<{ name: string; id: number }, "id">;
}
``;
interface ReactApiContextProps {
  db: IDB;
}

export const ReactApiContext = createContext<ReactApiContextProps | undefined>(
  undefined
);

export const ReactApiContextProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const tables: CreatePKTableSchema<MyTables> = {
    demo: "++id",
  };
  const db = new IDB(tables, "idb");
  return (
    <ReactApiContext.Provider value={{ db }}>
      <IdbSyncHookApi db={db} />
      {children}
    </ReactApiContext.Provider>
  );
};
```

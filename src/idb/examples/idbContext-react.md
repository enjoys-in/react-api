```tsx
import React, { createContext } from "react";
import { IDB, CreatePKTableSchema } from "@enjoys/react-api";
import { EntityTable } from "dexie";
import IdbSyncHookApi from "./hook-api";

interface MyTables {
  demo: EntityTable<{ name: string; id: number }, "id">;
}
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

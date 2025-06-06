## Create Table Schema Interface

```tsx
import { type EntityTable } from "dexie";
import {  IDB } from '@enjoys/react-api/idb';

type Tables = {
  mails: EntityTable<{ [key: string]: any }, "message_id">;
  users: EntityTable<
    {
      user_id: string;
      settings: {
        test: {
          random: string;
        };
      };
    },
    "user_id"
  >;
};
// Schema to show Type Key Bindings 
const MyTableSchema:TableSchema<Tables>={
mails:""
users:""
}
const idb= new IDB(
    MyTableSchema, // First Param is Tableschema
    "Your_dbName", // Database Name
    1              // Data base Version, by default 1
)
```

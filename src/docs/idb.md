## Create Table Schema Interface

```tsx
import { type EntityTable } from "dexie";
import {  IDB ,CreatePKTableSchema} from '@enjoys/react-api/idb';

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
const MyTableSchema:CreatePKTableSchema<Tables>={
mails:"" // it will auto suggest the primary id that you choose in your table schema
users:""
}
const idb= new IDB(
    MyTableSchema, // First Param is Tableschema
    "Your_dbName", // Database Name
    1              // Data base Version, by default 1
)
```

### Hooks

if you want to listen for hooks like what are the changes you can create own hook using `dexie-react-hooks` or you can import `IdbContext`

- We wont recommend to create on you hook, because it will break build in Next.Js .
- To Resolve this error we have already fix the bugs, still you want to use your own hook and do some changes , here you can do
- (React)[../idb/examples/idbContext-react.md]
- (Next)[../idb/examples/idbContext-next.md]
- (Hook-Api)[../idb/examples/hook-api.md]
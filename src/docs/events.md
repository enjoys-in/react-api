```tsx
enum MyEvents {
  USER_LOGOUT = "user:logout",
}
```
### Use Same Event Name
```tsx
import { useReactEvent } from "@enjoys/react-api/dist/events";
// Same compoenent
export default function your_component() {
  const { emit } = useReactEvent(MyEvents.USER_LOGOUT);
  const handler = (data: any) => {
    console.log(data);
  };
  return (
    <>
      <button onClick={emit}> Emit </button>
      <button onClick={() => emit({ test: "OK" })}> Emit Payload</button>
    </>
  );
}
```

```tsx

import { useReactEvent } from "@enjoys/react-api/event";
// Other Component compoenent
export default function other_component() {
  const { listen } = useReactEvent(MyEvents.USER_LOGOUT);
  const handler = (data: any) => {
    console.log(data);
  };
  useEffect(()=>{
    const unsubscribe =listen(handler)
    return unsubscribe
  }.[listen])
  return (
    ...
  );
}
```
### Other Func
- emit
- emitOnce
- emitDebounce
- listen
- listenOnce
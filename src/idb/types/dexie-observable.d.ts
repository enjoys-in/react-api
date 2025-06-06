
import "dexie"

declare module "dexie" {
    interface Dexie {
        on: DexieObservable.On
    }

    namespace DexieObservable {
        interface On {
            (event: "changes", subscriber: (changes: Dexie.ObservableChangeSet[]) => void): void
            (event: "populate", subscriber: () => void): void
            (event: string, subscriber: (...args: any[]) => void): void
        }
    }

    namespace Dexie {
        interface ObservableChange {
            table: string
            key: any
            type: "CREATE" | "UPDATE" | "DELETE"
            obj?: any
            mods?: any
            oldObj?: any
            source?: any
            rev?: number
        }

        type ObservableChangeSet = ObservableChange[]
    }
}

export {}
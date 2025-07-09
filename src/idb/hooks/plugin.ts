import Dexie from 'dexie';
import { QueryBuilder } from 'idb/query-builder';

export function useQueryBuilder<Tables extends Record<string, Dexie.Table<any, any>>>(db: Dexie & Tables) {
  return {
    query<TableName extends keyof Tables>(
      tableName: TableName
    ): QueryBuilder<Tables, TableName> {
      return new QueryBuilder(db, tableName);
    }
  };
}

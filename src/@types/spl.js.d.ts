declare module 'spl.js' {

    interface ResultSync {
        first: any,
        flat: any[],
        rows: any[],
        cols: string[],
        objs: {}[]
    }

    interface Result {
        first: Promise<any>,
        flat: Promise<any[]>,
        rows: Promise<any[]>,
        cols: Promise<string[]>,
        objs: Promise<{}[]>,
        sync: Promise<ResultSync>,
        free: Promise<void>
    }

    interface MountOptions {
        name: string,
        data: ArrayBuffer | Blob | File | FileList | string
    }

    interface AutoGeoJSON {
        precision: number,
        options: 0 | 1 | 2 | 3 | 4 | 5
    }

    interface Extension {
        extends: 'db' | 'spl',
        fns: { [name: string]: Function }
    }

    interface SplOptions {
        autoJSON: boolean
        autoGeoJSON: AutoGeoJSON
    }

    interface Db {
        attach: (db: string, schema: string) => Db
        detach: (schema: string) => Db
        exec: (sql: string, parameters?: any[] | { [name: string]: any }) => Db
        read: (sql: string) => Db
        load: (src: string) => Db
        save: (dest?: string) => Db
        close: () => Spl
        get: Result
    }

    interface Spl {
        db: (path?: string | ArrayBuffer) => Db
        mount: (path: string, options: MountOptions[]) => Promise<Spl>
        unmount: (string) => Spl
        version: () => Promise<any>
    }

    export default function SPL(options: SplOptions = {}, extensions: Extension[] = []): Promise<Spl>
}
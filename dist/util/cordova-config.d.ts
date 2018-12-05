export interface CordovaProject {
    name?: string;
    id?: string;
    version?: string;
}
export declare let parseConfig: (parsedConfig: any) => CordovaProject;

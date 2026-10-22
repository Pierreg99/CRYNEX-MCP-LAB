export class SuiteClient {base:string;csrf:string;constructor(base?:string);request(path:string,options?:RequestInit):Promise<any>;session():Promise<any>;login(email:string,password:string):Promise<any>;events(projectId:string,onEvent:(event:any)=>void,onReconnect?:()=>void):()=>void;}
export function suiteNavigation(active:string):HTMLElement;

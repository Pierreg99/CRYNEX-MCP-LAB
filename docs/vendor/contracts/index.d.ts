export type Role='owner'|'editor'|'viewer';
export type Template='vanilla'|'react'|'fullstack'|'desktop'|'android';
export type JobKind='generate'|'web-build'|'android-build'|'cryopg-check'|'cryopg-compile'|'cryopg-disasm'|'cryopg-run';
export interface Project {id:string;name:string;repo:string;priority:'P1'|'P2'|'P3';status:'untracked'|'planned'|'active'|'blocked'|'done';tasks:Array<{id:string;title:string;done:boolean}>;revision:number;role:Role}
export interface AssetRef {id:string;project_id:string;name:string;mime:string;size:number;sha256:string}
export interface SceneNode {id:string;name:string;kind:'box'|'sphere'|'plane'|'glb';position:number[];rotation:number[];scale:number[];color:string;assetId?:string}
export interface SceneManifest {version:1;background:string;camera:{position:number[];target:number[]};nodes:SceneNode[]}
export interface Job {id:string;project_id:string;kind:JobKind;state:'queued'|'running'|'succeeded'|'failed'|'cancelled';logs:string;result:unknown}
export interface SuiteEvent {version:1;projectId:string;type:'project:updated'|'scene:updated'|'asset:created'|'job:updated'|'agent:snapshot';timestamp:number;data:unknown}
export const CONTRACT_VERSION:1;
export const MODULES:readonly {id:string;name:string;path:string}[];
export const JOB_KINDS:readonly JobKind[];
export const TEMPLATES:readonly Template[];
export function safePath(value:unknown):string;
export function sceneManifest(value:unknown):SceneManifest;
export function emptyScene():SceneManifest;

import * as ts from 'typescript';
import { BuildContext, Diagnostic } from '../util/interfaces';
/**
 * Ok, so formatting overkill, we know. But whatever, it makes for great
 * error reporting within a terminal. So, yeah, let's code it up, shall we?
 */
export declare function runTypeScriptDiagnostics(context: BuildContext, tsDiagnostics: ts.Diagnostic[]): Diagnostic[];

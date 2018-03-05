import { SassError } from 'node-sass';
import { BuildContext, Diagnostic } from '../util/interfaces';
export declare function runSassDiagnostics(context: BuildContext, sassError: SassError): Diagnostic[];

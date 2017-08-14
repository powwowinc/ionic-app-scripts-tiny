import { ClassDeclaration, Decorator, Node, NodeArray, ObjectLiteralElement, ObjectLiteralExpression, ScriptTarget, SourceFile, SyntaxKind } from 'typescript';
export declare function getTypescriptSourceFile(filePath: string, fileContent: string, languageVersion?: ScriptTarget, setParentNodes?: boolean): SourceFile;
export declare function removeDecorators(fileName: string, source: string): string;
export declare function findNodes(sourceFile: SourceFile, node: Node, kind: SyntaxKind, keepGoing?: boolean): Node[];
export declare function replaceNode(filePath: string, fileContent: string, node: Node, replacement: string): string;
export declare function removeNode(filePath: string, fileContent: string, node: Node): string;
export declare function getNodeStringContent(sourceFile: SourceFile, node: Node): string;
export declare function appendAfter(source: string, node: Node, toAppend: string): string;
export declare function appendEmpty(source: string, position: number, toAppend: string): string;
export declare function appendBefore(filePath: string, fileContent: string, node: Node, toAppend: string): string;
export declare function insertNamedImportIfNeeded(filePath: string, fileContent: string, namedImport: string, fromModule: string): string;
export declare function replaceNamedImport(filePath: string, fileContent: string, namedImportOriginal: string, namedImportReplacement: string): string;
export declare function replaceImportModuleSpecifier(filePath: string, fileContent: string, moduleSpecifierOriginal: string, moduleSpecifierReplacement: string): string;
export declare function checkIfFunctionIsCalled(filePath: string, fileContent: string, functionName: string): boolean;
export declare function getClassDeclarations(sourceFile: SourceFile): ClassDeclaration[];
export declare function getNgModuleClassName(filePath: string, fileContent: string): string;
export declare function getNgModuleDecorator(fileName: string, sourceFile: SourceFile): Decorator;
export declare function getNgModuleObjectLiteralArg(decorator: Decorator): ObjectLiteralExpression;
export declare function findObjectLiteralElementByName(properties: NodeArray<ObjectLiteralElement>, identifierToLookFor: string): ObjectLiteralElement;
export declare function appendNgModuleDeclaration(filePath: string, fileContent: string, declaration: string): string;
export declare function appendNgModuleProvider(filePath: string, fileContent: string, declaration: string): string;
export declare function appendNgModuleExports(filePath: string, fileContent: string, declaration: string): string;

import * as vscode from 'vscode';
import * as parser from 'web-tree-sitter';
import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import { clearTimeout } from 'timers';
import { readFileSync } from 'fs';

// Grammar class
const parserPromise = parser.init();
class Grammar {
    // Parser
    readonly lang: string;
    parser: parser;
    // Grammar
    readonly simpleTerms: { [sym: string]: string } = {};
    readonly complexTerms: string[] = [];
    readonly complexScopes: { [sym: string]: string } = {};
    readonly complexDepth: number;
    readonly complexOrder: boolean;

    constructor(lang: string) {
        // Grammar
        this.lang = lang;
        const grammarFile = __dirname + "/../grammars/" + lang + ".json";
        const grammarJson = jsonc.parse(readFileSync(grammarFile).toString());
        for (const t in grammarJson.simpleTerms)
            this.simpleTerms[t] = grammarJson.simpleTerms[t];
        for (const t in grammarJson.complexTerms)
            this.complexTerms[t] = grammarJson.complexTerms[t];
        for (const t in grammarJson.complexScopes)
            this.complexScopes[t] = grammarJson.complexScopes[t];
        this.complexDepth = 0;
        this.complexOrder = false;
        for (const s in this.complexScopes) {
            const depth = s.split(">").length;
            if (depth > this.complexDepth)
                this.complexDepth = depth;
            if (s.indexOf("[") >= 0)
                this.complexOrder = true;
        }
        this.complexDepth--;
    }

    async init() {
        // Parser
        await parserPromise;
        this.parser = new parser();
        let langFile = path.join(__dirname, "../parsers", this.lang + ".wasm");
        const langObj = await parser.Language.load(langFile);
        this.parser.setLanguage(langObj);
    }
}

// Extension activation
export async function activate(context: vscode.ExtensionContext) {

    // Syntax trees
    let trees: { [doc: string]: parser.Tree } = {};

    // Languages
    const langsFile = __dirname + "/../grammars/langs.json";
    const langsJson = jsonc.parse(readFileSync(langsFile).toString());
    const supportedLangs: string[] = langsJson["languages"];
    const grammars: { [lang: string]: Grammar } = {};

    // Term colors
    const supportedTerms: string[] = [
        "type", "namespace", "function", "variable", "string", "number",
        "punctuation", "comment", "keyword_constant", "keyword_directive",
        "keyword_control", "keyword_operator", "storage_modifier",
    ]
    // Decoration definitions
    const highlightDecors: { [color: string]: vscode.TextEditorDecorationType } = {};
    for (const c of supportedTerms)
        highlightDecors[c] = vscode.window.
            createTextEditorDecorationType({
                color: new vscode.ThemeColor("syntax." + c)
            });
    // Decoration cache
    const decorCache: { [doc: string]: { [color: string]: vscode.Range[] } } = {};

    // Timer to schedule decoration update and refresh
    let updateTimer: NodeJS.Timer | undefined = undefined;
    let refreshTimer: NodeJS.Timer | undefined = undefined;
    console.log('Syntax Highlighter has been activated');

    let visibleEditors = vscode.window.visibleTextEditors;
    let visibleUris: string[] = [];
    let refreshUris: string[] = [];

    function refreshDecor() {
        for (const e of visibleEditors)
        {
            const uri = e.document.uri.toString();
            if (!refreshUris.includes(uri))
                continue;
            if (!(uri in decorCache))
                continue;
            const decorations = decorCache[uri];
            for (const c in decorations)
                e.setDecorations(highlightDecors[c], decorations[c]);
        }
        refreshUris = [];
     }

    function enqueueDecorRefresh() {
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = undefined;
        }
        refreshTimer = setTimeout(refreshDecor, 20);
    }

    function buildDecor(doc: vscode.TextDocument) {
        const uri = doc.uri.toString();
        if (!(uri in trees))
            return;
        const grammar = grammars[doc.languageId];

        // Decorations
        let decorations: { [color: string]: vscode.Range[] } = {};
        for (const c in highlightDecors)
            decorations[c] = [];

        // Travel tree and make decorations
        let stack: parser.SyntaxNode[] = [];
        let node = trees[uri].rootNode.firstChild;
        while (stack.length > 0 || node) {
            // Go deeper
            if (node) {
                stack.push(node);
                node = node.firstChild;
            }
            // Go back
            else {
                node = stack.pop();
                let type = node.type;
                if (!node.isNamed)
                    type = '"' + type + '"';

                // Simple one-level terms
                let color: string | undefined = undefined;
                if (!grammar.complexTerms.includes(type)) {
                    color = grammar.simpleTerms[type];
                }
                // Complex terms require multi-level analyzes
                else {
                    // Build complex scopes
                    let desc = type;
                    let scopes = [desc];
                    let parent = node.parent;
                    for (let i = 0; i < grammar.complexDepth && parent; i++) {
                        let parentType = parent.type;
                        if (!parent.isNamed)
                            parentType = '"' + parentType + '"';
                        desc = parentType + " > " + desc;
                        scopes.push(desc);
                        parent = parent.parent;
                    }
                    // If there is also order complexity
                    if (grammar.complexOrder)
                    {
                        let index = 0;
                        let sibling = node.previousSibling;
                        while (sibling) {
                            if (sibling.type === node.type)
                                index++;
                            sibling = sibling.previousSibling;
                        }

                        let rindex = -1;
                        sibling = node.nextSibling;
                        while (sibling) {
                            if (sibling.type === node.type)
                                rindex--;
                            sibling = sibling.nextSibling;
                        }

                        let orderScopes: string[] = [];
                        for (let i = 0; i < scopes.length; i++)
                            orderScopes.push(scopes[i], scopes[i] + "[" + index + "]",
                                                        scopes[i] + "[" + rindex + "]");
                        scopes = orderScopes;
                    }
                    // Use most complex scope
                    for (const d of scopes)
                        if (d in grammar.complexScopes)
                            color = grammar.complexScopes[d];
                }

                // If term is found add decoration
                if (color in highlightDecors) {
                    decorations[color].push(new vscode.Range(
                        new vscode.Position(
                            node.startPosition.row,
                            node.startPosition.column),
                        new vscode.Position(
                            node.endPosition.row,
                            node.endPosition.column)));
                }

                // Go right
                node = node.nextSibling
            }
        }

        // Cache and refresh decorations
        decorCache[uri] = decorations;
        if (!refreshUris.includes(uri))
            refreshUris.push(uri);
    }

    function updateDecor() {
        for (const e of visibleEditors) {
            const uri = e.document.uri.toString();
            if (!(uri in trees))
                continue;
            if (uri in decorCache)
                continue;
            buildDecor(e.document);
        }
        if (refreshUris.length > 0)
            enqueueDecorRefresh();
    }

    function enqueueDecorUpdate() {
        if (updateTimer) {
            clearTimeout(updateTimer);
            updateTimer = undefined;
        }
        updateTimer = setTimeout(updateDecor, 20);
    }

    async function initTree(doc: vscode.TextDocument) {
        const lang = doc.languageId;
        if (!supportedLangs.includes(lang))
            return;
        if (!(lang in grammars)) {
            grammars[lang] = new Grammar(lang);
            await grammars[lang].init();
        }
        const uri = doc.uri.toString();
        trees[uri] = grammars[lang].parser.parse(doc.getText());
        enqueueDecorUpdate();
    }

    function updateTree(doc: vscode.TextDocument, edits: parser.Edit[]) {
        const uri = doc.uri.toString();
        const lang = doc.languageId;
        if (!(uri in trees))
            return;

        // Update tree
        for (const e of edits)
            trees[uri].edit(e);
        trees[uri] = grammars[lang].parser.parse(doc.getText(), trees[uri])

        // Invalidate decoration cache and enqueue update
        delete decorCache[uri];
        if (visibleUris.includes(uri))
            enqueueDecorUpdate();
    }

    for (const doc of vscode.workspace.textDocuments)
        await initTree(doc);
    enqueueDecorUpdate();

    vscode.workspace.onDidOpenTextDocument(async doc => {
        await initTree(doc);
    }, null, context.subscriptions)

    vscode.workspace.onDidCloseTextDocument(doc => {
        const uri = doc.uri.toString();
        delete trees[uri];
        delete decorCache[uri];
        if (refreshUris.includes(uri))
            refreshUris.splice(refreshUris.indexOf(uri), 1);
    }, null, context.subscriptions)

    vscode.workspace.onDidChangeTextDocument(event => {
        const uri = event.document.uri.toString();
        if (!(uri in trees))
            return;
        if (event.contentChanges.length < 1)
            return;

        let changes: parser.Edit[] = [];
        for (const c of event.contentChanges) {
            const startPos0 = c.range.start;
            const startIndex0 = event.document.offsetAt(startPos0);
            const endPos0 = c.range.end;
            const endIndex0 = startIndex0 + c.rangeLength;
            const endIndex1 = startIndex0 + c.text.length;
            const endPos1 = event.document.positionAt(endIndex1);

            changes.push({
                startIndex: startIndex0,
                oldEndIndex: endIndex0,
                newEndIndex: endIndex1,
                startPosition: { row: startPos0.line, column: startPos0.character },
                oldEndPosition: { row: endPos0.line, column: endPos0.character },
                newEndPosition: { row: endPos1.line, column: endPos1.character }
            });
        }

        updateTree(event.document, changes);
    }, null, context.subscriptions);

    vscode.window.onDidChangeVisibleTextEditors(editors => {
        // Flag refresh for new editors
        let needUpdate = false;
        for (const e of editors) {
            const uri = e.document.uri.toString();
            if (visibleEditors.includes(e))
                continue;
            if (!refreshUris.includes(uri))
                refreshUris.push(uri);
            if (uri in trees)
                needUpdate = true;
        }

        // Set visible editors
        visibleEditors = editors;
        visibleUris = [];
        for (const e of visibleEditors) {
            const uri = e.document.uri.toString();
            if (!visibleUris.includes(uri))
                visibleUris.push(uri);
        }

        // Enqueue refresh if required
        if (needUpdate)
            enqueueDecorUpdate();
    }, null, context.subscriptions);

}

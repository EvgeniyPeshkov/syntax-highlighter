import * as vscode from 'vscode';
import * as parser from 'web-tree-sitter';
import * as jsonc from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';
import { clearTimeout } from 'timers';

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
    readonly complexDepth: number = 0;
    readonly complexOrder: boolean = false;

    // Constructor
    constructor(lang: string) {
        // Parse grammar file
        this.lang = lang;
        const grammarFile = __dirname + "/../grammars/" + lang + ".json";
        const grammarJson = jsonc.parse(fs.readFileSync(grammarFile).toString());
        for (const t in grammarJson.simpleTerms)
            this.simpleTerms[t] = grammarJson.simpleTerms[t];
        for (const t in grammarJson.complexTerms)
            this.complexTerms[t] = grammarJson.complexTerms[t];
        for (const t in grammarJson.complexScopes)
            this.complexScopes[t] = grammarJson.complexScopes[t];
        for (const s in this.complexScopes) {
            const depth = s.split(">").length;
            if (depth > this.complexDepth)
                this.complexDepth = depth;
            if (s.indexOf("[") >= 0)
                this.complexOrder = true;
        }
        this.complexDepth--;
    }

    // Parser initialization
    async init() {
        // Load wasm parser
        await parserPromise;
        this.parser = new parser();
        let langFile = path.join(__dirname, "../parsers", this.lang + ".wasm");
        const langObj = await parser.Language.load(langFile);
        this.parser.setLanguage(langObj);
    }

    // Build syntax tree
    tree(doc: string) {
        return this.parser.parse(doc);
    }

    // Parse syntax tree
    parse(tree: parser.Tree) {
        // Travel tree and peek terms
        let terms: { term: string; range: vscode.Range }[] = [];
        let stack: parser.SyntaxNode[] = [];
        let node = tree.rootNode.firstChild;
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
                if (!node.isNamed())
                    type = '"' + type + '"';

                // Simple one-level terms
                let term: string | undefined = undefined;
                if (!this.complexTerms.includes(type)) {
                    term = this.simpleTerms[type];
                }
                // Complex terms require multi-level analyzes
                else {
                    // Build complex scopes
                    let desc = type;
                    let scopes = [desc];
                    let parent = node.parent;
                    for (let i = 0; i < this.complexDepth && parent; i++) {
                        let parentType = parent.type;
                        if (!parent.isNamed())
                            parentType = '"' + parentType + '"';
                        desc = parentType + " > " + desc;
                        scopes.push(desc);
                        parent = parent.parent;
                    }
                    // If there is also order complexity
                    if (this.complexOrder)
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
                        if (d in this.complexScopes)
                            term = this.complexScopes[d];
                }

                // If term is found add it
                if (term) {
                    terms.push({
                        term: term,
                        range: new vscode.Range(
                            new vscode.Position(
                                node.startPosition.row,
                                node.startPosition.column),
                            new vscode.Position(
                                node.endPosition.row,
                                node.endPosition.column))
                    });
                }
                // Go right
                node = node.nextSibling
            }
        }
        return terms;
    }
}

// Language grammars
const grammars: { [lang: string]: Grammar } = {};
// Syntax trees
let trees: { [doc: string]: parser.Tree } = {};

// Semantic token legend
const termMap = new Map<string, { type: string, modifiers?: string[] }>();
function buildLegend() {
    // Terms vocabulary
    termMap.set("type", { type: "type" });
    termMap.set("scope", { type: "namespace" });
    termMap.set("function", { type: "function" });
    termMap.set("variable", { type: "variable" });
    termMap.set("number", { type: "number" });
    termMap.set("string", { type: "string" });
    termMap.set("comment", { type: "comment" });
    termMap.set("constant", { type: "variable", modifiers: ["readonly", "defaultLibrary"] });
    termMap.set("directive", { type: "macro" });
    termMap.set("control", { type: "keyword" });
    termMap.set("operator", { type: "operator" });
    termMap.set("modifier", { type: "type", modifiers: ["modification"] });
    termMap.set("punctuation", { type: "label" });
    // Tokens and modifiers in use
    let tokens: string[] = [];
    let modifiers: string[] = [];
    termMap.forEach(t => {
        if (!tokens.includes(t.type))
            tokens.push(t.type);
        t.modifiers?.forEach(m => {
            if (!modifiers.includes(m))
                modifiers.push(m);
        });
    });
    // Construct semantic token legend
    return new vscode.SemanticTokensLegend(tokens, modifiers);
}
const legend = buildLegend();

// Syntax scope for node in position
let debugDepth = -1;
function scopeInfo(doc: vscode.TextDocument, pos: vscode.Position) {
    const uri = doc.uri.toString();
    if (!(uri in trees))
        return null;
    const grammar = grammars[doc.languageId];

    const xy: parser.Point = { row: pos.line, column: pos.character };
    let node = trees[uri].rootNode.descendantForPosition(xy);
    if (!node)
        return null;

    let type = node.type;
    if (!node.isNamed())
        type = '"' + type + '"';
    let parent = node.parent;

    const depth = Math.max(grammar.complexDepth, debugDepth);
    for (let i = 0; i < depth && parent; i++) {
        let parentType = parent.type;
        if (!parent.isNamed())
            parentType = '"' + parentType + '"';
        type = parentType + " > " + type;
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

        type = type + "[" + index + "]" + "[" + rindex + "]";
    }

    return {
        contents: [type],
        range: new vscode.Range(
            node.startPosition.row, node.startPosition.column,
            node.endPosition.row, node.endPosition.column)
    };
}


// Semantic token provider
class TokensProvider implements vscode.DocumentSemanticTokensProvider {
    readonly grammars: { [lang: string]: Grammar } = {};
    readonly supportedLangs: string[] = [];
    readonly supportedTerms: string[] = [];

    constructor() {
        // Languages
        let availableGrammars: string[] = [];
        fs.readdirSync(__dirname + "/../grammars/").forEach(name => {
            availableGrammars.push(path.basename(name, ".json"));
        });

        let availableParsers: string[] = [];
        fs.readdirSync(__dirname + "/../parsers/").forEach(name => {
            availableParsers.push(path.basename(name, ".wasm"));
        });

        const enabledLangs: string[] = vscode.workspace.
            getConfiguration("syntax").get("highlightLanguages");
        availableGrammars.forEach(lang => {
            if (availableParsers.includes(lang) && enabledLangs.includes(lang))
                this.supportedLangs.push(lang);
        });

        // Terms
        const availableTerms: string[] = [
            "type", "scope", "function", "variable", "number", "string", "comment",
            "constant", "directive", "control", "operator", "modifier", "punctuation",
        ];
        const enabledTerms: string[] = vscode.workspace.
            getConfiguration("syntax").get("highlightTerms");
        availableTerms.forEach(term => {
            if (enabledTerms.includes(term))
                this.supportedTerms.push(term);
        });
        if (!vscode.workspace.getConfiguration("syntax").get("highlightComment"))
            if (this.supportedTerms.includes("comment"))
                this.supportedTerms.splice(this.supportedTerms.indexOf("comment"), 1);
    }

    // Provide document tokens
    async provideDocumentSemanticTokens(
        doc: vscode.TextDocument,
        token: vscode.CancellationToken): Promise<vscode.SemanticTokens>
    {
        // Grammar
        const lang = doc.languageId;
        if (!this.supportedLangs.includes(lang))
            return null;
        if (!(lang in grammars)) {
            grammars[lang] = new Grammar(lang);
            await grammars[lang].init();
        }
        // Parse document
        const grammar = grammars[lang];
        const tree = grammar.tree(doc.getText());
        const terms = grammar.parse(tree);
        // Build tokens
        const builder = new vscode.SemanticTokensBuilder(legend);
        terms.forEach((t) => {
            if (!this.supportedTerms.includes(t.term))
                return;
            builder.push(t.range, termMap.get(t.term).type, termMap.get(t.term).modifiers);
        })
        return builder.build();
    }
}


// Extension activation
export async function activate(context: vscode.ExtensionContext) {

    // Languages
    let availableGrammars: string[] = [];
    fs.readdirSync(__dirname + "/../grammars/").forEach(name => {
        availableGrammars.push(path.basename(name, ".json"));
    });

    let availableParsers: string[] = [];
    fs.readdirSync(__dirname + "/../parsers/").forEach(name => {
        availableParsers.push(path.basename(name, ".wasm"));
    });

    const enabledLangs: string[] =
        vscode.workspace.getConfiguration("syntax").get("highlightLanguages");
    let supportedLangs: string[] = [];
    availableGrammars.forEach(lang => {
        if (availableParsers.includes(lang) && enabledLangs.includes(lang))
            supportedLangs.push(lang);
    });

    // Term colors
    const availableTerms: string[] = [
        "type", "scope", "function", "variable", "number", "string", "comment",
        "constant", "directive", "control", "operator", "modifier", "punctuation",
    ];
    const enabledTerms: string[] =
        vscode.workspace.getConfiguration("syntax").get("highlightTerms");
    let supportedTerms: string[] = [];
    availableTerms.forEach(term => {
        if (enabledTerms.includes(term))
            supportedTerms.push(term);
    });
    if (!vscode.workspace.getConfiguration("syntax").get("highlightComment"))
        if (supportedTerms.includes("comment"))
            supportedTerms.splice(supportedTerms.indexOf("comment"), 1);

    // Debug depth
    debugDepth = vscode.workspace.getConfiguration("syntax").get("debugDepth");

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
    console.log('{Syntax Highlighter} has been activated');

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
        // Document syntax tree
        const uri = doc.uri.toString();
        if (!(uri in trees))
            return;
        // Parse syntax tree
        const grammar = grammars[doc.languageId];
        const terms = grammar.parse(trees[uri]);
        // Decorations
        let decorations: { [color: string]: vscode.Range[] } = {};
        for (const c in highlightDecors)
            decorations[c] = [];
        // Add decorations for terms
        for (const t of terms)
            if (t.term in highlightDecors)
                decorations[t.term].push(t.range);
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
        trees[uri] = grammars[lang].tree(doc.getText());
        enqueueDecorUpdate();
    }

    function updateTree(doc: vscode.TextDocument) {
        const uri = doc.uri.toString();
        const lang = doc.languageId;
        if (!(uri in trees))
            return;

        // Update tree
        trees[uri] = grammars[lang].tree(doc.getText())

        // Invalidate decoration cache and enqueue update
        delete decorCache[uri];
        if (visibleUris.includes(uri))
            enqueueDecorUpdate();
    }


    // Create trees for already opened documents
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
        updateTree(event.document);
    }, null, context.subscriptions);


    // Enumerate already visible editors
    visibleEditors = vscode.window.visibleTextEditors;
    visibleUris = [];
    for (const e of visibleEditors) {
        const uri = e.document.uri.toString();
        if (!visibleUris.includes(uri))
            visibleUris.push(uri);
    }

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

    // Register debug hover providers
    // Very useful tool for implementation and fixing of grammars
    if (vscode.workspace.getConfiguration("syntax").get("debugHover"))
        for (const lang of supportedLangs)
            vscode.languages.registerHoverProvider(lang, { provideHover: scopeInfo });

}

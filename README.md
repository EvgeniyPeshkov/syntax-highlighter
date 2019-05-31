# Syntax Highlighter for VSCode

#### Syntax highlighter based on [Tree-Sitter](https://tree-sitter.github.io/tree-sitter/).

#### Languages:
* C++
* C
* Python
* TypeScript
* JavaScript
* Go
* Rust
* Php
* More to come...

#### Description

Provides universal syntax coloring engine for almost any programming language.
See [list of currently supported languages](#languages) above. Under the hood
the extension utilizes VSCode Decoration API to override syntax coloring provided
by standard TextMate regex matching. Constructing entire syntax tree, Tree-sitter
efficiently overcomes all limitations of built-in TextMate grammars. Being
context-aware, it's able to parse complex language structures providing complete
coverage of source code. Incremental parsing system ensures high performance.
All these advantages enable accurate and consistent syntax highlighting.

## Customization

Syntax Highlighter exposes a number of settings to assign theme colors to syntax terms.
For simple and straightforward customization, we keep a number of syntax terms small,
namely: *type*, *function*, *variable*, *string*, *number*, *comment*, an some others.
They are presented under `syntax` sub-section of
[`workbench.colorCustomizations`](https://code.visualstudio.com/api/references/theme-color)
in `settings.json`. Autocomplete may be used to discover customizable colors.
They also provide short description on hover. Complete list of settings can be found
in `Contributions` tab. To redefine syntax colors for [Visual Studio Dark] theme, put
the following into `settings.json`:

    "workbench.colorCustomizations": {
        "[Visual Studio Dark]": {
            "syntax.type": "#26A69A",
            "syntax.scope": "#00897B",
            "syntax.function": "#00BCD4",
            "syntax.variable": "#42A5F5",
            "syntax.number": "#90A4AE",
            "syntax.string": "#90A4AE",
            "syntax.comment": "#546E7A",
            "syntax.constant": "#A89F9B",
            "syntax.directive": "#7E57C2",
            "syntax.control": "#7986CB",
            "syntax.operator": "#9575CD",
            "syntax.modifier": "#00897B",
            "syntax.punctuation": "#A1887F",
        }
    },

For consistency with built-in TextMate grammars, the same colors can be provided
for corresponding TextMate scopes. Or backwards, one can port colors from TextMate
to Syntax Highlighter. In most cases there is one to one match. For example, for
C++: `syntax.function = entity.name.function` or `syntax.number = constant.numeric`.
Current TextMate colors can be discovered using `Ctrl + Shift + P -> Developer:
Generate Color Theme...`, in generated theme file address `tokenColors` section.
The following settings synchronize TextMate colors with Syntax Highlighter for C++:

    "editor.tokenColorCustomizations": {
        "[Visual Studio Dark]": {
            "types": "#26A69A",
            "functions": "#00BCD4",
            "variables": "#42A5F5",
            "numbers": "#90A4AE",
            "strings": "#90A4AE",
            "comments": "#546E7A",
            "keywords": "#7986CB",
            "textMateRules": [
                {
                    "scope": "storage.type",
                    "settings": {"foreground": "#26A69A"}
                },
                {
                    "scope": "entity.name.function",
                    "settings": {"foreground": "#00BCD4"}
                },
                {
                    "scope": [
                        "meta.function-call",
                        "source.cpp meta.block variable.other"
                    ],
                    "settings": {"foreground": "#42A5F5"}
                },
                {
                    "scope": "constant.numeric",
                    "settings": {"foreground": "#90A4AE"}
                },
                {
                    "scope": "comment",
                    "settings": {"foreground": "#546E7A"}
                },
                {
                    "scope": [
                        "constant.language",
                        "variable.language"
                    ],
                    "settings": {"foreground": "#A89F9B"}
                },
                {
                    "scope": "keyword.control",
                    "settings": {"foreground": "#7986CB"}
                },
                {
                    "scope": "keyword.operator",
                    "settings": {"foreground": "#9575CD" }
                },
                {
                    "scope": "storage.modifier",
                    "settings": {"foreground": "#00897B"}
                },
                {
                    "scope": "punctuation",
                    "settings": {"foreground": "#A1887F"}
                },
            ]
        }
    },

## [Build](BUILD.md)

Syntax Highlighter extension depends on certain Tree-sitter modules.
They are [native Node.js modules](https://nodejs.org/api/addons.html)
that require a compilation for particular architecture, OS and version
of Node.js. Refer to [BUILD.md](BUILD.md) for instructions.

## [Contribute](CONTRIBUTING.md)

The best way to contribute is to implement support of new languages. Extension
improvements are also welcome. Refer to [CONTRIBUTE.md](CONTRIBUTE.md) for details.

## [ToDo](TODO.md)

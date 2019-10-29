# Syntax Highlighter Change Log

## **Version 0.4.1**
#### New programming languages:
* ShellScript/Bash


## **Version 0.4.0**
#### New programming languages:
* TypeScript React (TSX)


## **Version 0.3.8**
#### Changes:
* Update core *vscode* and *typescript* packages
* Update core *tree-sitter* packages
* Update *typescript*, *go*, *ruby* and *lua* parsers


## **Version 0.3.7**
#### Changes:
* Update *tree-sitter-python* parser
* Update *vsce* module
* Fix: doesn't work when VSCode is installed on D:\ (#30)


## **Version 0.3.6**
#### Changes:
* Update core *tree-sitter* modules
* Rust: fix use declarations (#29)
* Rust: update *tree-sitter-rust*
* Debug: tool-tip with syntax scope on hover


## **Version 0.3.5**
#### Changes:
* [Setting to enable/disable languages](README.md#syntaxhighlightlanguages)


## **Version 0.3.4**
#### Changes:
* Rust: fix highlighting of module consts (#17)
* Rust: highlighting of `=>` operator
* TS/JS: highlighting of `this` keyword


## **Version 0.3.3**
#### Changes:
* The latest versions of *tree-sitter-cpp/c*
* C++: fix highlighting of `virtual` method definitions
* C++: fix highlighting of `delete` in method definitions
* C++: fix highlighting of `throw` expressions
* C++/C: highlighting of `__attribute__` as *modifier*


## **Version 0.3.2**
#### Changes:
* Go: highlighting of punctuation
* Go: highlighting of `[` and `]`
* Go: highlighting of `&^` and `&^=` operators
* Demo for Go in README.md


## **Version 0.3.1**
#### Changes:
* Demo of {Syntax Highlighter} in README.md
* C++: highlighting of `noexcept` keyword
* C++: highlighting of operator definitions (e.g. `operator!()`)
* C++: highlighting `default` as *modifier* instead of *control*


## **Version 0.3.0**
#### New programming languages:
* Ruby


## **Version 0.2.9**
#### Changes:
* Fix corruption of highlighting on multi-line edits (including formatting and renaming)
* `syntax.highlightComment` setting to optionally disable highlighting of comments
* Update dependency packages


## **Version 0.2.8**
#### New programming languages:
* Lua


## **Version 0.2.7**
#### New programming languages:
* PHP

#### Fixes:
* TypeScript and Javascript highlighting has been fixed
* In Rust "_" is highlighted as variable
* Internal improvements


## **Version 0.2.6**
#### Changes:
* More consistent names of syntax terms
* Internal improvements

#### !!!Attention!!!
This release changes names of some syntax terms.
I apologize to all current users, who has already tuned colors, for this inconvenience.

Please rename {Syntax Highlighter} colors in `settings.json` the following way:
* `"syntax.namespace" -> "syntax.scope"`
* `"syntax.keyword_constant" -> "syntax.constant"`
* `"syntax.keyword_directive" -> "syntax.directive"`
* `"syntax.keyword_control" -> "syntax.control"`
* `"syntax.keyword_operator" -> "syntax.operator"`
* `"syntax.storage_modifier" -> "syntax.modifier"`


## **Version 0.2.5**
#### Fixed bugs:
* Terms like directives and operators stopped to be colored by {Syntax Highlighter}
* Highlighting is not updated in editors, opened on startup, until switch tab


## **Version 0.2.4**
#### Even better Rust
Thanks to [@Geobert](https://github.com/Geobert) ones again.


## **Version 0.2.3**
#### Much better Rust
Huge thanks to [@Geobert](https://github.com/Geobert) for contribution.


## **Version 0.2.2**
#### New programming languages:
* Rust


## **Version 0.2.1**
#### New programming languages:
* Python


## **Version 0.2.0**
### **Cross-platform support.**
**Huge thanks to [@jeff-hykin](https://github.com/jeff-hykin) for providing the right solution.**

There is no need to download .vsxi package for your OS from
[Github page](https://github.com/EvgeniyPeshkov/syntax-highlighter/releases) anymore.
Cross-platform version in Marketplace fits any OS and architecture.


## **Version 0.1.1**
#### New programming languages:
* Go
* TypeScript
* JavaScript


## **Version 0.1.0**
### Initial version

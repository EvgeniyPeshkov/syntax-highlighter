# Build instructions

In general, {Syntax Highlighter} extension is built the same way as
[any other VSCode extension](https://code.visualstudio.com/api/extension-guides/overview).
{Syntax Highlighter} utilizes [WebAssembly bindings to the Tree-sitter parsing library](
https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web).
All language parsers are therefore [compiled to binary .wasm modules](
https://github.com/tree-sitter/tree-sitter/tree/master/lib/binding_web#generate-wasm-language-files).
This is done by postinstall hook when you call `npm install` as usual.
See [build.js](scripts/build.js) script for details.

To build .wasm you'll need Emscripten SDK. Installation instructions can be found [here](
https://emscripten.org/docs/getting_started/downloads.html) or [here](
https://webassembly.org/getting-started/developers-guide/).
Or you can use docker. *tree-sitter-cli* will try to deploy [trzeci/emscripten-slim](
https://hub.docker.com/r/trzeci/emscripten-slim/) image as fallback when `emcc` isn't found.

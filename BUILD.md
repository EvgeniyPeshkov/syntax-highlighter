# Build instructions

In general, Syntax Highlighter extension is built the same way as
[any other extension](https://code.visualstudio.com/api/extension-guides/overview).
But dependence on [native Node.js modules](https://nodejs.org/api/n-api.html) slightly
complicates the process. First, you'll require *C/C++ compiler* and *Python v2*. Second,
you need to compile against version of Node.js/Electron used by VS Code.

Native addons are compiled by [node-gyp](https://github.com/nodejs/node-gyp).
Complete list of required tools to install and corresponding instructions can
be found [here](https://github.com/nodejs/node-gyp#installation). Instructions
on how to compile native modules for particular Electron version can be found
[on this page](https://electronjs.org/docs/tutorial/using-native-node-modules).
You will also need to determine version of Electron that VS Code is built with.

## Prepare:
1. Download and install [Node.js](https://nodejs.org/en/download/).
2. Install all [node-gyp requirements](https://github.com/nodejs/node-gyp#installation).
3. Open VS Code.
4. Execute `Ctrl + Shift + P -> Developer: Toggle Developer Tools`.
5. Go to `Console` tab and enter `process.versions.electron`.
6. Remember the obtained version, e.g. "3.1.8".

## Build:
1. Clone or download extension from [GitHub](https://github.com).
2. Open extension project folder in VSCode.
3. Open terminal `Ctrl + '`.
4. Type `npm install --target=3.1.8 --runtime=electron --disturl=https://atom.io/download/electron`
   to download, install or compile all dependencies. Provide your Electron version in `--target`.
5. Now you can debug Syntax Highlighter extension as usual by `F5`.
6. To package extension into .vsix, type `node .\node_modules\vsce\out\vsce package` in terminal.

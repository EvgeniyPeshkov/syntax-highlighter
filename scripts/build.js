#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Languages
let langs = [];
fs.readdirSync(__dirname + "/../grammars/").forEach(name => {
    langs.push(path.basename(name, ".json"));
});

// Build wasm parsers for supported languages
const parsersDir = __dirname + "/../parsers";
if (!fs.existsSync(parsersDir)) {
    fs.mkdirSync(parsersDir);
}
for (li of langs) {
    const l = li;
    console.log("Compiling " + l + " parser");
    exec('node_modules/.bin/tree-sitter build-wasm node_modules/tree-sitter-' + l,
        (err) => {
            if (err)
                console.log("Failed to build wasm for " + l + ": " + err.message);
            else
                fs.rename("tree-sitter-" + l + ".wasm", "parsers/" + l + ".wasm",
                    (err) => {
                        if (err)
                            console.log("Failed to copy built parser: " + err.message);
                        else
                            console.log("Successfully compiled " + l + " parser");
                    });
        });
}

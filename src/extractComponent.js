import path from 'path';
import fs from 'fs';

function isAbsolute (form) {
    return path.isAbsolute(form);
}
function resolve (...paths) {
    return path.resolve(...paths);
}

function getUsingComponents (content, compilation) {
    try {
        return JSON.parse(content)['usingComponents'];
    } catch (e) {
        compilation.errors.push(e);
    }
}

const jsonRE = /\/.+\.json$/;
function getFileDir (file) { // must be json file
    return file.slice(0, file.lastIndexOf('/'));
}
// function getComponents (assets, compilation) {
//     const file = Object.keys(assets).find(f => jsonRE.test(f));
//     let components = [];
//     if (file) {
//         let names = getUsingComponents(assets[file].source(), compilation);
//         if (names) {
//             components = Object.keys(names).map(name => names[name]);
//         }
//     }
//     return components;
// }

function generatorPattern (from, to) {
    if (fs.existsSync(from)) {
        return {
            from,
            to,
            fromType: 'dir'
        };
    } else if (fs.existsSync(`${from}.js`)) {
        let fromDir = getFileDir(from);
        return {
            from: fromDir,
            to: getFileDir(to),
            test: new RegExp(`${from.replace(fromDir).slice(1)}.(json|js|wxml|wxss)$`)
        };
    }
}

export default function extractComponent (compilation) {
    const { entries } = compilation;
    const projectContext = compilation.options.context;
    let patterns = [];
    for (let i = 0; i < entries.length; i++) {
        let context = entries[i].context;
        let assets = entries[i].assets;

        // 从 assets 获取所有 components 路径
        const file = Object.keys(assets).find(f => jsonRE.test(f));
        let components = [];
        if (file) {
            let names = getUsingComponents(assets[file].source(), compilation);
            if (names) {
                components = Object.keys(names).map(name => names[name]);
            }
        }

        for (let j = 0; j < components.length; j++) {
            let path = components[j];
            if (path) {
                let from = isAbsolute(path)
                    ? `${projectContext}${path}`
                    : resolve(context, path);

                let to = isAbsolute(path)
                    ? path
                    : resolve(`/${getFileDir(file)}`, path);
                to = to.slice(1); // 去除 / 绝对定位参照

                let pattern = generatorPattern(from, to);
                if (pattern) patterns.push(pattern);
            }
        }
    }

    return patterns;
}

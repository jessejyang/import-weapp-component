import path from 'path';
import fs from 'fs';

let globalCompilation // 主要用于`errors.push`

function isAbsolute (form) {
    return path.isAbsolute(form);
}
function resolve (...paths) {
    return path.resolve(...paths);
}

function getUsingComponents (content) {
    try {
        return JSON.parse(content)['usingComponents'] || {}; // 防止返回undefined
    } catch (e) {
        globalCompilation.errors.push(e);
        return {} // 解析出错，返回空
    }
}

const jsonRE = /\/.+\.json$/;
function getFileDir (file) { // must be json file
    return file.slice(0, file.lastIndexOf('/'));
}
function getFileName (path) {
    return path.slice(path.lastIndexOf('/') + 1)
}

function addComponents (info, components, parent) { // info: <path | json>
  if (fs.existsSync(info)) { // path read file
    info = fs.readFileSync(info, 'utf8')
  }
  let names = getUsingComponents(info);
  components.push(...Object.keys(names).map(name => parent ? resolve(parent, names[name]) : names[name]));
}

function generatorPattern (from, to, components, parent) {
    if (fs.existsSync(from)) {
        addComponents(`${from}/index.json`, components, getFileDir(parent))
        return {
            from,
            to,
            fromType: 'dir'
        };
    } else if (fs.existsSync(`${from}.js`)) {
        let fromDir = getFileDir(from);
        let fileName = getFileName(from);
        addComponents(`${from}.json`, components, getFileDir(parent))
        return {
            from: fromDir,
            to: getFileDir(to),
            test: new RegExp(`${fileName}.(json|js|wxml|wxss)$`)
        };
    }
}

export default function extractComponent (compilation) {
    globalCompilation = compilation
    const { entries, options: { context: projectContext } } = compilation;

    let patterns = [];
    for (let i = 0; i < entries.length; i++) {
        let context = entries[i].context;
        let assets = entries[i].assets;

        // 从 assets 获取所有 components 路径
        const file = Object.keys(assets).find(f => jsonRE.test(f));
        let components = [];
        if (file) {
            addComponents(assets[file].source(), components)
        }

        for (let j = 0; j < components.length; j++) {
            let path = components[j];
            if (path) {
                let from = isAbsolute(path)
                    ? `${projectContext}${path}`
                    : resolve(context, path);

                let to = isAbsolute(path)
                    ? path
                    : resolve(`/${getFileDir(file)}`, path); // 以输出路径为最上级路径
                to = to.slice(1); // 去除 / 绝对定位参照

                let pattern = generatorPattern(from, to, components, components[j]);
                if (pattern) patterns.push(pattern);
            }
        }
    }

    return patterns;
}

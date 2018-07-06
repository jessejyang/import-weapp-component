import path, { isAbsolute, resolve } from 'path';
import fs from 'fs';

let globalCompilation; // 主要用于`errors.push`

const jsonRE = /\/.+\.json$/;
function getPathParse (filePath) {
    return path.parse(filePath);
}
function getFileDir (path) { // must be json file
    return getPathParse(path).dir;
}
// function getFileName (path) {
//     return getPathParse(path).name;
// }

function pushError (err) {
    err = typeof err === 'string' ? new Error(err) : err;
    globalCompilation.errors.push(err);
}

function getUsingComponents (content, filePath) {
    try {
        let json = JSON.parse(content);
        return json['usingComponents'] || {}; // 防止返回undefined
    } catch (e) {
        pushError(`${filePath} is not json`);
        return {}; // 解析出错，返回空
    }
}

function addComponents (content, components, parent) {
    components.push(...Object.keys(content).map(name => parent ? path.join(parent, content[name]) : content[name]));
}

function addComponentsFromJson (json, components, parent, filePath) {
    const content = getUsingComponents(json, filePath);
    addComponents(content, components, parent);
}

function addComponentsFromPath (path, components, parent) {
    if (fs.existsSync(path)) {
        let json = fs.readFileSync(path, 'utf8');
        addComponentsFromJson(json, components, parent, path);
    } else {
        pushError(`Component is not found in path "${path}"(not found json)`);
    }
}

function generatorPattern (from, to, components, parent) {
    // 删除此情况，因为小程序不支持直接目录引入组件
    // if (fs.existsSync(from)) {
    //     addComponentsFromPath(`${from}/index.json`, components, getFileDir(parent));
    //     return {
    //         from,
    //         to,
    //         fromType: 'dir'
    //     };
    // } else 
    const { dir: fromDir, name: fromName } = getPathParse(from);
    // 为了与小程序保持一致，仅判断`from.js`是否存在
    if (fs.existsSync(`${from}.js`)) {
        addComponentsFromPath(`${fromDir}/${fromName}.json`, components, getFileDir(parent));
        return {
            from: fromDir,
            to: getFileDir(to),
            test: new RegExp(`${fromName}.(json|js|wxml|wxss)$`)
        };
    } else {
        pushError(`Component is not found in path "${from}"(not found js)`);
    }
}

export default function extractComponent (compilation) {
    globalCompilation = compilation;
    let patterns = [];

    const entries = compilation.entries || [];
    const projectContext = (compilation.options || {}).context || '';

    if (entries.length && projectContext) {
        for (let i = 0; i < entries.length; i++) {
            let context = entries[i].context;
            let assets = entries[i].assets;
    
            // 从 assets 获取所有 components 路径
            const file = Object.keys(assets).find(f => jsonRE.test(f));
            let components = [];
            if (file) {
                addComponentsFromJson(assets[file].source(), components, null, file);
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
    }

    return patterns;
}

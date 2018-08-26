import globby from 'globby';
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

function getNativePattern (from, to) {
    const { dir: fromDir } = getPathParse(from);
    return {
        from: fromDir,
        to: getFileDir(to),
        ignore: [ '**/*.!(js|json|wxss|wxml)' ]
    };
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
        return getNativePattern(from, to);
    } else {
        pushError(`Component is not found in path "${from}"(not found js)`);
    }
}

function getOutputDir (file, path) {
    let to = isAbsolute(path)
        ? path
        : resolve(`/${getFileDir(file)}`, path); // 以输出路径为最上级路径
    to = to.slice(1); // 去除 / 绝对定位参照

    return to;
}

function path2Entry (_path) {
    const parse = getPathParse(_path);
    const code = fs.readFileSync(_path, {encoding: 'utf8'});
    return {
        context: parse.dir,
        assets: {
            [_path]: {
                source () {
                    return code;
                }
            }
        }
    };
}

function getAllExtFileFromSrc (src, ext, getEntry) {
    if (!Array.isArray(src)) {
        src = [ src ];
    }
    return src.reduce((result, dir) => {
        let res = [];
        const stat = fs.statSync(dir);
        if (stat.isDirectory) {
            const jsonPaths = globby.sync(resolve(dir, `**/*.${ext}`));
            res = jsonPaths.map((_path) => getEntry ? path2Entry(_path) : _path);
        } else {
            if (jsonRE.test(dir)) {
                res = [
                    getEntry ? path2Entry(dir) : dir
                ];
            } else {
                pushError(`includes: "${dir}", is not a effective path.`);
            }
        }

        return result.concat(res);
    }, []);
}

export default function extractComponent (componentConfig, compilation) {
    globalCompilation = compilation;
    let patterns = [];

    let entries = compilation.entries ? compilation.entries.slice(0) : [];

    const projectContext = (compilation.options || {}).context || '';
    let { src, native } = componentConfig;

    // 增加对最新版本 mpvue 的支持
    if (src) {
        entries = entries.concat(getAllExtFileFromSrc(src, 'json', true));
    }

    // TODO: 目前输出目录存在问题，parse.dir 错误，多了 src，
    // 拷贝会将所有文件全部拷贝，正则无效了，如果正则有效应该不会复制 vue 文件
    if (native && projectContext) {
        const nativePages = getAllExtFileFromSrc(src, 'wxml');
        nativePages.forEach(dir => {
            const parse = getPathParse(dir);
            if (fs.existsSync(`${parse.dir}/${parse.name}.js`)) {
                const to = path.relative(src, dir);
                patterns.push(getNativePattern(dir, to));
            }
        });
    }

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

                    let to = getOutputDir(file, path);

                    let pattern = generatorPattern(from, to, components, components[j]);
                    if (pattern) patterns.push(pattern);
                }
            }
        }
    }

    return patterns;
}

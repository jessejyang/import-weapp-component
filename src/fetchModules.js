import fs from 'fs';
import path from 'path';
import { parse } from 'acorn';
import { walk } from 'estree-walker';


function isDependency (node) {
    return node.type === 'ImportDeclaration'
        || (node.type === 'Identifier' && node.name === 'require');
}

function getFilePath (origin, filePath, projectContext) {
    if (path.isAbsolute(filePath)) {
        return path.join(projectContext, filePath);
    } else {
        const dir = path.parse(origin).dir;
        return path.join(dir, filePath);
    }
}

const jsFileReg = /\.js$/;
function fileExist (filePath) {
    if (jsFileReg.test(filePath)) return filePath;

    if (fs.existsSync(`${filePath}.js`)) {
        return `${filePath}.js`;
    }
    if (fs.existsSync(`${filePath}/index.js`)) {
        return `${filePath}/index.js`;
    }
}

function generatorPatterns (filePaths, projectContext) {
    const patterns = [];
    for (let i = 0; i < filePaths.length; i++) {
        const toPath = path.relative(projectContext, filePaths[i]);
        patterns.push({
            from: filePaths[i],
            to: toPath
        });
    }

    return patterns;
}

export default function fetchModules (filePaths, projectContext) {
    const filePathArr = [...filePaths];
    const patterns = [];
    const len = filePathArr.length;

    for (let i = 0; i < filePathArr.length; i++) {
        const origin = filePathArr[i] = fileExist(filePathArr[i]);
        if (!origin) continue;
        const content = fs.readFileSync(origin, { encoding: 'utf8' });
        const ast = parse(content, { sourceType: 'module' });
        walk(ast, {
            enter (node, parent) {
                if (isDependency(node)) {
                    let dep = '';
                    if (node.type === 'ImportDeclaration') {
                        dep = node.source.value;
                    } else {
                        dep = parent.arguments[0] ? parent.arguments[0].value : '';
                    }

                    dep = getFilePath(origin, dep, projectContext);
                    filePathArr.push(dep);
                }
            }
        });
    }

    const deps = generatorPatterns(filePathArr.slice(len), projectContext);

    return patterns.concat(deps);
}
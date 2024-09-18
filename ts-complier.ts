const tsCompiler = require('typescript');              // TS编译器

// 待分析代码片段字符串
const tsCode = `import { app } from 'framework';                    

const dataLen = 3;
let name = 'iceman';

if(app){
    console.log(name);
}

function getInfos (info: string) {
    const result = app.get(info);
    return result;
}`;

// 获取AST
const ast = tsCompiler.createSourceFile('xxx', tsCode, tsCompiler.ScriptTarget.Latest, true);
// console.log(ast);

let apiMap = {}

function forEach(node) {
    tsCompiler.forEachChild(node, forEach);
    const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    if (tsCompiler.isIdentifier(node) && node.escapedText === 'app') {
        if (line !== 1) {
            if (Object.keys(apiMap).includes(node.escapedText)) {
                apiMap[node.escapedText].callNum++;
                apiMap[node.escapedText].callLines.push(line);
            } else {
                apiMap[node.escapedText] = {
                    callNum: 1,
                    callLines: [line]
                }
            }
        }
    }
}

forEach(ast);

console.log(apiMap);

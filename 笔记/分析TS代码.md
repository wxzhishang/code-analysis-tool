# 如何将一段TS代码解析成AST

以以下示例代码作为测试代码：

```ts
import { app } from 'framework';                    

const dataLen = 3;
let name = 'kaka';

if(app){
    console.log(name);
}

function getInfos (info: string) {
    const result = app.get(info);
    return result;
}
```

可以观察到上述代码存在5条语句，对应类型为ImportDeclaration，VariableStatment，VariableStatment，IfStatment，FunctionDeclaration。其下是更多的子节点的信息。

设想以下情景，对上述代码中app的调用情况作统计，将上述代码在AST explorer中查看AST结构，可以发现，只需要统计 Identifier 类型且 text 为 'app' 的节点即可。

### 遍历AST节点

首先尝试对AST所有节点进行深度优先遍历，获取到所有的节点信息。

#### 利用 createSourceFile API获取到 AST 对象

```ts
const tsCompiler = require('typescript');              // TS编译器

// 待分析代码片段字符串
const tsCode = `import { app } from 'framework';                    

const dataLen = 3;
let name = 'kaka';

if(app){
    console.log(name);
}

function getInfos (info: string) {
    const result = app.get(info);
    return result;
}`;

// 获取AST
const ast = tsCompiler.createSourceFile('xxx', tsCode, tsCompiler.ScriptTarget.Latest, true);
```

上面的代码会将遍历后的AST node节点信息依次打印出来，但是这个内容会很多，这里就不展示了哈哈哈。

拿到了所有的节点之后，就可以根据这些节点来进行“筛选”了，筛出那些节点类型为 Identifier 的节点，再判断它的名字是不是叫 app 。

这里TS提供了一系列判断节点类型的API：

```ts
const tsCompiler = require('typescript'); 

// 判断节点类型的函数，返回值类型为 boolean 
tsCompiler.isFunctionDeclaration(node);            // 判定是否为函数声明节点
tsCompiler.isArrowFunction(node);                  // 判定是否为箭头函数
tsCompiler.isTypeReferenceNode(node);              // 判定是否为Type类型节点
tsCompiler.isVariableDeclaration(node);            // 判定是否为变量声明节点
tsCompiler.isIdentifier(node);                     // 判定是否为Identifier节点
```

还有获取节点行信息的API：

```ts
// 获取当前node节点所在代码行
ast.getLineAndCharacterOfPosition(node.getStart()).line + 1;    
```

#### 根据上述 API 获取涉及 app 的节点

```ts
const tsCompiler = require('typescript');              // TS编译器

// 待分析代码片段字符串
const tsCode = `import { app } from 'framework';                    

const dataLen = 3;
let name = 'kaka';

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

forEach(ast);

console.log(apiMap);
// {
//      app: {
//          callNum: 3,
//          callLines: [1，6，11]
//      }
// }
```

现在看起来就正确的输出了调用app的行分别是1，6，11，其中第一行是导入时的节点中的app，所以应该排除这个干扰，简单来说，就直接加个判断，line ！== 1即可。

### 存在的问题

但是这样的话，很明显有一个很大的问题，如果导入的不在第一行呢，所以需要再对代码进行一个分析。

首先就是并没有分析import节点，而是直接遍历所有节点，这样存在的问题是如果并没有import语句，那找到了 Identifier 的 app 节点，也是无效的，并不能代表app是从framework导入的。

换句话说，你并不能知道这个app是你想要的app，举个例子：

```ts
import { app } from 'framework';        // import app 定义

const dataLen = 3;
let name = 'kaka';

function doWell () {
    const app =4;                       // 局部常量 app 定义
    return app;                         // 局部常量 app 调用
}

function getInfos (info: string) {
    const result = app.get(info);       // import app 调用 
    return result;
}
```

对上述代码进行分析，在第8行和第12行均有调用app，但他是不一样的app。

另外的问题，还有刚刚提到的排除import节点的方式不准确等等。

### 明确依赖调用分析到底要做什么

> 引用一下大佬的图片和解释

![image-20240918205020770](C:\Users\86150\AppData\Roaming\Typora\typora-user-images\image-20240918205020770.png)

简单来说，首先针对每一个需要分析的 TS(JS) 文件：

1. 遍历其所有 import 节点（上图绿框区域），分析并记录从目标依赖引入的 API 信息，并排除非目标依赖项的干扰。
2. 判定引入的 API 在具体代码中（上图红框区域）是否有调用，过程中还需要排除局部同名变量等一系列干扰。
3. 根据分析指标如用途识别（类型、属性、方法）等对该 API 调用进行指标判定分析，命中则记录到指定 Map 中。

然后按照上面的步骤依次遍历所有项目中指定的 TS(JS) 文件，就可以得到全部应用对于特定依赖（如：framework）的 API 调用分析数据了，最后根据使用场景（告警、评分、代码报告、代码建议等）对分析数据进行标记，二次整理，即可输出最终的分析结果。

### 小结

> 这部分内容算是简单的对代码依赖调用分析做了一些了解，为后续开发代码分析工具做准备吧

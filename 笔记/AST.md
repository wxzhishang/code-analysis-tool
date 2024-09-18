> 学习《前端依赖治理：代码分析工具开发实战》掘金小册记录和总结。
>

## AST抽象语法树

### AST是什么

> AST（Abstract Syntax Tree），即抽象语法树，可以简单理解为源代码语法结构的抽象表示，树上每一个节点对应源代码一种结构。

代码中常见的字面量、标识符、表达式、语句、模块语法、class 语法等语句都有各自对应的 AST 节点类型。

### AST常见节点类型

#### 1. literal（字面量）：本身语义代表一个值

```ts
  let name = 'iceman';       // iceman ---> StringLiteral 字符串字面量
  let age = 30;              // 30     ---> NumberLiteral 数字字面量
  const isMan = true;        // true   ---> BooleanLiteral 布林字面量
  const reg = /\d/;          // /\d/   ---> RegExpLiteral 正则字面量
```

#### 2. Identifier（标识符）：变量名、属性名、参数名等

```ts
  import { request } form 'framework';   // request              ---> Identifier
  let name = 'iceman';                   // name                 ---> Identifier
  const age = 30;                        // age                  ---> Identifier
  function talk(name) {                  // talk, name           ---> Identifier
      console.log(name);                 // console, log, name   ---> Identifier
  }
 const obj = {                          // obj                  ---> Identifier
      name: 'guang'                      // name                 ---> Identifier
  }
```

#### 3. Statement（语句）：最小代码执行单位

```ts
  return 'iceman';                    // ReturnStatement
  if (age > 35) {}                    // IfStatement
  throw new Error('error')            // ThrowStatement
  try {} catch(e) {}                  // TryStatement
  for (let i = 0; i < 5; i++) {}      // ForStatement
```

#### 4. Declaration（声明）：特殊的statement

```ts
  const listlen = 1;            // VariableDeclaration
  let listName = 'user';        // VariableDeclaration
  function getInfo(info) {      // FunctionDeclaration
      if(info.isRun){
          return info.name;
      }
      return '';
  }         
  class Car {                   // ClassDeclaration
      constructor() {}
      method() {}
  }
```

#### 5. Expression（表达式）：与statement的区别在于expression会有返回值

```ts
  [1,2,3];                          // ArrayExpression 数组表达式
  age = 1;                          // AssignmentExpression 赋值表达式
  1 + 2;                            // BinaryExpression二元表达式
  var obj = {                       // ObjectExpression对象表达式
      foo: 'foo',     
      bar: function() {}    
  }
  let getName = function (){}       // FunctionExpression函数表达式
  const getAge = (age) => {         // ArrowFunctionExpression箭头函数表达式
      return age;
  };             
```

#### 6. Import（导入模块）：属于一种特殊的声明语句，有三种类型 ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier

```ts
  import { environment } from 'framework';        // named import
  import { request as req } from 'framework';     // namespaced import
  import api from 'framework';                    // default import
  import * as APP from 'framework';               // namespaced imort
```

#### 7. Export（导出模块）：也属于一种特殊的声明，有三种类型 ExportAllDeclaration | ExportDefaultDeclaration | ExportNamedDeclaration

```ts
export * from './iceman';                        //all declaration
export default 'iceman';                         //default declaration
export const ice = 'iceman';                     //named declaration
```

### AST有什么用

#### 代码编译（这里我的理解是各种loader）

- Babel，将ES6 JavaScript转化为ES5 JavaScript
- TypeScript，将TS转化为JS
- Sass，将Sass转化为css

#### 代码加工（这里我的理解是各种plugin）

- Prettier：代码美化
- ESLint：修复语法错误
- uglifyJS：代码压缩，混淆
- @vue/compiler-dom：将vue文件代码拆分成template、script、style代码片段

#### 代码分析

- ESLint：代码语法检查
- Webpack：代码模块打包分析

上面举的例子基本都是基于AST的代码处理工具，有的我用过，有的没用过，但是大致工作流程基本是下面四个阶段：

1. Parsing（解析）：经过词法分析和语法分析，生成AST。
2. Traversing（遍历）：深度优先遍历AST，访问节点信息。
3. Transforming（修改）：在遍历的过程中对节点信息进行修改/转化，生成新的AST。
4. Printing（输出）：将转化后新的AST输出成新的代码块。

对于代码编译和加工来说，需要改变源代码，所以需要进行完整个过程，但是代码分析的话，并不涉及修改源代码，所以进行Parsing和Traversing两个步骤就行。

### AST如何生成

主要分为两个步骤：

- 词法分析：将整个代码字符串分割成最小语法单元数组。
- 语法分析：在分词基础上建立分析分析语法单元之间的关系。

#### 词法分析

将源代码，生成一系列词法单元（tokens），比如数字，标点，运算符等。

#### 语法分析

将token按照不同的语法结构如声明语句、赋值表达式等转化成有语法含义的抽象语法树结构。

也就是说源代码  -->   词法单元  -->  抽象语法树，分别经过词法分析和语法分析两个过程。

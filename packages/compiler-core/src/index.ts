// 编译主要分为三步
// 1. 解析模板：解析模板字符串，生成 AST 语法树
// 2. 优化 AST：对 AST 进行优化，例如标记静态节点、预字符化等。
// 3. 生成渲染函数：将优化后的 AST 转换为渲染函数的代码。

// codegennode，变量文字，todisplatString 元素 createElementVnode createTextVnode
// openBlock createElementBlock
// -》 字符串
import { NodeTypes } from "./ast";
import { parse } from "./parser";
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  helperNameMaps,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
} from "./runtimeHelper";
import { transform } from "./transform";

function createCodegenContext(ast) {
  const context = {
    code: ``,
    level: 0,
    helper(name) {
      return "_" + helperNameMaps[name];
    },
    push(code) {
      context.code += code;
    },
    indent() {
      newLine(++context.level);
    },
    deindent(noNewLine = false) {
      if (noNewLine) {
        --context.level;
      } else {
        newLine(--context.level);
      }
    },
    newLine() {
      newLine(context.level);
    },
  };

  function newLine(n) {
    context.push("\n" + `  `.repeat(n));
  }

  return context;
}

function getFunctionPreamble(ast, context) {
  const { push, indent, deindent, newLine } = context;
  if (ast.helpers.length > 0) {
    push(
      `const {${ast.helpers.map(
        (item) => `${helperNameMaps[item]}:${context.helper(item)}`
      )}} = Vue`
    );
    newLine();
  }
  push(`return function render(_ctx){`);
}

function genText(node, context) {
  context.push(JSON.stringify(node.content));
}

function genInterpolation(node, context) {
  const { push, indent, deindent, newLine, helper } = context;
  push(`${helper(TO_DISPLAY_STRING)}(`);
  genNode(node.content, context);
  push(`)`);
}

function genExpression(node, context) {
  context.push(node.content);
}

function genVnodeCall(node, context) {
  const { push, indent, deindent, newLine, helper } = context;
  const { tag, props, children, isBlock } = node;
  if (isBlock) {
    push(`(${helper(OPEN_BLOCK)}(),`);
  }
  const h = isBlock ? CREATE_ELEMENT_BLOCK : CREATE_ELEMENT_VNODE;
  push(`${helper(h)}(`);

  //[tag, props, children];

  if (node.isBlock) {
    push(")");
  }
  push(")");
}

function genNode(node, context) {
  const { push, indent, deindent, newLine } = context;
  switch (node.type) {
    case NodeTypes.TEXT:
      genText(node, context);
      break;
    case NodeTypes.INTERPOLATION:
      genInterpolation(node, context);
      break;
    case NodeTypes.SIMPLE_EXPRESSION:
      genExpression(node, context);
      break;
    case NodeTypes.VNODE_CALL:
      genVnodeCall(node, context);
      break;
    default:
      return;
  }
}

function generate(ast) {
  const context = createCodegenContext(ast);
  getFunctionPreamble(ast, context);
  const { push, indent, deindent, newLine } = context;
  indent();
  push(`return `);

  if (ast.codegenNode) {
    genNode(ast.codegenNode, context);
  } else {
    push("null");
  }

  deindent();
  push(`}`);
  debugger;
  console.log(context.code);
}

function compile(template: string) {
  const ast = parse(template);
  // 进行代码的转化
  transform(ast); //生成javascript AST抽象语法树  (对指令v-for、v-if node节点进行转换)
  generate(ast); //生成render函数
  console.log(generate(ast));
  return generate(ast);
}

export { parse, compile };

//buildStart 启动vite时调用
//transform 没访问一个文件都会调用

1; //启动将options。compiler设置为 vue/compiler-sfc

2; ///浏览器访问，通过 vue/compiler-sfc parse生成 descriptor => 本质上也掉了 @vue/compiler-core包的parse => @vue/compiler-core包的baseParse函数

3; //descriptor中包含（其中template已经被编译）
//vue/compiler-sfc 包暴露出来的 parse 函数
// template 经过parse生成ast抽象语法树、code字符串
//script code字符串 (字符串)
//scriptSetup  code字符串 (字符串)
//style [code字符串]

4; //通过descriptor, scriptSetup  code字符串 (字符串)
//这里的 options.compiler.compileScript() 其实就是调用的 vue/compiler-sfc 包暴露出来的 compileScript 函数
//compileScript解析script
// 返回值类型中主要有 scriptAst、scriptSetupAst、content 这三个属性，
// scriptAst 为编译不带 setup 属性的 script 标签生成的 AST 抽象语法树。
// scriptSetupAst 为编译带 setup 属性的 script 标签生成的 AST 抽象语法树，
// content 为 Vue 文件中的 script 模块编译后生成的浏览器可执行的 JavaScript 代码。

5; //genTemplateCode
//将 template 模块编译成 render 函数
//调用 options.compiler.compileTemplate() 其实就是调用的 vue/compiler-sfc 包暴露出来的 compileTemplate 函数，
//compileTemplate 返回render函数

6; //genStyleCode 将style循环，做字符串拼接
//import "C:/Users/wangt/Desktop/back-end-project/my-vue-app/src/App.vue?vue&type=style&index=0&scoped=7a7a37b1&lang.css";
//之后重新调用transform
//通过vue/compiler-sfc 包暴露出来的 compileStyleAsync函数做解析
//解析成 id= scoped
//'\n.msg[data-v-7a7a37b1] {\n  color: red;\n  font-weight: bold;\n}\n'

///
///
///
//compileTemplate
//compiler变量的值为undefined, compiler会被赋值为CompilerDOMCompilerDOM。而CompilerDOM就是@vue/compiler-dom
//执行@vue/compiler-dom包中的compile函数 => @vue/compiler-core包的baseCompile函数
// 执行vue/compiler-sfc 包暴露出来的 compileScript 函数 => 执行@vue/compiler-dom包中的compile函数 => @vue/compiler-core包的baseCompile函数
// 答案是baseCompile函数是一个处于@vue/compiler-core包中的API，而@vue/compiler-core可以运行在各种 JavaScript 环境下，
// 比如浏览器端、服务端等各个平台。baseCompile函数接收这些平台专有的一些options，而我们这里的demo是浏览器平台。
// 所以才需要从@vue/compiler-dom包中绕一圈去调用@vue/compiler-core包中的baseCompile函数传入一些浏览器中特有的options。
// 在上面的代码中我们看到使用DOMNodeTransforms数组对options中的nodeTransforms属性进行了扩展，
// 使用DOMDirectiveTransforms对象对options中的directiveTransforms属性进行了扩展。
//nodeTransforms=[] 对dom属性转换
//DOMDirectiveTransforms={} 对指令转换

//baseCompile 参数是html字符串/AST抽象语法树  调 baseParse

//@vue/compiler-core包中会定义一份 directiveTransforms、nodeTransforms ，vue/compiler-dom也会传过来y一份，DOMDirectiveTransforms会被替换
//,但是本质上在@vue/compiler-dom包中的v-model转换函数会手动调用@vue/compiler-core包中v-model转换函数。

// 经过directiveTransforms对象中的transformModel转换函数处理后，v-mode节点上面就会多两个props属性：modelValue和onUpdate:modelValue属性。
// directiveTransforms对象中的转换函数不会每次都全部执行，而是要node节点中有对应的指令，才会执行指令的转换函数。
// 所以directiveTransforms是对象，而不是数组。

//那为什么有的指令转换函数在directiveTransforms对象中，有的又在nodeTransforms数组中呢？
//答案是在directiveTransforms对象中的指令全部都是会给node节点生成props属性的，那些不生成props属性的就在nodeTransforms数组中。

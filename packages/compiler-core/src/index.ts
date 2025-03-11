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
  console.log(context.code);
}

function compile(template: string) {
  const ast = parse(template);
  // 进行代码的转化
  transform(ast);
  generate(ast);
  return generate(ast);
}

export { parse, compile };

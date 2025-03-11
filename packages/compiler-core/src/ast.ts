import {
  CREATE_ELEMENT_VNODE,
  CREATE_TEXT_VNODE,
  Fragment,
} from "./runtimeHelper";

// 枚举类型不赋值，默认从0开始递增
export enum NodeTypes {
  ROOT,
  ELEMENT,
  TEXT,
  COMMENT,
  SIMPLE_EXPRESSION, //1+1
  INTERPOLATION, // {{ }}
  ATTRIBUTE, // 6
  DIRECTIVE,
  // containers
  COMPOUND_EXPRESSION, // {{ name }} + 'abc'
  IF,
  IF_BRANCH,
  FOR,
  TEXT_CALL, // createVnode
  // codegen
  VNODE_CALL,
  JS_CALL_EXPRESSION, // ()
  JS_OBJECT_EXPRESSION,
  JS_PROPERTY,
  JS_ARRAY_EXPRESSION,
  JS_FUNCTION_EXPRESSION,
  JS_CONDITIONAL_EXPRESSION,
  JS_CACHE_EXPRESSION,
  // ssr codegen
  JS_BLOCK_STATEMENT,
  JS_TEMPLATE_LITERAL,
  JS_IF_STATEMENT,
  JS_ASSIGNMENT_EXPRESSION,
  JS_SEQUENCE_EXPRESSION,
  JS_RETURN_STATEMENT,
}

export function createCallExpression(context, args) {
  //createTextVNode
  let name = context.helper(CREATE_TEXT_VNODE);
  return {
    // createTextVNode(内容，code)
    type: NodeTypes.JS_CALL_EXPRESSION,
    callee: name,
    arguments: args,
  };
}

export function createVnodeCall(context, tag, props, children) {
  //createElementVnode()
  let name;
  if (tag !== Fragment) {
    name = context.helper(CREATE_ELEMENT_VNODE);
  }
  return {
    // createElementVnode
    type: NodeTypes.VNODE_CALL,
    tag,
    props,
    children,
    callee: name,
  };
}

export function createObjectExpression(properties) {
  return {
    type: NodeTypes.JS_OBJECT_EXPRESSION,
    properties,
  };
}

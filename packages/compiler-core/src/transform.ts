import { PatchFlags } from "packages/shared/src/patchFlags";
import {
  createCallExpression,
  NodeTypes,
  createObjectExpression,
  createVnodeCall,
} from "./ast";
import {
  CREATE_ELEMENT_BLOCK,
  CREATE_ELEMENT_VNODE,
  CREATE_TEXT_VNODE,
  Fragment,
  OPEN_BLOCK,
  TO_DISPLAY_STRING,
} from "./runtimeHelper";

function isText(node) {
  return node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION;
}

// dom的遍历方式，一般是🌲的遍历方式，先序中序后序
// -> 元素 -> 文本 -> 文本处理后 -> 元素处理后 组件挂载流程
function transformElement(node, context) {
  // 处理元素
  if (NodeTypes.ELEMENT === node.type) {
    console.log("处理元素");

    return function () {
      console.log("处理文本后执行");
      let { tag, props, children } = node;
      let vnodeTag = tag; //createElementVnode(div)
      //处理属性
      let properties = [];
      for (let i = 0; i < props.length; i++) {
        properties.push({ key: props[i].name, value: props[i].value.content });
      }
      const propsExpression =
        properties.length > 0 ? createObjectExpression(properties) : null;

      //处理child
      let vnodeChildren = null;
      if (children.length == 1) {
        vnodeChildren = children[0];
      } else if (children.length > 1) {
        vnodeChildren = children;
      }
      node.codegenNode = createVnodeCall(
        context,
        vnodeTag,
        propsExpression,
        vnodeChildren
      );
    };
  }
}

function transformText(node, context) {
  // 处理文本
  if (NodeTypes.ELEMENT === node.type || NodeTypes.ROOT === node.type) {
    console.log("处理文本");
    //（后置处理）重点
    // 注意处理顺序，要等待子节点全部处理后，再赋值给父元素
    return function () {
      console.log("处理文本后执行");
      const children = node.children;
      let container = null;
      let hasText = false;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child)) {
          for (let j = i + 1; j < children.length; j++) {
            const next = children[j];
            if (isText(next)) {
              hasText = true;
              if (!container) {
                container = children[i] = {
                  type: NodeTypes.COMPOUND_EXPRESSION,
                  children: [child],
                };
              }
              container.children.push("+", next);
              children.splice(j, 1);
              j--;
            } else {
              container = null;
              break;
            }
          }
        }
      }
      if (!hasText || children.length === 1) {
        return;
      }
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isText(child) || child.type === NodeTypes.COMPOUND_EXPRESSION) {
          const args = [];
          args.push(child);
          if (child.type !== NodeTypes.TEXT) {
            args.push(PatchFlags.TEXT);
          }
          children[i] = {
            type: NodeTypes.TEXT_CALL, // createTextVNode
            content: child,
            codegenNode: createCallExpression(context, args), // createTextVNode(内容，code)
          };
        }
      }
    };
  }
}

function transformExpression(node, context) {
  // 处理表达式
  if (NodeTypes.INTERPOLATION === node.type) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}

function createTransformContext(root) {
  const context = {
    currentNode: root, // 当前节点
    parent: null, // 父节点
    transformNode: [transformElement, transformText, transformExpression],
    // createElementVnode createTextVnode toDisplayString
    helpers: new Map(), // 生成的辅助函数(使用set也行)
    helper(name) {
      let count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    },
    removeHelper(name) {
      let count = context.helpers.get(name);
      if (count) {
        let c = count - 1;
        if (!c) {
          context.helpers.delete(name);
        } else {
          context.helpers.set(name, c);
        }
      }
    },
  };
  return context;
}

function traverseNode(node, context) {
  context.currentNode = node;
  const transforms = context.transformNode;
  const exits = [];
  for (let i = 0; i < transforms.length; i++) {
    let exit = transforms[i](node, context);
    exit && exits.push(exit);
  }
  switch (node.type) {
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      for (let i = 0; i < node.children.length; i++) {
        context.parent = node;
        traverseNode(node.children[i], context);
      }
      break;
    case NodeTypes.INTERPOLATION:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  context.currentNode = node; // 因为traverseNode 会将node变成子节点，所以需要重新赋值

  let i = exits.length;
  if (i > 0) {
    // 倒序执行
    while (i--) {
      exits[i]();
    }
  }
}

function createRootCodegenNode(ast, context) {
  let { children } = ast;
  if (children.length == 1) {
    let child = children[0];
    if (child.type === NodeTypes.ELEMENT) {
      ast.codegenNode = child.codegenNode;
      context.removeHelper(CREATE_ELEMENT_VNODE);
      context.helper(CREATE_ELEMENT_BLOCK);
      context.helper(OPEN_BLOCK);
      ast.codegenNode.isBlock = true;
    } else {
      ast.codegenNode = child;
    }
  } else if (children.length > 0) {
    //产生一个fragment
    ast.codegenNode = createVnodeCall(
      context,
      context.helper(Fragment),
      undefined,
      children
    );
    context.helper(CREATE_ELEMENT_BLOCK);
    context.helper(OPEN_BLOCK);
    ast.codegenNode.isBlock = true;
  }
}

function transform(ast) {
  // 类似于babel babel-traverse
  const context = createTransformContext(ast);

  traverseNode(ast, context);

  //对根节点处理 1.文本 2.一个元素(createElementVnode 换成 createElementBlock） 3.多个 createElementBlock(Fragment)
  createRootCodegenNode(ast, context);
  ast.helpers = [...context.helpers.keys()];
}

export { transform };

// packages/compiler-core/src/runtimeHelper.ts
var TO_DISPLAY_STRING = Symbol(`TO_DISPLAY_STRING`);
var CREATE_TEXT_VNODE = Symbol(`CREATE_TEXT_VNODE`);
var helperNameMaps = {
  [TO_DISPLAY_STRING]: `toDisplayString`,
  [CREATE_TEXT_VNODE]: `createTextVNode`
};

// packages/compiler-core/src/ast.ts
function createCallExpression(context, args) {
  let name = context.helper(CREATE_TEXT_VNODE);
  return {
    // createTextVNode(内容，code)
    type: 14 /* JS_CALL_EXPRESSION */,
    callee: name,
    arguments: args
  };
}

// packages/compiler-core/src/parser.ts
function createParserContext(content) {
  return {
    originalSource: content,
    // 初始的content，永远不变
    source: content,
    // 字符串会不停的减少
    line: 1,
    column: 1,
    offset: 0
  };
}
function isEnd(context, ancestors = []) {
  const c = context.source;
  if (c.startsWith("</")) {
    for (let i = ancestors.length - 1; i >= 0; --i) {
      if (c.startsWith(`</${ancestors[i]}`)) {
        return true;
      }
    }
    console.error(`\u610F\u5916\u7684\u95ED\u5408\u6807\u7B7E: ${c}`);
    return true;
  }
  return !c;
}
function advancePositionMutation(context, c, endIndex) {
  let lineCount = 0;
  let linePos = -1;
  for (let i = 0; i < endIndex; i++) {
    if (c.charCodeAt(i) === 10) {
      lineCount++;
      linePos = i;
    }
  }
  context.offset += endIndex;
  context.line += lineCount;
  context.column = linePos === -1 ? context.column + endIndex : endIndex - linePos - 1;
}
function advanceBy(context, endIndex) {
  let c = context.source;
  advancePositionMutation(context, c, endIndex);
  context.source = c.slice(endIndex);
}
function advanceBySpaces(context) {
  const match = /^[ \t\r\n]+/.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}
function getCursor(context) {
  let { line, column, offset } = context;
  return { line, column, offset };
}
function getSelection(context, start) {
  const end = getCursor(context);
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  };
}
function parseAttributeValue(context) {
  let quote = context.source[0];
  const isQuoted = quote === `"` || quote === `'`;
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote, 1);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  } else {
    content = context.source.match(/([^ \t\r\n/>])+/)[1];
    advanceBy(context, content.length);
    advanceBySpaces(context);
  }
  return content;
}
function parseAttribute(context) {
  const start = getCursor(context);
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  let value;
  advanceBy(context, name.length);
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    advanceBySpaces(context);
    advanceBy(context, 1);
    advanceBySpaces(context);
    value = parseAttributeValue(context);
  }
  let loc = getSelection(context, start);
  return {
    type: 6 /* ATTRIBUTE */,
    name,
    value: {
      type: 2 /* TEXT */,
      content: value,
      loc
    },
    loc: getSelection(context, start)
  };
}
function parseAttributes(context) {
  const props = [];
  while (context.source.length > 0 && !context.source.startsWith(">")) {
    props.push(parseAttribute(context));
    advanceBySpaces(context);
  }
  return props;
}
function parseTag(context) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^ \t\r\n/>]*)/.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  advanceBySpaces(context);
  let props = parseAttributes(context);
  const isSelfClosing = context.source.startsWith("/>");
  if (isSelfClosing) {
    advanceBy(context, 2);
  } else {
    advanceBy(context, 1);
  }
  return {
    type: 1 /* ELEMENT */,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    props
  };
}
function parseElement(context, ancestors = []) {
  const ele = parseTag(context);
  ancestors.push(ele.tag);
  const children = parseChildren(context, ancestors);
  ancestors.pop();
  if (context.source.startsWith("</")) {
    const endTag = parseTag(context);
    if (endTag.tag !== ele.tag) {
      console.error(
        `\u6807\u7B7E <${ele.tag}> \u7684\u95ED\u5408\u6807\u7B7E </${endTag.tag}> \u4E0D\u5339\u914D\uFF0C\u4F4D\u7F6E: line ${context.line}, column ${context.column}`
      );
    }
  } else {
    console.error(`\u7F3A\u5931 <${ele.tag}> \u7684\u95ED\u5408\u6807\u7B7E`);
  }
  ele.children = children;
  ele.loc = getSelection(context, ele.loc.start);
  return ele;
}
function parseTextData(context, endIndex) {
  const content = context.source.slice(0, endIndex);
  advanceBy(context, endIndex);
  return content;
}
function parseText(context) {
  let tokens = ["<", "{{"];
  let endIndex = context.source.length;
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1);
    if (index !== -1 && endIndex > index) {
      endIndex = index;
    }
  }
  const content = parseTextData(context, endIndex);
  return {
    type: 2 /* TEXT */,
    content
  };
}
function parseInterpolation(context) {
  const start = getCursor(context);
  const closeIndex = context.source.indexOf("}}", 2);
  if (closeIndex === -1) {
    throw new Error(
      `Unclosed interpolation at line ${context.line}, column ${context.column}`
    );
  }
  advanceBy(context, 2);
  const innerStart = getCursor(context);
  const innerEnd = getCursor(context);
  const rawContentLength = closeIndex - 2;
  const rawContent = context.source.slice(0, rawContentLength);
  const preTrimContent = parseTextData(context, rawContentLength);
  const content = preTrimContent.trim();
  advanceBy(context, 2);
  return {
    type: 5 /* INTERPOLATION */,
    content: {
      type: 4 /* SIMPLE_EXPRESSION */,
      content,
      loc: getSelection(context, innerStart)
    },
    loc: getSelection(context, start)
  };
}
function parseChildren(context, ancestors = []) {
  const nodes = [];
  while (!isEnd(context, ancestors)) {
    const c = context.source;
    let node;
    if (c.startsWith("{{")) {
      node = parseInterpolation(context);
    } else if (c[0] === "<") {
      node = parseElement(context, ancestors);
    } else {
      node = parseText(context);
    }
    nodes.push(node);
  }
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (node.type === 2 /* TEXT */) {
      if (!/[^\t\r\n\f ]/.test(node.content)) {
        nodes[i] = null;
      } else {
        node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
      }
    }
  }
  return nodes.filter(Boolean);
}
function createRoot(children) {
  return {
    type: 0 /* ROOT */,
    children
  };
}
function parse(template) {
  const context = createParserContext(template);
  return createRoot(parseChildren(context, []));
}

// packages/compiler-core/src/index.ts
function transformElement(node, context) {
  if (1 /* ELEMENT */ === node.type) {
    console.log("\u5904\u7406\u5143\u7D20");
    return function() {
      console.log("\u5904\u7406\u5143\u7D20\u540E\u6267\u884C");
    };
  }
}
function isText(node) {
  return node.type === 2 /* TEXT */ || node.type === 5 /* INTERPOLATION */;
}
function transformText(node, context) {
  if (1 /* ELEMENT */ === node.type || 0 /* ROOT */ === node.type) {
    console.log("\u5904\u7406\u6587\u672C");
    return function() {
      console.log("\u5904\u7406\u6587\u672C\u540E\u6267\u884C");
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
                  type: 8 /* COMPOUND_EXPRESSION */,
                  children: [child]
                };
              }
              container.children.push(`+${next}`);
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
        if (isText(child) || child.type === 8 /* COMPOUND_EXPRESSION */) {
          const args = [];
          args.push(child);
          if (child.type !== 2 /* TEXT */) {
            args.push(1 /* TEXT */);
          }
          children[i] = {
            type: 12 /* TEXT_CALL */,
            // createTextVNode
            content: child,
            codegenNode: createCallExpression(context, args)
            // createTextVNode(内容，code)
          };
        }
      }
    };
  }
}
function transformExpression(node, context) {
  if (5 /* INTERPOLATION */ === node.type) {
    node.content.content = `_ctx.${node.content.content}`;
  }
}
function createTransformContext(root) {
  const context = {
    currentNode: root,
    // 当前节点
    parent: null,
    // 父节点
    transformNode: [transformElement, transformText, transformExpression],
    // createElementVnode createTextVnode toDisplayString
    helpers: /* @__PURE__ */ new Map(),
    // 生成的辅助函数(使用set也行)
    helper(name) {
      let count = context.helpers.get(name) || 0;
      context.helpers.set(name, count + 1);
      return name;
    }
  };
  return context;
}
function traverseNode(node, context) {
  context.currentNode = node;
  const transform2 = context.transformNode;
  const exits = [];
  for (let i2 = 0; i2 < transform2.length; i2++) {
    let exit = transform2[i2](node, context);
    exit && exits.push(exit);
  }
  switch (node.type) {
    case 0 /* ROOT */:
    case 1 /* ELEMENT */:
      for (let i2 = 0; i2 < node.children.length; i2++) {
        context.parent = node;
        traverseNode(node.children[i2], context);
      }
    case 5 /* INTERPOLATION */:
      context.helper(TO_DISPLAY_STRING);
      break;
  }
  context.currentNode = node;
  let i = exits.length;
  if (i > 0) {
    while (i--) {
      exits[i]();
    }
  }
}
function transform(ast) {
  const context = createTransformContext(ast);
  traverseNode(ast, context);
  ast.helpers = [...context.helpers.keys()];
}
function compile(template) {
  const ast = parse(template);
  transform(ast);
}
export {
  compile,
  parse
};
//# sourceMappingURL=compiler-core.js.map

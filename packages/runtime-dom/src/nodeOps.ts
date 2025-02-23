//主要是对节点元素的增删改查
export const nodeOps = {
  insert(el, parent, anchor) {
    //parentElement.insertBefore(newElement,targetElement);
    //newElement:你想插入的元素。
    // targetElement:你想把新元素插入到哪个元素(targetElement)之前。
    // parentElement:目标元素的父元素；
    return parent.appendChild(el, anchor || null);
  },
  remove(el) {
    //移除
    const parent = el.parentNode;
    if (parent) {
      parent.removeChild(el);
    }
  },
  createElement(type) {
    return document.createElement(type);
  },

  createText(text) {
    return document.createTextNode(text);
  },

  setText(node, text) {
    return (node.nodeValue = text);
  },

  setElementText(el, text) {
    return (el.textContent = text);
  },

  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  },
};

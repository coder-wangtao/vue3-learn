import { ShapeFlags } from "@vue/shared";

export function createRenderer(renderOptions) {
  //core中不关心如何渲染

  const {
    insert: hostInsert,
    remove: hostRemove,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    patchProp: hostPatchProp,
  } = renderOptions;

const mountChildren = (children,container) => {
    for(let i =0;i< children.length;i++){
        patch(null,children[i],container)
    }
}

  const mountElement = (vnode, container) => {
    const { type, children, props,shapeFlag } = vnode;
    let el = hostCreateElement(type);
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    //1 + 8 = 9
    //1 | 8 = 9

    //9 & 8 > 0 说明儿子是文本
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN){
        hostSetElementText(el,children)
    }else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN){
        mountChildren(children,el)
    }
    hostSetElementText(el, children);
    hostInsert(el, container);
  };

  //渲染走这里，更新也走这里
  const patch = (n1, n2, container) => {
    if (n1 == n2) {
      //两次渲染同一元素直接跳过即可
      return;
    }

    if (n1) {
      //初始化操作
      mountElement(n2, container);
    }
  };

  //多次调用render会进行虚拟节点的比较，再进行更新
  const render = (vnode, container) => {
    //将虚拟节点真实节点进行渲染
    patch(container._vnode || null, vnode, container);
    container._vnode = vnode;
  };

  return {
    render,
  };
}
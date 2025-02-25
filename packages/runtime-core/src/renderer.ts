import { ShapeFlags } from "@vue/shared";
import { isSameVnode } from "./createVnode";

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

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container);
    }
  };

  const mountElement = (vnode, container, anchor) => {
    const { type, children, props, shapeFlag } = vnode;
    //第一次渲染的时候，我们让虚拟节点和真实dom 创建关联 vnode.el = 真实dom
    //第二次渲染 null
    //第二次渲染新的vnode，可以和上一次的vnode做比对比，之后更新对应的el元素。可以后续再复用这个dom元素
    let el = (vnode.el = hostCreateElement(type));
    if (props) {
      for (let key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    //1 + 8 = 9
    //1 | 8 = 9

    //9 & 8 > 0 说明儿子是文本
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el);
    }
    hostInsert(el, container, anchor);
  };

  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      //初始化操作
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2, container);
    }
  };

  const patchProps = (oldProps, newProps, el) => {
    //新的要全部生效
    for (let key in newProps) {
      hostPatchProp(el, key, oldProps[key], newProps[key]);
    }

    //循环老的
    for (let key in oldProps) {
      if (!(key in newProps)) {
        //以前多的现在没有了，需要删除掉
        hostPatchProp(el, key, oldProps[key], null);
      }
    }
  };

  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child);
    }
  };

  const patchKeyedChildren = (c1, c2, el) => {
    //[a,b,c]
    //[a,b,d,e]
    //减少对比范围，先从头开始比对，再从尾部开始比对，确定不一样的范围
    let i = 0; //开始对比的索引
    let e1 = c1.length - 1; //第一个数组的尾部索引
    let e2 = c2.length - 1; //第二个数组的尾部索引
    while (i <= e1 && i <= e2) {
      //有一方循环结束了，要终止比较
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el); //更新当前节点的属性和儿子(递归比较子节点)
      } else {
        break;
      }
      i++;
    }

    //c
    //d e
    // console.log(i, e1, e2);
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      //[a,b,c]
      //[d,e,b,c]
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el); //更新当前节点的属性和儿子(递归比较子节点)
      } else {
        break;
      }
      e1--;
      e2--;
    }

    //c
    //d e
    // console.log(i, e1, e2);
    // 处理增加和删除的特殊情况  a b -> a b c | a b -> c a b | a b c -> a b | c a b -> a b

    //a b
    //a b c -> i=2，e1=1，e2=2   i>e1 && i<=e2    新的多老的少

    //a b
    //c a b -> i=0, e1=-1, e2=0   i>e1 && i<=e2   新的多老的少
    if (i > e1) {
      //新的多
      if (i <= e2) {
        //有插入的部分
        let nextPos = e2 + 1; //看一下当前下一个元素是否存在
        let anchor = c2[nextPos]?.el;
        while (i <= e2) {
          patch(null, c2[i], el, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      //新的少
      //a b c d e f
      //a b          i=2 e1=2 e2=1   i>e2
      // i<=e1 就是删掉的部分

      //c a b
      //a b          i=0 e1=0 e2=-1  i>e2
      // i<=e1 就是删掉的部分
      if (i <= e1) {
        //删除的部分
        unmount(c1[i]);
        i++;
      }
    } else {
      let s1 = i;
      let s2 = i;

      const keyToNewIndexMap = new Map(); //做一个映射表用于快速查找，看老的是否在新的里面还有，没有就删除，有的话就更新
      let toBePatched = e2 - s1 + 1; //要倒序插入的个数

      let newIndexToOldMapIndex = new Array(toBePatched).fill(0); //[5,3,2,0]
      //根据新的节点，找到对应老的位置

      //[4,2,3,0] -> [1,2] 跟据最长递增子序列求出对应的索引结果

      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }
      for (let i = s1; i <= e1; i++) {
        const vnode = c1[i];
        const newIndex = keyToNewIndexMap.get(vnode.key); //通过key找到对应的索引
        if (newIndex == undefined) {
          //如果新的里面找不到，则说明老的有的要删除掉
          unmount(vnode);
        } else {
          //比较前后节点的差异，更新属性和儿子
          //我们i可能是0的情况，为了保证0 是没有比对过的元素 直接i+1
          newIndexToOldMapIndex[newIndex - s2] = i + 1;
          patch(vnode, c2[newIndex], el); //复用
        }
      }

      //调整顺序
      //我们介意按照新的队列 倒序插入insertBefore 通过参照物往前面插入
      //插入的过程中，可能新的元素多，需要创建
      for (let i = toBePatched - 1; i >= 0; i--) {
        let newIndex = s2 + i;
        let anchor = c2[newIndex + 1]?.el;
        const vnode = c2[newIndex];
        if (!vnode.el) {
          //新列表新增的元素
          patch(null, vnode, el, anchor); //创建新的元素
        } else {
          hostInsert(vnode.el, el, anchor); //接着倒序插入
        }
      }
      //倒序比对每一个元素，做插入操作
    }

    //以上确认不变化的节点，并且对插入和移除做了处理
    //后面就是特殊的比对方式了
  };

  const patChildren = (n1, n2, el) => {
    //text array null
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    //1.新的是文本，老的是数组 移除老的
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1);
      }
      //2.新的是文本，老的也是文本，内容不相同替换
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      //3.老的是数组，新的也是数组，全量diff算法
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          //全量diff算法，
          patchKeyedChildren(c1, c2, el);
        } else {
          //4.老的是数组，新的不是数组，移除老的节点
          unmountChildren(c1);
        }
      } else {
        //5.老的是文本，新的是空
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        //6.老的是文本，新的是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
    }
  };

  const patchElement = (n1, n2, container) => {
    //1.比较元素的差异,肯定需要复用dom元素
    //2.比较属性和元素的子节点
    let el = (n2.el = n1.el); //对dom元素的复用
    let oldProps = n1.props || {};
    let newProps = n2.props || {};
    // hostPatchProp 只针对某一个属性来处理 class style event attr
    patchProps(oldProps, newProps, el);

    patChildren(n1, n2, el);
  };

  //渲染走这里，更新也走这里
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 == n2) {
      //两次渲染同一元素直接跳过即可
      return;
    }

    //直接移除老的dom元素，初始化新的dom元素
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1);
      n1 = null; //就会执行后续n2的初始化
      //
    }

    processElement(n1, n2, container, anchor); //对元素处理
  };

  const unmount = (vnode) => {
    return hostRemove(vnode.el);
  };

  //多次调用render会进行虚拟节点的比较，再进行更新
  const render = (vnode, container) => {
    if (vnode == null) {
      //我要移除当前容器中的dom元素
      if (container._vnode) {
        unmount(container._vnode);
      }
    }

    //将虚拟节点真实节点进行渲染
    patch(container._vnode || null, vnode, container);
    container._vnode = vnode;
  };

  return {
    render,
  };
}

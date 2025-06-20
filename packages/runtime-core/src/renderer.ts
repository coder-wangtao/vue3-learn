import { ShapeFlags } from "@vue/shared";
import { isSameVnode, Text, Fragment, createVnode } from "./createVnode";
import getSequence from "./seq";
import { isRef, reactive, ReactiveEffect } from "@vue/reactivity";
import queueJob from "./scheduler";
import { createComponentInstance, setupComponent } from "./component";
import { invokeArray } from "./apiLifeCycle";
import { isKeepAlive } from "@vue/runtime-dom";
import { PatchFlags } from "packages/shared/src/patchFlags";

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

  const normalize = (children) => {
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        if (
          typeof children[i] === "string" ||
          typeof children[i] === "number"
        ) {
          children[i] = createVnode(Text, null, String(children[i]));
        }
      }
    }

    return children;
  };

  const mountChildren = (children, container, anchor, parentComponent) => {
    normalize(children);

    for (let i = 0; i < children.length; i++) {
      patch(null, children[i], container, anchor, parentComponent);
    }
  };

  //挂载操作
  const mountElement = (vnode, container, anchor, parentComponent) => {
    const { type, children, props, shapeFlag, transition } = vnode;
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
      mountChildren(children, el, anchor, parentComponent);
    }

    if (transition) {
      transition.beforeEnter(el);
    }

    hostInsert(el, container, anchor);

    if (transition) {
      transition.enter(el);
    }
  };

  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      //初始化操作
      //挂载操作
      mountElement(n2, container, anchor, parentComponent);
    } else {
      //比较操作
      patchElement(n1, n2, container, anchor, parentComponent);
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

  const unmountChildren = (children, parentComponent) => {
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      unmount(child, parentComponent);
    }
  };

  const patchKeyedChildren = (c1, c2, el, parentComponent) => {
    // debugger;
    //[a,b,c]
    //[a,b,d,e]
    //减少对比范围，先从头开始比对，再从尾部开始比对，确定不一样的范围
    let i = 0; //开始对比的索引
    let e1 = c1.length - 1; //第一个数组的尾部索引  2
    let e2 = c2.length - 1; //第二个数组的尾部索引   3
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
      //a b c d
      //a b          i=2 e1=3 e2=1   i>e2
      // i<=e1 就是删掉的部分

      //c a b
      //a b          i=0 e1=0 e2=-1  i>e2
      // i<=e1 就是删掉的部分
      if (i <= e1) {
        //删除的部分
        unmount(c1[i], parentComponent);
        i++;
      }
    } else {
      //a b c d e f g
      //a b e c d h f g

      //i = 2 e1 = 4 e2 = 5

      let s1 = i;
      let s2 = i;

      const keyToNewIndexMap = new Map();

      let toBePatched = e2 - s2 + 1; //要倒序插入的个数

      //根据新的节点，找到对应老的位置
      let newIndexToOldMapIndex = new Array(toBePatched).fill(0); //[0,0,0,0] //[4,2,3,0]

      //[4,2,3,0] -> [1,2] 跟据最长递增子序列求出对应的索引结果

      //新的范围
      for (let i = s2; i <= e2; i++) {
        const vnode = c2[i];
        keyToNewIndexMap.set(vnode.key, i);
      }

      //老的范围
      for (let i = s1; i <= e1; i++) {
        const vnode = c1[i];
        // debugger;
        const newIndex = keyToNewIndexMap.get(vnode.key); //通过key找到对应的索引
        if (newIndex == undefined) {
          //如果新的里面找不到，则说明老的有的要删除掉
          unmount(vnode, parentComponent);
        } else {
          //比较前后节点的差异，更新属性和儿子
          //我们i可能是0的情况，为了保证0 是没有比对过的元素 直接i+1
          newIndexToOldMapIndex[newIndex - s2] = i + 1; //[5,3,4,0]
          patch(vnode, c2[newIndex], el); //复用
        }
      }

      //调整顺序
      //我们这里按照新的队列 倒序插入insertBefore 通过参照物往前面插入
      //插入的过程中，可能新的元素多，需要创建

      let increasingSeq = getSequence(newIndexToOldMapIndex);
      //[1,2]

      let j = increasingSeq.length - 1;

      //toBePatched:[0,1,2,3]
      for (let i = toBePatched - 1; i >= 0; i--) {
        //3,1,2,0
        let newIndex = s2 + i;
        let anchor = c2[newIndex + 1]?.el;
        const vnode = c2[newIndex];
        if (!vnode.el) {
          //新列表新增的元素
          patch(null, vnode, el, anchor); //创建新的元素
        } else {
          if (i == increasingSeq[j]) {
            j--; //做了diff算法
          } else {
            hostInsert(vnode.el, el, anchor); //接着倒序插入
          }
        }
      }
      //倒序比对每一个元素，做插入操作
    }

    //以上确认不变化的节点，并且对插入和移除做了处理
    //后面就是特殊的比对方式了
  };

  const patchChildren = (n1, n2, el, anchor, parentComponent) => {
    //text array null
    const c1 = n1.children;
    const c2 = normalize(n2.children);
    const prevShapeFlag = n1.shapeFlag;
    const shapeFlag = n2.shapeFlag;
    //1.新的是文本，老的是数组 移除老的
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1, parentComponent);
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
          patchKeyedChildren(c1, c2, el, parentComponent);
        } else {
          //4.老的是数组，新的不是数组(null)，移除老的节点
          unmountChildren(c1, parentComponent);
        }
      } else {
        //老的不是数组
        //5.老的是文本，新的是空(shapeFlag为原始值 1)
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        //6.老的是文本，新的是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el, anchor, parentComponent);
        }
      }
    }
  };

  const patchBlockChildren = (n1, n2, el, anchor, parentComponent) => {
    for (let i = 0; i < n2.dynamicChildren.length; i++) {
      patch(
        n1.dynamicChildren[i],
        n2.dynamicChildren[i],
        el,
        anchor,
        parentComponent
      );
    }
  };

  const patchElement = (n1, n2, container, anchor, parentComponent) => {
    //1.比较元素的差异,肯定需要复用dom元素 （don类型一致）
    //2.比较属性和元素的子节点
    let el = (n2.el = n1.el); //对dom元素的复用
    let oldProps = n1.props || {};
    let newProps = n2.props || {};

    //在比较元素的时候，针对某个属性来去比较
    const { patchFlag, dynamicChildren } = n2;

    if (patchFlag) {
      if (patchFlag & PatchFlags.STYLE) {
      }

      if (patchFlag & PatchFlags.CLASS) {
      }

      if (patchFlag & PatchFlags.TEXT) {
        //重要文本是动态的只比较文本
        if (n1.children !== n2.children) {
          return hostSetElementText(el, n2.children);
        }
      }
    } else {
      // hostPatchProp 只针对某一个属性来处理 class style event attr
      patchProps(oldProps, newProps, el);
    }

    if (dynamicChildren) {
      //线性比对
      patchBlockChildren(n1, n2, el, anchor, parentComponent);
    } else {
      //全量diff
      patchChildren(n1, n2, el, anchor, parentComponent);
    }
  };

  const processText = (n1, n2, container) => {
    if (n1 == null) {
      //虚拟节点要关联真实节点
      //将节点插入到页面中
      hostInsert((n2.el = hostCreateText(n2.children)), container);
    } else {
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      mountChildren(n2.children, container, anchor, parentComponent);
    } else {
      patchChildren(n1, n2, container, anchor, parentComponent);
    }
  };

  const updateProps = (instance, prevProps, nextProps) => {
    if (hasPropsChange(prevProps, nextProps)) {
      //看属性是否存在变化
      for (let key in nextProps) {
        //用新的覆盖掉老的
        instance.props[key] = nextProps[key]; //更新
      }
      for (let key in instance.props) {
        //删除多余老的
        if (!(key in nextProps)) {
          delete instance.props[key];
        }
      }
    }
  };

  const updateComponentPreRender = (instance, next) => {
    instance.next = null;
    instance.vnode = next; //
    updateProps(instance, instance.props, next.props || {});

    //组件更新的时候，需要更新插槽
    Object.assign(instance.slots, next.children);
  };

  function renderComponent(instance) {
    const { render, vnode, proxy, props, attrs, slots } = instance;
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      return render.call(proxy, proxy); //第一个参数this指向，第二个参数proxy   render(proxy){}
    } else {
      //此写法 不用使用了，vue3中没有任何性能优化
      return vnode.type(attrs, { slots }); //函数式组件
    }
  }

  function setupRenderEffect(instance, container, anchor, parentComponent) {
    //组件可以基于自己的状态重新渲染

    const { render } = instance;
    const componentUpdateFn = () => {
      //我们要在这里面区分，是第一次还是之后的
      //元素更新 n2.el = n1.el
      //组件更新 n2.component.subTree.el = n1.component.subTree.el
      const { bm, m } = instance;
      if (!instance.isMounted) {
        if (bm) {
          invokeArray(bm);
        }
        const subTree = renderComponent(instance); //第一个参数this指向，第二个参数proxy   render(proxy){}

        patch(null, subTree, container, anchor, instance);
        instance.isMounted = true;
        instance.subTree = subTree;
        if (m) {
          invokeArray(m);
        }
      } else {
        //基于状态的组件更新
        const { next, bu, u } = instance;
        if (next) {
          //更新属性和插槽
          updateComponentPreRender(instance, next);
        }
        if (bu) {
          invokeArray(bu);
        }
        const subTree = renderComponent(instance);
        patch(instance.subTree, subTree, container, anchor, instance);
        instance.subTree = subTree;
        if (u) {
          invokeArray(u);
        }
      }
    };

    const effect = new ReactiveEffect(componentUpdateFn, () =>
      queueJob(update)
    );

    const update = (instance.update = () => {
      effect.run();
    });

    update();
  }

  const mountComponent = (vnode, container, anchor, parentComponent) => {
    //1.先创建组件实例
    const instance = (vnode.component = createComponentInstance(
      vnode,
      parentComponent
    ));

    if (isKeepAlive(vnode)) {
      instance.ctx.renderer = {
        createElement: hostCreateElement, //內部需要创建一个div来缓存dom
        move(vnode, container, anchor) {
          //需要吧之前渲染的dom放入到容器中
          hostInsert(vnode.component.subTree.el, container, anchor);
        },
        unmount, //如果组件切换需要将现在容器中的元素移除
      };
    }
    //2.给实例的属性赋值
    setupComponent(instance);
    //3.创建一个effect
    setupRenderEffect(instance, container, anchor, parentComponent);
  };

  const hasPropsChange = (prevProps, nextProps) => {
    let nKeys = Object.keys(nextProps);
    if (nKeys.length !== Object.keys(prevProps).length) {
      return true;
    }
    for (let i = 0; i < nKeys.length; i++) {
      const key = nKeys[i];
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  };

  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;
    if (prevChildren || nextChildren) return true; //有插槽直接走重新渲染即可
    if (prevProps === nextProps) return false;
    //如果属性不一致则更新
    return hasPropsChange(prevProps, nextProps || {});
  };

  const updateComponent = (n1, n2) => {
    //组件的复用是component
    //元素的复用是el
    const instance = (n2.component = n1.component);
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2; //如果调用update 有next属性，说明是属性更新，插槽更新
      instance.update(); //让更新逻辑统一
    }
  };

  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
        //需要走keepAlive中的激活方法
        parentComponent.ctx.activate(n2, container, anchor);
      } else {
        //组件的挂载
        mountComponent(n2, container, anchor, parentComponent);
      }
    } else {
      //组件的更新
      updateComponent(n1, n2);
    }
  };

  //渲染走这里，更新也走这里
  const patch = (n1, n2, container, anchor = null, parentComponent = null) => {
    if (n1 == n2) {
      //两次渲染同一元素直接跳过即可
      return;
    }

    //直接移除老的dom元素，初始化新的dom元素 (两次元素不相同)
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1, parentComponent);
      n1 = null; //就会执行后续n2的初始化
    }

    const { type, shapeFlag, ref } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor, parentComponent); //对元素处理
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
          // debugger;
          type.process(n1, n2, container, anchor, parentComponent, {
            mountChildren,
            patchChildren,
            move(vnode, container, anchor) {
              //此方法可以将组件 或者dom元素移动到指定位置
              hostInsert(
                vnode.component ? vnode.component.subTree.el : vnode.el,
                container,
                anchor
              );
            },
          });
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          //对组件的处理，vue3中函数式组件，已经废弃了,没有性能节约
          processComponent(n1, n2, container, anchor, parentComponent);
        }
    }

    if (ref) {
      //n2是dom 还是组件 还是组件由expose
      setRef(ref, n2);
    }
  };

  function setRef(rawRef, vnode) {
    let value =
      vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
        ? vnode.component.exposed || vnode.component.proxy
        : vnode.el;
    if (isRef(rawRef)) {
      rawRef.value = value;
    }
  }

  //卸载操作
  const unmount = (vnode, parentComponent) => {
    const { shapeFlag, transition, el } = vnode;
    const performRemove = () => {
      hostRemove(vnode.el);
    };
    if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
      //需要找keep走失活逻辑
      parentComponent.ctx.deactivate(vnode);
      // console.log("并非卸载");
    } else if (vnode.type === Fragment) {
      unmountChildren(vnode.children, parentComponent);
    } else if (shapeFlag & ShapeFlags.COMPONENT) {
      unmount(vnode.component.subTree, parentComponent);
    } else if (shapeFlag & ShapeFlags.TELEPORT) {
      vnode.type.remove(vnode, unmountChildren);
    } else {
      if (transition) {
        transition.leave(el, performRemove);
      } else {
        performRemove();
      }
    }
  };

  //多次调用render会进行虚拟节点的比较，再进行更新
  const render = (vnode, container) => {
    if (vnode == null) {
      //我要移除当前容器中的dom元素
      if (container._vnode) {
        unmount(container._vnode, null);
      }
    } else {
      //将虚拟节点真实节点进行渲染
      patch(container._vnode || null, vnode, container);

      container._vnode = vnode;
      // debugger;
    }
  };

  return {
    render,
  };
}

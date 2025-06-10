import { onBeforeMount } from "./../apiLifeCycle";
import { getCurrentInstance } from "../component";
import { h } from "../h";

//enterFrom enterActive enterTo      leaveFrom leaveActive leaveTo

function nextFrame(fn) {
  //绝对保证fn在当前帧的下一帧执行
  requestAnimationFrame(() => {
    requestAnimationFrame(fn);
  });
}

export function resolveTransitionProps(props) {
  const {
    name = "v",
    enterFromClass = `${name}-enter-from`,
    enterActiveClass = `${name}-enter-active`,
    enterToClass = `${name}-enter-to`,
    leaveFromClass = `${name}-leave-from`,
    leaveActiveClass = `${name}-leave-active`,
    leaveToClass = `${name}-leave-to`,
    onBeforeEnter,
    onEnter,
    onLeave,
  } = props;

  return {
    onBeforeEnter(el) {
      onBeforeEnter && onBeforeEnter(el);
      el.classList.add(enterFromClass);
      el.classList.add(enterActiveClass);
    },
    onEnter(el, done) {
      const resolve = () => {
        el.classList.remove(enterToClass);
        el.classList.remove(enterActiveClass);
        done && done();
      };
      onEnter && onEnter(el, resolve);
      //添加后再移除，而不是马上移除
      nextFrame(() => {
        //保证动画的产生
        el.classList.remove(enterFromClass);
        el.classList.add(enterToClass);

        if (!onEnter || onEnter.length <= 1) {
          //transitionend是CSS过渡完成后触发的事件，用于在动画结束时执行JavaScript代码‌。‌
          // 开发者需确保元素应用了CSS过渡效果、属性发生变化并正确监听事件‌。
          el.addEventListener("transitionend", resolve);
        }
      });
    },
    onLeave(el, done) {
      const resolve = () => {
        el.classList.remove(leaveActiveClass);
        el.classList.remove(leaveToClass);
        done && done();
      };

      onLeave && onLeave(el, resolve);
      el.classList.add(leaveFromClass);
      document.body.offsetHeight; //立刻
      el.classList.add(leaveActiveClass);

      nextFrame(() => {
        el.classList.remove(leaveFromClass);
        el.classList.add(leaveToClass);

        if (!onLeave || onLeave.length <= 1) {
          el.addEventListener("transitionend", resolve);
        }
      });
    },
  };
}

export function Transition(props, { slots }) {
  //函数式组件功能比较少，为了方便函数式组件处理属性
  //处理属性后传递给 状态组件 setup
  return h(BaseTransitionImpl, resolveTransitionProps(props), slots);
}

const BaseTransitionImpl = {
  //真正的组件 只需要渲染的时候调用封装后的钩子即可
  props: {
    onBeforeEnter: Function,
    onEnter: Function,
    onLeave: Function,
  },
  setup(props, { slots }) {
    return () => {
      const vnode = slots.default && slots.default();
      const instance = getCurrentInstance();
      if (!vnode) {
        return;
      }

      //渲染前（离开） 和渲染后 （进入）
      // const oldVnode = instance.subTree; //之前的虚拟节点
      vnode.transition = {
        beforeEnter: props.onBeforeEnter,
        enter: props.onEnter,
        leave: props.onLeave,
      };
      return vnode;
    };
  },
};

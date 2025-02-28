import {
  currentInstance,
  setCurrentInstance,
  unsetCurrentInstance,
} from "./component";
export const enum LifeCycle {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

function createHook(type) {
  //将当前的实例存到此钩子上
  return (hook, target = currentInstance) => {
    if (target) {
      //当前钩子是在组件中运行的
      //看当前钩子会否存放 发布订阅
      const hooks = target[type] || (target[type] = []);

      //让currentInstance 存到这个函数内容
      const wrapHook = () => {
        //在钩子执行前，对实例进行矫正处理
        setCurrentInstance(target);
        hook.call(target);
        unsetCurrentInstance();
      };
      //
      hooks.push(wrapHook);
    }
  };
}

export const onBeforeMount = createHook(LifeCycle.BEFORE_MOUNT);
export const onMounted = createHook(LifeCycle.MOUNTED);
export const onBeforeUpdate = createHook(LifeCycle.BEFORE_UPDATE);
export const onUpdated = createHook(LifeCycle.UPDATED);

export function invokeArray(fns) {
  for (let i = 0; i < fns.length; i++) {
    fns[i]();
  }
}

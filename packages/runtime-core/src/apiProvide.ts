import { currentInstance } from "./component";

export function provide(key, value) {
  if (!currentInstance) return; //建立在组件基础之上的

  const parentProvide = currentInstance.parent?.provides; //获取父组件的provide

  let provides = currentInstance.provides; //当前组件的provide

  if (parentProvide === provides) {
    //如果子组件上新增了 provides 需要拷贝一份全新的
    provides = currentInstance.provides = Object.create(provides);
  }

  provides[key] = value;
}

export function inject(key, defaultValue) {
  if (!currentInstance) return; //建立在组件基础之上的
  const provides = currentInstance.parent?.provides;
  if (provides && key in provides) {
    return provides[key]; //直接从provides中取出来使用
  } else {
    return defaultValue; //默认的inject
  }
}

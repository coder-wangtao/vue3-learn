import { reactive } from "@vue/reactivity";
import { hasOwn, isFunction } from "@vue/shared";

export function createComponentInstance(vnode) {
  const instance = {
    data: null, //状态
    vnode, //组件的虚拟节点
    subTree: null, //子树
    isMounted: false, //是否挂载完成
    update: null, //组件的更新函数
    props: {},
    attrs: {},
    render: null,
    propsOptions: vnode.type.props, //包括attr+prop
    component: null,
    proxy: null, //用来代理props,attrs,data  让用户更方便的使用
  };
  return instance;
}

//初始化属性
const initProps = (instance, rawProps) => {
  //initProps 用它来分裂 确定 props和attrs
  const props = {};
  const attrs = {};
  const propsOptions = instance.propsOptions || {}; //组件中定义的
  if (rawProps) {
    for (let key in rawProps) {
      //用所有的来分裂
      const value = rawProps[key]; //value  String | number
      if (key in propsOptions) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
  instance.attrs = attrs;
  instance.props = reactive(props);
};

const publicProperty = {
  $attrs: (instance) => instance.attrs,
};
const handler = {
  get(target, key) {
    //data 和 props属性不要重名
    const { data, props } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (props && hasOwn(props, key)) {
      return props[key];
    }
    //对于一些无法修改的属性，$slots $attrs ... $attrs -> instance.attrs
    const getter = publicProperty[key]; //通过不同的策略来访问对应的方法
    if (getter) {
      return getter(target);
    }
  },
  set(target, key, value) {
    const { data, props } = target;
    if (data && hasOwn(data, key)) {
      data[key] = value;
    } else if (props && hasOwn(props, key)) {
      //我们用户可以修改属性中的嵌套属性（内部不会报错）但是不合法
      console.log("props are readonly");
      // props[key] = value;
      return false;
    }
    return true;
  },
};

//给实例的属性赋值
export function setupComponent(instance) {
  const { vnode } = instance;

  //赋值属性
  initProps(instance, vnode.props);

  //赋值代理对象
  instance.proxy = new Proxy(instance, handler);

  const { data = () => {}, render } = vnode.type;

  if (data && !isFunction(data)) {
    console.warn("data option must be a function");
  } else {
    //data中可以拿到props
    instance.data = reactive(data.call(instance.proxy));
  }

  instance.render = render;
}

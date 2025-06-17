ref();
// class Dep {
//   // 指向Link链表的尾部节点
//   subs: Link;
//   // 收集依赖
//   track: Function;
//   // 触发依赖
//   trigger: Function;
// }

effect();
//想必细心的你发现了这里的Subscriber是一个interface接口，而不是一个class类。
// 因为实现了这个Subscriber接口的class类都是订阅者，比如watchEffect、watch、render函数、computed等。

// interface Subscriber {
//   // 指向Link链表的头部节点
//   deps: Link
//   // 指向Link链表的尾部节点
//   depsTail: Link
//   // 执行依赖
//   notify: Function
// }

const queue = []; //缓存当前要执行的状态
let isFlushing = false;
const resolvePromise = Promise.resolve();

//如果同时在一个组件中更新多个状态 job肯定是同一个
//同时开启一个异步任务
export default function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job); //让任务入队列
  }
  if (!isFlushing) {
    isFlushing = true;

    resolvePromise.then(() => {
      isFlushing = false;

      const copy = queue.slice(0); //先拷贝再执行
      queue.length = 0;

      copy.forEach(() => job());
      copy.length = 0;
    });
  }
}

//通过事件循环的机制，延迟更新操作
//等待所有状态修改完之后，再走微任务

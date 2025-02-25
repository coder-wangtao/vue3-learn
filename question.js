//2 3 1 5 6 8 7 9 4 求最长子序列个数是多少

//2    （2的前一个是null）
//2 3   （3的前一个是2）
//1 3     （1的前一个是null）
//1 3 5   （5的前一个是3）
//1 3 5 6   （6的前一个是5）
//1 3 5 6 8  （8的前一个是6）
//1 3 5 6 7  （7的前一个是6）
//1 3 5 6 7 9   （9的前一个是7）
//1 3 4 6 7 9  （4的前一个是3）              6个

//9 7 6 5 3 2  //倒序

//找更有潜力的

function getSequence(arr) {
  const result = [0];
  const len = arr.length;
  let start;
  let end;
  let middle;
  for (let i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      //为了vue3而处理掉数组中0的情况  [5,3,4,0]

      //拿出结果集对应的最后一项，和当前的这一项来做比对
      let resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < arrI) {
        //直接将当前索引放入到结果集中
        result.push(i);
        continue;
      }
    }

    start = 0;
    end = result.length - 1;
    while (start < end) {
      middle = ((start + end) / 2) | 0; //向下取整
      if (arr[result[middle]] < arrI) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }
  }
  return result;
}

//console.log(getSequence([2, 6, 7, 8, 9, 11]));
console.log(getSequence([2, 3, 1, 5, 6, 8, 7, 9, 4]));

//2
//2 3
//1 3

// c d e 2,3,4
// e c d h 4,2,3,0  //表示以前不存在

//[c,d]
//[0,1]  通过上面的两个序列,可以求出来，最终这样的结果，就可以保证某些元素不用移动

//需要求连续性最强的子序列
//贪心算法 + 二分查找

//2 3 1 5 6 8 7 9 4 求最长子序列个数是多少

//2    （2的前一个是null）
//2 3   （3的前一个是2）
//1 3     （1的前一个是null）
//1 3 5   （5的前一个是3）
//1 3 5 6   （6的前一个是5）
//1 3 5 6 8  （8的前一个是6）
//1 3 5 6 7  （7的前一个是6）
//1 3 5 6 7 9   （9的前一个是7）
//1 3 4 6 7 9  （4的前一个是3）              6个   (序列是不对的 但是个数是对的)
//将大的排到后面，如果有潜力的不是最后一个，我们就替换前面的，而且替换的时候要标识前一个是谁，这样我就能找回前一个是谁

//1 3 4 6 7 9
//9 7 6 5 3 2  //倒序

//找更有潜力的

export default function getSequence(arr) {
  const result = [0];
  const len = arr.length;
  const p = result.slice(0); //用于存放索引的
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
        p[i] = result[result.length - 1]; //正常放入的时候，前一个节点索引就是result中最后一个
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

    if (arrI < arr[result[start]]) {
      p[i] = result[start - 1]; //找到的那个节点的前一个
      result[start] = i;
    }
  }

  //p为前驱节点的列表，需要根据最后一个节点做追溯
  let l = result.length;
  let last = result[l - 1]; //取出最后一项

  while (l-- > 0) {
    result[l] = last;
    last = p[last]; //在数组中找到最后一个
  }

  //需要创建一个前驱节点，进行倒序追溯 （因为最后一项，可到时不会错的）
  return result;
}

// console.log(getSequence([2, 6, 7, 8, 9, 11]));
console.log(getSequence([2, 3, 1, 5, 6, 8, 7, 9, 4]));

//2
//2 3
//1 3
//1 3 5
//1 3 5 6
//1 3 5 6 8
//1 3 5 6 7
//1 3 5 6 7 9
//1 3 4 6 7 9

//2 -> 1 -> 8 -> 4 -> 6 -> 7

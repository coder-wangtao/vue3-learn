//这个文件会帮我们打包packages下的模块，最终打包出js文件
//node dev.js (要打包的名字 -f 打包的格式)  === argv.slice(2)

import minimist from "minimist";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import esbuild from "esbuild";
// node中命令函参数通过process来获取process.argv
const args = minimist(process.argv.slice(2));
const __filename = fileURLToPath(import.meta.url); //获取文件的绝对路径 file: -> usr
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url); //再es6中使用require
const target = args._[0] || "reactivity"; //打包的项目
const format = args.f || "iife"; //打包后的模块化规规范

// node 中 esm模块没有__dirname
//入口文件
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);
const pkg = resolve(`../packages/${target}/package.json`);

esbuild
  .context({
    entryPoints: [entry], //入口
    outfile: resolve(__dirname, `../packages/${target}/dist/${target}.js`), //出口
    bundle: true, //reactivity -> shared 会打包到一起
    platform: "browser", //打包后给浏览器使用
    sourcemap: true, //可以调试源代码
    format, //cjs:require() module.exports  esm:import/export iife:立即执行函数
    globalName: pkg?.buildOptions?.name, //iife全局name var xx = (function(){ return xx })()
  })
  .then((ctx) => {
    console.log("start dev");
    return ctx.watch(); //监控入口文件持续记性打包处理
  });

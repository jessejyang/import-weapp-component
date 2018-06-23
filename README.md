Forked from [webpack-contrib/copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin)

Author: Len Boyette

License: MIT

简介：根据`json`文件`usingComponents`自动引入组件

-----------

<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>Webpack Plugin Import Weapp Component</h1>
  <p>Import wechat app native component</p>
</div>

<h2 align="center">Install</h2>

```bash
npm i -D import-weapp-component
```

<h2 align="center">Usage</h2>

**webpack.config.js**
```js
const ImportComponent = require('import-weapp-component')

const config = {
  plugins: [
    new ImportComponent()
  ]
}
```

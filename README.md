### 安装

```javascript
   npm install webpack-react-webp --save
```

### 使用

```
	webpack.config.js
    
	let webpackWebp = require('webpack-react-webp');

	//不是开发环境必须要添加 webpackWebp.loader()，添加webp判断
	let imgLoader = (env === 'dev'? []: [webpackWebp.loader()]).concat([
        'file-loader?'+JSON.stringify({name : imagePath+imgName+'.[ext]'})	//或者url-loader
    ]),

	module: {
            loaders: [
                {
                    test: /\.(jpe?g|png|gif|svg)$/,
                    loaders:imgLoader
                }
            ]
        },
   
    plugins: [
		new HtmlWebpackPlugin({	//html-webpack-plugin 必须装，因为在这个插件上拓展
            filename: xxx.html,
            template: xxx.html,
            inject:true,
            hash: false,
            cache: true,
            minify:{    //压缩HTML文件
                removeComments:true,    //移除HTML中的注释
                collapseWhitespace:true,    //删除空白符与换行符
            }
        }),
        new webpackWebp({
            cssDomain:'http://xxxxxxxxxxx',    //支持 字符串与['http://11.xxxx','http://22.xxxx']
            jsDomain:'http://xxxxxxxxxxx'
            imgPath: 'www/home/*',    //*.{jpg,png,jpeg}
            imgReg : ['jpg','png','jpeg'],
            quality:60
        })
	]
```


功能：

1、当页面存在<!--delete-->注释，该段代码将删除；<br/>
例：
```
    <script src="/xxx/reactPack.min.js"></script><!--delete-->
```

2、cssDomain与jsDomain 为页面添加域名功能，不用可以忽略；

3、imgPath 需要转换为webp的图片路径，imgReg 设置要转换图片格式<br/>
imgPath 支持字符串与数组 'www/home/*.{jpg,png,jpeg}' 或 ['xxx.{jpg,png,jpeg}'，'xxx.{jpg,png,jpeg}'];<br/>
imgPath 如果添加了图片扩展名，就以第一个路径的扩展名就过滤，imgReg 不需要填写；<br/>
imgReg 支持字符串与数组，过滤的需要转换为webp的图片，此时imgPath不需要添加扩展名；<br/>

4、quality 图片质量

(欢迎反馈BUG，方便提升插件的质量)
/**
 * Created by timxuan on 2016/11/17.
 */

"use strict";

let fs = require('fs'),
    path = require('path'),
    glob = require('glob'),
    cwebp = require('cwebp-binLocal'),
    execFile = require('child_process').execFile,
    UglifyJS = require("uglify-js");

let root = path.join(__dirname,'../..'),
    dataDir = path.join(process.env.HOME || root, '.webpackCache'),
    webpFileCache = path.join(dataDir,'webpFileCache.json'),
    class2type = {},
    webpCacheJson = {},
    nullwebpJson = {},
    jsContent = '';

let linkTest = /(?:\s*(<link([^>]*?)(stylesheet){1}([^>]*?)(?:\/)?>))/ig,
    styleUrl = /(?:\shref\s*=\s*)('([^'<>]+)'|"([^"<>]+)"|[^\s\/>]+)/i,
    ScriptTest = /(?:(\s*<script([^>]*)>([\s\S]*?)<\/script>))/ig,
    scriptSrc = /(?:\ssrc\s*=\s*)('([^<>']+)'|"([^<>\"]+)")/i,
    httpLink = /^(?:(https?):)?\/\/((?:\w+\.?)+)\/?/i,
    deleteComment = /((<!(?:--)?\[[\s\S]*?<\!\[endif\](?:--)?>|<!--[\s\S]*?(?:-->|$))|(?:(\s*<script[^>]*>[^<>]*<\/script>)|(?:\s*(<link([^>]*?)(?:\/)?>)|(<style([^>]*)>([\s\S]*?)<\/style>))))<!--delete-->/ig;

if(!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir);
}

if(fs.existsSync(webpFileCache)){
    webpCacheJson = JSON.parse(fs.readFileSync(webpFileCache),'utf8');
}

"Boolean Number String Function Array Date RegExp Object Error".split(" ").forEach(function(name){
    class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

let type = (obj) => {
    return obj == null ? String(obj) :
    class2type[toString.call(obj)] || "object";
};

function checkNum(num,len){
    return num >= len ? 0: (num < 0 ? (len - 1):num);
}

function replaceHtml(html,linkTest,urlTest,filePath,domain){
    let num = 0,
        len = 0,
        domainStr = domain,
        isArray = domain instanceof Array;

    if(isArray){
        len = domain.length;
        domainStr = '';
        if(len > 0){
            num = Math.floor(Math.random() / (1 / len));
            num = checkNum(num, len);
            domainStr = domain[num]
        }
    }

    return html.replace(linkTest,function(v,u){
        let urlPath =  v.replace(urlTest,function(url,$1){
            let route = $1.replace(/\'|\"/ig,'').trim(),
                realPath = path.isAbsolute(route)?route:path.join(filePath,route);

            if(route.match(httpLink)){
                return url.replace($1,`"${route}"`);
            }
            
            realPath = path.normalize(realPath).split('\\').join('\/');
            if(realPath.charAt(0) != '/'){
                realPath = '/' + realPath;
            }
            if(domainStr){
                let str = domainStr.charAt(domainStr.length - 1);
                if(str.match(/\\|\//gi)){
                    domainStr = domainStr.substring(0,domainStr.length - 1);
                }
                realPath = domainStr + realPath;
            }

            return url.replace($1,'"'+realPath+'"');
        });

        if(isArray){
            num = checkNum(num + 1, len);
            domainStr = domain[num];
        }

        return urlPath;
    });
}

function Webp(options){
    if(type(options) === 'object'){
        for (let i in options) this[i] = options[i];
    }

    this.quality = this.quality || 60;
    nullwebpJson.file = {};

    if(Array.isArray(this.imgReg)){
        this.imgFormat = '.{'+this.imgReg.toString()+'}';
    }else if(type(this.imgReg) === 'string'){
        this.imgFormat = '.'+this.imgReg;
    }

    if(!this.imgFormat){
        let imgSrc = '';

        if((this.imgPath && this.imgPath.trim().length > 0)){
            imgSrc = this.imgPath;
        }

        if(Array.isArray(this.imgPath) && this.imgPath.length > 0 && this.imgPath[0].trim().length > 0){
            imgSrc = this.imgPath;
        }

        if(imgSrc && (/\.\{?([a-zA-Z,]+)\}?$/gi).test(imgSrc)){
            let v = RegExp.$1;
            this.imgReg = v.indexOf(',') >= 0?v.split(','):v;
        }
    }
}

Webp.loader = function(){
    return path.join(__dirname,'loader.js');
};

Webp.prototype.apply = function(compiler) {
    let that = this;
    compiler.plugin("compilation", function(compilation) {

        compilation.plugin('html-webpack-plugin-before-html-processing', function(htmlPluginData, callback) {
            let htmlStr = htmlPluginData.html;
            if(htmlStr.trim()){
                htmlStr = htmlStr.replace(deleteComment,'');    //删除测试的css与js
                htmlStr = htmlStr.replace('</head>',that.webpJs() + '</head>');
            }
            htmlPluginData.html = htmlStr;
            callback(null, htmlPluginData);
        });

        compilation.plugin('html-webpack-plugin-after-html-processing', function(htmlPluginData, callback) {
            let htmlPath = htmlPluginData.plugin.options.filename,
                html = htmlPluginData.html,
                linkArray = html.match(linkTest),
                scriptArray = html.match(ScriptTest);

            if(linkArray && linkArray.length > 0 && that.cssDomain){
                html = replaceHtml(html,linkTest,styleUrl,htmlPath,that.cssDomain);
            }

            if(scriptArray && scriptArray.length > 0 && that.jsDomain){
                html = replaceHtml(html,ScriptTest,scriptSrc,htmlPath,that.jsDomain);
            }

            htmlPluginData.html = html;
            callback(null, htmlPluginData);
        });
    });

    compiler.plugin("after-emit", function(compilation, callback) {
        if(type(that.imgPath) === 'string'){
            that.changeWebP(that.imgPath);
        }

        if(Array.isArray(that.imgPath)){
            that.imgPath.forEach((src) => {
                that.changeWebP(src);
            })
        }
        callback();
    });

    that.changeWebP = (imgPath) => {
        imgPath += that.imgFormat?that.imgFormat:'';
        let fileArray = glob.sync(imgPath),
            len = fileArray.length,
            limit = len - 1;

        if(len <= 0){
            return;
        }

        fileArray.forEach((v,i) => {
            if(fs.existsSync(v) && fs.statSync(v).isFile()){
                let inPath = v,
                    outPath = inPath + '.webp';

                let value = fs.existsSync(outPath) && webpCacheJson.file && webpCacheJson.file[inPath];
                if(value == this.quality){
                    nullwebpJson.file[inPath] = this.quality;
                    if(limit == i){
                        that.writeCache();
                    }
                }else{
                    execFile(cwebp, (inPath + ' -q ' + this.quality +' -o ' + outPath).split(/\s+/), (err, stdout, stderr) => {
                        if(err){
                            console.log(err);
                        }else{
                            nullwebpJson.file[inPath] = this.quality;
                            if(limit == i){
                                that.writeCache();
                            }
                        }
                    });
                }
            }
        });
    };
    that.writeCache = () => {
        fs.writeFile(webpFileCache, JSON.stringify(nullwebpJson),(err) =>{
            if(err){
                console.log(err);
            }
        });
    };

    that.webpJs = () => {
        if(!jsContent){
            let result = UglifyJS.minify(__dirname+'/isWebp.js');
            jsContent = result.code.replace(/__imgReg/ig,that.imgReg.join('|'))
        }
        return '<script>'+jsContent+'</script>';
    };
};

module.exports = Webp;
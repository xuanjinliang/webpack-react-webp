/**
 * Created by timxuan on 2016/11/21.
 */

module.exports = function(content){
    this.cacheable && this.cacheable();
    if(content && (/module.exports\s*=\s*(.*);\s?$/gi).test(content)){
        let v = RegExp.$1;
        content = "module.exports = window.webPTool(" + v + ")";
    }
    return content;
};
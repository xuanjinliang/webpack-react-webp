/**
 * Created by timxuan on 2016/11/21.
 */
'use strict';
'use strict';
(function(){
    var imgReg = new RegExp('\\\.(?:__imgReg)',"gi");
    var kTestImages = 'UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==',
        img = new Image();
    img.onload = function(){
        window.isWebp = ((img.width > 0) && (img.height > 0));
    };
    img.onerror = function(){
        window.isWebp = false;
    };
    img.src = "data:image/webp;base64," + kTestImages;

    function isBase64(img){
        return img.match(/data:[^;]+;base64/gi);
    }

    function checkReg(img){
        return img.match(imgReg);
    }

    window.webPTool = function(img){
        return window.isWebp && !isBase64(img) && checkReg(img) ? (img + '.webp') : img;
    };
})();
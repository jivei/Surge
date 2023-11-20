/*
脚本作者：Sweet510
脚本日期：2023-03-31
引用地址：https://raw.githubusercontent.com/510004015/Quantumult_X/Remote/Premium/BaiduLibrary.conf
*/
var url = $request.url;
var modified = JSON.parse($response.body);
const URL1 = '/user/getinfo';
const URL2 = '/doc/getdocdownloadcopywriter';
if (url.indexOf(URL1) != -1) {
modified.data.vip.base_vip_info = {"end_time":4070880000,"uid":510004015,"is_vip":1,"pro_total":0,"start_time":1672502400,"type":2,"remain_day":365,"normal_total":0};
};
if (url.indexOf(URL2) != -1) {
modified.data.copywriter2 = "";
modified.data.downloadStatus = 21;
};
$done({body:JSON.stringify(modified)});
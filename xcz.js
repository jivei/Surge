/*

西窗烛：https://apps.apple.com/app/id912139104

[rewrite_local]
^https?:\/\/lchttpapi\.xczim\.com\/1.1\/users url script-response-body https://raw.githubusercontent.com/Guding88/Script/main/xichuangzhu.js

[MITM]
hostname = lchttpapi.xczim.com

*/
var guding = JSON.parse($response.body);
guding.username = "半个柚子";
guding.membership = true;
guding.lifetimeMembership = true;
$done({ body: JSON.stringify(halfpomelo) });

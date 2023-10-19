/*
脚本作者：佚名
脚本日期：2023-10-09 22:26:39
引用地址：
*/
var headers = $request['headers'];
delete headers["Authorization"];
delete headers["User-Agent"];
headers['buvid'] = "Y44D704C8D785C0E4EE78F2165D88F2AD166";
headers['authorization'] = "identify_v1 b0f1f8a9874d39973fde61de4aeef8a1CjB7fINGmSab94gCjJbImMIzmxbD_mIOC8roVJrENKF1CUPJaQHHfiWbCMVYU7gqvtUSVjJFVzNoM19fN2xPY2hGeE54YTdWeUF1NDQzd0k5Um5tcTRrNUdqVFRDZ3hxZWx4b2RFN0E3ZmlmcWR2TVVsV090ZkpIVnU3WVE2MW9OZDZDVnprMWNnIIEC";
headers['user-agent'] = "bili-universal/75100100 os/ios model/iPhone 15 Pro Max mobi_app/iphone osVer/17.1 network/2 grpc-objc-cronet/1.47.0 grpc-c/25.0.0 (ios; cronet_http)";
$done({ 'headers': headers });

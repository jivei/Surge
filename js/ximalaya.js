***********************************************/




var modifiedHeaders = $request.headers;
modifiedHeaders['Cookie'] = '请填入你或你朋友喜马拉雅会员账号的Cookie'
$done({headers : modifiedHeaders});

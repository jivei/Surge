var body = $response.body;
var obj = JSON.parse(body);
obj.data = {
  };
$done({body: JSON.stringify(obj)});

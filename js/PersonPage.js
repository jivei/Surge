let body = JSON.parse($response.body);
  body.data.cards = body.data.cards.filter(function(item) {
    if (item.tag == "profile" || item.tag == "priority"|| item.tag == "general" || item.tag == "wallet") {
      return true;
    }
    return false;
  });
if(body.data.cards.hasOwnProperty('1')){body['data']['cards']['3']['bottom_items']= [ ]};
$done({body: JSON.stringify(body)});

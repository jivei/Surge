let body = JSON.parse($response.body);
  body.data.order_cards.nav_list_card.data = body.data.order_cards.nav_list_card.data.filter(function(item) {
    if (item.category_name == "出行用滴滴"){
      return true;
    }
    return false;
  });
  body.data.disorder_cards.bottom_nav_list.data =[
          {
            "link" : "OneTravel:\/\/v6x_home\/entrance",
            "icon_active" : "https:\/\/img-hxy021.didistatic.com\/static\/apollofile\/do1_X6SIN2jy1VlvqRfKhn4l",
            "id" : "v6x_home",
            "text_active_color" : "#EA5E1E",
            "text" : "首页",
            "show_type" : "default",
            "text_active" : "",
            "icon_top" : "https:\/\/img-hxy021.didistatic.com\/static\/apollofile\/do1_JX6d2A8ZAW7A4TahE72d",
            "icon" : "https:\/\/img-hxy021.didistatic.com\/static\/apollofile\/do1_vl77BvBGTsVM4jnymaXE",
            "text_color" : "#757575"
          },
          {
            "icon_active" : "https:\/\/img-hxy021.didistatic.com\/static\/apollofile\/do1_9tKZulmflHQK8KAiyhlf",
            "id" : "user_center",
            "text_active_color" : "#EA5E1E",
            "text" : "我的",
            "show_type" : "default",
            "text_active" : "我的",
            "link" : "OneTravel:\/\/user_center\/entrance",
            "icon" : "https:\/\/img-hxy021.didistatic.com\/static\/apollofile\/do1_9YT4vT5MLZnpc8Y9utfJ",
            "text_color" : "#757575"
          }
        ]; 
$done({body: JSON.stringify(body)});



var objc = JSON.parse($response.body);

    objc = {
  "gift_cards" : [

  ],
  "in_app_purchases" : [

  ],
  "subscription_purchases" : [
    {
      "period" : "P1Y",
      "expires_at" : {
        "offset" : 19999999999999,
        "timestamp" : 199999999999
      },
      "sku_identifier" : "Premium_B_12Months",
      "is_referral" : true,
      "is_bundle" : true,
      "purchased_at" : {
        "offset" : 199999999999,
        "timestamp" : 1999999999999
      },
      "sandbox" : false,
      "app" : "cycles",
      "auto_renew" : true,
      "trial_period" : "P1W",
      "ownership" : "purchased",
      "gifted" : true,
      "grace_period_days" : 99999999,
      "status" : "normal",
      "store" : "app_store"
    }
  ],
  "has_valid_purchases" : true,
  "sister_app_subscription_purchases" : [

  ],
  "subscription_purchases_state" : 2059549510,
  "buyer_identifier" : "8433be22-b740-47b4-927a-5f30b724d864",
  "has_unauthorized_sandbox_purchases" : false
}


$done({body : JSON.stringify(objc)});

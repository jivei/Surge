// 改自 kokoryh RuCu6 2023-06-04 17:51:54
const url = $request.url;
if (!$response.body) $done({});
let i = JSON.parse($response.body);
if (url.includes("/x/v2/splash")) {
  const k = ["account", "event_list", "preload", "show"];
  if (i.data) {
    k.forEach((it) => {
      delete i.data[it];
    });
    i.data.max_time && (i.data.max_time = 0);
    i.data.min_interval && (i.data.min_interval = 31536000);
    i.data.pull_interval && (i.data.pull_interval = 31536000);
    if (i.data.list) {
      for (let is of i.data.list) {
        is.duration = 0;
        is.enable_pre_download = false;
        is.end_time = 2209046399;
        is.begin_time = 2208960000;
      }
    }
  }
} else if (url.includes("/x/resource/show/skin")) {
  if (i.data?.common_equip) {
    delete i.data.common_equip;
  }
} else if (url.includes("/x/v2/feed/index?")) {
  i.data?.items &&
    (i.data.items = i.data.items.filter(
      (i) =>
        !i.banner_item &&
        !i.ad_info &&
        -1 === i.card_goto?.indexOf("ad") &&
        ["small_cover_v2", "large_cover_v1", "large_cover_single_v9"].includes(
          i.card_type
        )
    ));
} else if (url.includes("/x/v2/feed/index/story?")) {
  i.data?.items &&
    (i.data.items = i.data.items.filter(
      (i) => !i.ad_info && -1 === i.card_goto?.indexOf("ad")
    ));
} else if (url.includes("/x/resource/show/tab")) {
  if (
    ((i.data.tab = [
      {
        id: 731,
        name: "直播",
        uri: "bilibili://live/home",
        tab_id: "直播tab",
        pos: 1,
      },
      {
        id: 477,
        name: "推荐",
        uri: "bilibili://pegasus/promo",
        tab_id: "推荐tab",
        pos: 2,
        default_selected: 1,
      },
      {
        id: 478,
        name: "热门",
        uri: "bilibili://pegasus/hottopic",
        tab_id: "热门tab",
        pos: 3,
      },
      {
        id: 6544,
        name: "番劇",
        uri: "bilibili:\/\/following\/home_bottom_tab_activity_tab\/6544",
        tab_id: "bangumi",
        pos: 4,
      },
      {
        id: 151,
        name: "影视",
        uri: "bilibili://pgc/cinema-tab",
        tab_id: "film",
        pos: 5,
      },
    ]),
    i.data?.bottom?.length > 3)
  ) {
    const e = [177, 179, 181];
    (i.data.top = [
      {
        id: 176,
        icon: "http://i0.hdslb.com/bfs/archive/d43047538e72c9ed8fd8e4e34415fbe3a4f632cb.png",
        tab_id: "消息Top",
        name: "消息",
        uri: "bilibili://link/im_home",
        pos: 1,
      },
    ]),
      (i.data.bottom = i.data.bottom.filter((i) => e.includes(i.id)));
  }
} else if (url.includes("/x/v2/account/mine?")) {
  if (i.data?.sections_v2) {
    const e = [
      396, 397, 398, 399, 402, 404, 407, 410, 494, 495, 496, 497, 500, 501, 544,
      171, 742, 172, 173,
    ];
    i.data.sections_v2.forEach((i) => {
      ((i.title = void 0), (i.type = void 0)),
        (i.items = i.items.filter((i) => e.includes(i.id))),
        (i.button = {}),
        (i.be_up_title = void 0),
        (i.tip_icon = void 0),
        (i.tip_title = void 0);
    }),
      i.data?.live_tip && (i.data.live_tip = {}),
      i.data?.answer && (i.data.answer = {}),
      (i.data.vip_section = void 0),
      (i.data.vip_section_v2 = void 0),
      i.data.vip.status ||
        ((i.data.vip_type = 2),
        (i.data.vip.type = 2),
        (i.data.vip.status = 1),
        (i.data.vip.vip_pay_type = 1),
        (i.data.vip.due_date = 466982416e4));
  }
} else if (url.includes("/x/v2/account/mine/ipad")) {
  if (i.data?.ipad_upper_sections) {
    delete i.data.ipad_upper_sections;
  }
  if (i.data?.ipad_recommend_sections) {
    const e = [789, 790];
    i.data.ipad_recommend_sections = i.data.ipad_recommend_sections.filter(
      (i) => e.includes(i.id)
    );
  }
  if (i.data?.ipad_more_sections) {
    const e = [797, 798];
    i.data.ipad_more_sections = i.data.ipad_more_sections.filter((i) =>
      e.includes(i.id)
    );
  }
} else if (url.includes("/x/v2/account/myinfo?")) {
  i.data?.vip &&
    !i.data.vip.status &&
    ((i.data.vip.type = 2),
    (i.data.vip.status = 1),
    (i.data.vip.vip_pay_type = 1),
    (i.data.vip.due_date = 466982416e4));
} else if (url.includes("/x/v2/search/square")) {
  i.data = [{ type: "history", title: "搜索历史" }];
} else if (url.includes("/xlive/app-room/v1/index/getInfoByRoom")) {
  i.data &&
    ((i.data.activity_banner_info = void 0),
    (i.data.shopping_info = { is_show: 0 }));
} else if (
  url.includes("pgc/page/bangumi") ||
  url.includes("pgc/page/cinema/tab?")
) {
  i.result?.modules &&
    i.result.modules.forEach((i) => {
      i.style.startsWith("tip") || [1283, 241, 1441, 1284].includes(i.module_id)
        ? (i.items = [])
        : i.style.startsWith("banner")
        ? (i.items = i.items.filter((i) => i.link.includes("play")))
        : i.style.startsWith("function") &&
          (i.items = i.items.filter((i) => i.blink.startsWith("bilibili")));
    });
}
$done({ body: JSON.stringify(i) });

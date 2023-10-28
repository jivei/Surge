/*

脚本参考 @Helge_0x00 
修改日期：2022.12.16
Surge配置参考注释
 
 ----------------------------------------
 
[Panel]
策略面板 = script-name=解锁检测,update-interval=7200

[Script]
解锁检测 = type=generic,timeout=30,script-path=https://raw.githubusercontent.com/githubdulong/Script/master/Stream-All.js,script-update-interval=0,argument=title=解锁检测&icon=headphones.circle&color=#FF2121

----------------------------------------

支持使用脚本使用 argument 参数自定义配置，如：argument=title=解锁检测&icon=headphones.circle&color=#FF2121，具体参数如下所示，
 * title: 面板标题
 * icon: SFSymbols 图标
 * color：图标颜色
 
 */

let args = getArgs();

const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
  'Accept-Language': 'en',
}

// 即将登陆
const STATUS_COMING = 2
// 支持解锁
const STATUS_AVAILABLE = 1
// 不支持解锁
const STATUS_NOT_AVAILABLE = 0
// 检测超时
const STATUS_TIMEOUT = -1
// 检测异常
const STATUS_ERROR = -2

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36';

(async () => {
  let now = new Date();
  let hour = now.getHours();
  let minutes = now.getMinutes();
  hour = hour > 9 ? hour : "0" + hour;
  minutes = minutes > 9 ? minutes : "0" + minutes;
  let panel_result = {
    title: `${args.title} | ${hour}:${minutes}` || `流媒体解锁查询 | ${hour}:${minutes}`,
    content: '',
    icon: args.icon || "play.circle",
    "icon-color": args.color || "#007aff",
  }
  let [{ region, status }] = await Promise.all([testDisneyPlus()])
  await Promise.all([check_youtube_premium(), check_netflix()])
    .then((result) => {
      console.log(result)
      let disney_result = ""
      if (status == STATUS_COMING) {
        //console.log(1)
        disney_result = "D+: 即将登陆~" + region.toUpperCase()
      } else if (status == STATUS_AVAILABLE) {
        //console.log(2)
        console.log(region)
        disney_result = "D+: \u2611" + region.toUpperCase()
        // console.log(result["Disney"])
      } else if (status == STATUS_NOT_AVAILABLE) {
        //console.log(3)
        disney_result = "D+: \u2612"
      } else if (status == STATUS_TIMEOUT) {
        disney_result = "D+: N/A"
      }
      result.push(disney_result)
      console.log(result)
      let content = result.join(' ')
      console.log(content)

      panel_result['content'] = content
    })
    .finally(() => {
      $done(panel_result)
    })
})()

function getArgs() {
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

async function check_youtube_premium() {
  let inner_check = () => {
    return new Promise((resolve, reject) => {
      let option = {
        url: 'https://www.youtube.com/premium',
        headers: REQUEST_HEADERS,
      }
      $httpClient.get(option, function (error, response, data) {
        if (error != null || response.status !== 200) {
          reject('Error')
          return
        }

        if (data.indexOf('Premium is not available in your country') !== -1) {
          resolve('Not Available')
          return
        }

        let region = ''
        let re = new RegExp('"countryCode":"(.*?)"', 'gm')
        let result = re.exec(data)
        if (result != null && result.length === 2) {
          region = result[1]
        } else if (data.indexOf('www.google.cn') !== -1) {
          region = 'CN'
        } else {
          region = 'US'
        }
        resolve(region)
      })
    })
  }

  let youtube_check_result = 'YT: '

  await inner_check()
    .then((code) => {
      if (code === 'Not Available') {
        youtube_check_result += '\u2612 |'
      } else {
        youtube_check_result += "\u2611" + code.toUpperCase() + ' |'
      }
    })
    .catch((error) => {
      youtube_check_result += 'N/A |'
    })

  return youtube_check_result
}

async function check_netflix() {
  let inner_check = (filmId) => {
    return new Promise((resolve, reject) => {
      let option = {
        url: 'https://www.netflix.com/title/' + filmId,
        headers: REQUEST_HEADERS,
      }
      $httpClient.get(option, function (error, response, data) {
        if (error != null) {
          reject('Error')
          return
        }

        if (response.status === 403) {
          reject('Not Available')
          return
        }

        if (response.status === 404) {
          resolve('Not Found')
          return
        }

        if (response.status === 200) {
          let url = response.headers['x-originating-url']
          let region = url.split('/')[3]
          region = region.split('-')[0]
          if (region == 'title') {
            region = 'US'
          }
          resolve(region)
          return
        }

        reject('Error')
      })
    })
  }

  let netflix_check_result = 'NF: '

  await inner_check(80062035)
    .then((code) => {
      if (code === 'Not Found') {
        return inner_check(80018499)
      }
      netflix_check_result += '\u2611' + code.toUpperCase() + ' |'
      return Promise.reject('BreakSignal')
    })
    .then((code) => {
      if (code === 'Not Found') {
        return Promise.reject('Not Available')
      }

      netflix_check_result += '⚠' + code.toUpperCase() + ' |'
      return Promise.reject('BreakSignal')
    })
    .catch((error) => {
      if (error === 'BreakSignal') {
        return
      }
      if (error === 'Not Available') {
        netflix_check_result += '\u2612 |'
        return
      }
      netflix_check_result += 'N/A |'
    })

  return netflix_check_result
}

async function testDisneyPlus() {
  try {
    let { region, cnbl } = await Promise.race([testHomePage(), timeout(7000)])
    console.log(`homepage: region=${region}, cnbl=${cnbl}`)
    // 即将登陆
    //  if (cnbl == 2) {
    //    return { region, status: STATUS_COMING }
    //  }
    let { countryCode, inSupportedLocation } = await Promise.race([getLocationInfo(), timeout(7000)])
    console.log(`getLocationInfo: countryCode=${countryCode}, inSupportedLocation=${inSupportedLocation}`)

    region = countryCode ?? region
    console.log("region:" + region)
    // 即将登陆
    if (inSupportedLocation === false || inSupportedLocation === 'false') {
      return { region, status: STATUS_COMING }
    } else {
      // 支持解锁
      return { region, status: STATUS_AVAILABLE }
    }

  } catch (error) {
    console.log("error:" + error)

    // 不支持解锁
    if (error === 'Not Available') {
      console.log("不支持")
      return { status: STATUS_NOT_AVAILABLE }
    }

    // 检测超时
    if (error === 'Timeout') {
      return { status: STATUS_TIMEOUT }
    }

    return { status: STATUS_ERROR }
  }
}

function getLocationInfo() {
  return new Promise((resolve, reject) => {
    let opts = {
      url: 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql',
      headers: {
        'Accept-Language': 'en',
        Authorization: 'ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84',
        'Content-Type': 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({
        query: 'mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }',
        variables: {
          input: {
            applicationRuntime: 'chrome',
            attributes: {
              browserName: 'chrome',
              browserVersion: '94.0.4606',
              manufacturer: 'apple',
              model: null,
              operatingSystem: 'macintosh',
              operatingSystemVersion: '10.15.7',
              osDeviceIds: [],
            },
            deviceFamily: 'browser',
            deviceLanguage: 'en',
            deviceProfile: 'macosx',
          },
        },
      }),
    }

    $httpClient.post(opts, function (error, response, data) {
      if (error) {
        reject('Error')
        return
      }

      if (response.status !== 200) {
        console.log('getLocationInfo: ' + data)
        reject('Not Available')
        return
      }

      data = JSON.parse(data)
      if (data?.errors) {
        console.log('getLocationInfo: ' + data)
        reject('Not Available')
        return
      }

      let {
        token: { accessToken },
        session: {
          inSupportedLocation,
          location: { countryCode },
        },
      } = data?.extensions?.sdk
      resolve({ inSupportedLocation, countryCode, accessToken })
    })
  })
}

function testHomePage() {
  return new Promise((resolve, reject) => {
    let opts = {
      url: 'https://www.disneyplus.com/',
      headers: {
        'Accept-Language': 'en',
        'User-Agent': UA,
      },
    }

    $httpClient.get(opts, function (error, response, data) {
      if (error) {
        reject('Error')
        return
      }
      if (response.status !== 200 || data.indexOf('Sorry, Disney+ is not available in your region.') !== -1) {
        reject('Not Available')
        return
      }

      let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/)
      if (!match) {
        resolve({ region: '', cnbl: '' })
        return
      }

      let region = match[1]
      let cnbl = match[2]
      resolve({ region, cnbl })
    })
  })
}

function timeout(delay = 5000) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('Timeout')
    }, delay)
  })
}

/*
作者：keywos wuhu@wuhu_zzz 整点猫咪
自定义icon、iconerr及icon-color，利用argument参数传递，不同参数用&链接
icon：支持☑️chatgpt时的图标，
iconerr：不支持✖️chatgpt时的图标，
icon-color：正常能使用时图标的颜色
iconerr-color：不能使用时图标颜色
如：argument=icon=lasso.and.sparkles&iconerr=xmark.seal.fill&icon-color=#336FA9&iconerr-color=#D65C51
注⚠️：当想要自定义图标，必须要本地编辑，即保存在主配置中
*/

let url = "http://chat.openai.com/cdn-cgi/trace";
let tf=["T1","XX","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BD","BB","BE","BZ","BJ","BT","BA","BW","BR","BG","BF","CV","CA","CL","CO","KM","CR","HR","CY","DK","DJ","DM","DO","EC","SV","EE","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IQ","IE","IL","IT","JM","JP","JO","KZ","KE","KI","KW","KG","LV","LB","LS","LR","LI","LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","MC","MN","ME","MA","MZ","MM","NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PE","PH","PL","PT","QA","RO","RW","KN","LC","VC","WS","SM","ST","SN","RS","SC","SL","SG","SK","SI","SB","ZA","ES","LK","SR","SE","CH","TH","TG","TO","TT","TN","TR","TV","UG","AE","US","UY","VU","ZM","BO","BN","CG","CZ","VA","FM","MD","PS","KR","TW","TZ","TL","GB"];
let tff=["plus","on"];

// 处理 argument 参数
let titlediy, icon, iconerr, iconColor, iconerrColor;
if (typeof $argument !== 'undefined') {
  const args = $argument.split('&');
  for (let i = 0; i < args.length; i++) {
  const [key, value] = args[i].split('=');
  if (key === 'title') {
    titlediy = value;
  } else if (key === 'icon') {
    icon = value;
  } else if (key === 'iconerr') {
    iconerr = value;
  } else if (key === 'icon-color') {
    iconColor = value;
  } else if (key === 'iconerr-color') {
    iconerrColor = value;
  }
  }
}

// 发送 HTTP 请求获取所在地信息
$httpClient.get(url, function(error, response, data){
  if (error) {
  console.error(error);
  $done();
  return;
  }

  let lines = data.split("\n");
  let cf = lines.reduce((acc, line) => {
  let [key, value] = line.split("=");
  acc[key] = value;
  return acc;
  }, {});
  let ip = cf.ip;
  let warp = cf.warp;
  let loc = getCountryFlagEmoji(cf.loc) + cf.loc;

  // 判断 ChatGPT 是否支持该国家/地区
  let l = tf.indexOf(cf.loc);
  let gpt, iconUsed;
  if (l !== -1) {
  gpt = "GPT: ✔️";
  iconUsed = icon ? icon : undefined;
  iconCol = iconColor ? iconColor : undefined;

  } else {
  gpt = "GPT: ✖️";
  iconUsed = iconerr ? iconerr : undefined;
  iconCol = iconerrColor ? iconerrColor : undefined;

  }

  // 获取 Warp 状态
  let w = tff.indexOf(warp);
  let warps;
  if (w !== -1) {
  warps = "✔️";
  } else {
  warps = "✖️";
  }

  // 组装通知数据
  let body = {
    title: titlediy ? titlediy : 'ChatGPT',
    content: `${gpt}   区域: ${loc}`,
    icon: iconUsed ? iconUsed : undefined,
    'icon-color': iconCol ? iconCol : undefined
  };

  // 发送通知
  $done(body);
});
//获取国旗Emoji函数
function getCountryFlagEmoji(countryCode) {
    if (countryCode.toUpperCase() == 'TW') {
      countryCode = 'CN'
    }
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt())
    return String.fromCodePoint(...codePoints)
}

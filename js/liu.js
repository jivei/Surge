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
  
  // 同时运行两个脚本并等待它们都完成
  let results = await Promise.all([check_youtube_premium(), check_netflix(), testDisneyPlus(), checkChatGPT()])
  
  // 处理结果
  let [{ region, status }] = results.pop() // 获取 testDisneyPlus 的结果并从数组中移除
  
  // 处理剩下的结果（来自 check_youtube_premium、check_netflix 和 checkChatGPT）
  results.push(status === STATUS_COMING ? "D+: 即将登陆~" + region.toUpperCase() : status === STATUS_AVAILABLE ? "D+: \u2611" + region.toUpperCase() : status === STATUS_NOT_AVAILABLE ? "D+: \u2612" : "D+: N/A")
  
  panel_result['content'] = results.join(' ')
  
  $done(panel_result)
})()

// ... 其他函数（getArgs、check_youtube_premium、check_netflix、testDisneyPlus 等）在这里 ...

// 添加 checkChatGPT 函数
function checkChatGPT() {
    let url = "http://chat.openai.com/cdn-cgi/trace";
    let tf=["T1","XX","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BD","BB","BE","BZ","BJ","BT","BA","BW","BR","BG","BF","CV","CA","CL","CO","KM","CR","HR","CY","DK","DJ","DM","DO","EC","SV","EE","FJ","FI","FR","GA","GM","GE","DE","GH","GR","GD","GT",...
    // ... 其他代码 ...
}

const url = "https://www.autohome.com.cn/oil/420100.html";
const cacheKey = "WuhanOilCache";

function show(content, color = "#34C759") {
    $done({
        title: "武汉今日油价",
        content: content,
        icon: "fuelpump.fill",
        "icon-color": color
    });
}

function fail(reason) {
    const cache = $persistentStore.read(cacheKey);

    if (cache) {
        show(cache + "\n⚠️ 刷新失败，以上为缓存", "#FF9500");
    } else {
        show("获取油价失败\n" + reason, "#FF3B30");
    }
}

$httpClient.get({
    url: url,
    headers: {
        "User-Agent": "Mozilla/5.0",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }
}, (error, response, data) => {

    if (error || !response || response.status !== 200 || !data) {
        return fail("网络请求异常");
    }

    try {
        const text = data
            .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;|&#160;/gi, " ")
            .replace(/&#35;/g, "#")
            .replace(/\s+/g, " ");

        function getPrice(grade, fuel) {
            const regex = new RegExp(
                "武汉\\s*" + grade +
                "\\s*(?:号|#)?\\s*" + fuel +
                "\\s*(?:为|：|:)?\\s*(\\d+\\.\\d{1,2})"
            );

            const match = text.match(regex);

            return match
                ? Number(match[1]).toFixed(2)
                : null;
        }

        const p92 = getPrice(92, "汽油");
        const p95 = getPrice(95, "汽油");
        const p98 = getPrice(98, "汽油");
        const p0 = getPrice(0, "柴油");

        if (![p92, p95, p98, p0].every(Boolean)) {
            return fail("网页数据解析失败");
        }

        const now = new Date(Date.now() + 8 * 3600000);
        const time = now.toISOString()
            .slice(0, 19)
            .replace("T", " ");

        const content = [
            `92# 汽油：¥${p92}/L`,
            `95# 汽油：¥${p95}/L`,
            `98# 汽油：¥${p98}/L`,
            `  0# 柴油：¥${p0}/L`,
            `━━━━━━━━━━━━`,
            `刷新：${time}`,
            `来源：汽车之家`
        ].join("\n");

        $persistentStore.write(content, cacheKey);

        show(content);

    } catch (e) {
        fail(String(e));
    }
});

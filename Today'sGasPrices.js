
const VERSION = "1.1.0";
const args = {};

for (const part of ($argument || "").split("&")) {
    const i = part.indexOf("=");
    if (i >= 0) args[part.slice(0,i)] = part.slice(i+1);
}

const city = args.city || "武汉";
const code = args.code || "420100";
const url = `https://www.autohome.com.cn/oil/${code}.html`;
const cacheKey = `OilPrice:${code}:${VERSION}`;

function show(content, color = "#34C759") {
    $done({
        title: `${city}今日油价`,
        content: content + `\n版本：v${VERSION}`,
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

if (args.version && args.version !== VERSION) {
    show(
        `⚠️ 版本不一致\n模块要求：v${args.version}\n请更新脚本`,
        "#FF9500"
    );
} else if (!/^\d{6}$/.test(code)) {
    fail("城市代码无效");
} else {
    $httpClient.get({
        url,
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

            const escapedCity = city.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            function getPrice(grade, fuel) {
                const match = text.match(new RegExp(
                    escapedCity +
                    "\\s*" + grade +
                    "\\s*(?:号|#)?\\s*" + fuel +
                    "\\s*(?:为|：|:)?\\s*(\\d+\\.\\d{1,2})"
                ));

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

            const time = new Date(Date.now() + 8 * 3600000)
                .toISOString()
                .slice(0, 19)
                .replace("T", " ");

            const content = [
                `92# 汽油：¥${p92}/L`,
                `95# 汽油：¥${p95}/L`,
                `98# 汽油：¥${p98}/L`,
                `\u20070# 柴油：¥${p0}/L`,
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
}

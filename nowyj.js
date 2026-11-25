
const args = {};

if (typeof $argument === "string") {
    $argument.split("&").forEach(item => {
        const index = item.indexOf("=");
        if (index > 0) {
            const key = item.slice(0, index);
            const value = item.slice(index + 1);
            args[key] = decodeURIComponent(value);
        }
    });
}

const city = (args.city || "武汉").trim();
const code = (args.code || "420100").trim();

const url = `https://www.autohome.com.cn/oil/${code}.html`;
const cacheKey = `OilPriceCache_${code}`;

function boldPrice(price) {
    const digits = [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];
    return String(price).replace(
        /\d/g, n => digits[Number(n)]
    );
}

function show(content, color = "#34C759") {
    $done({
        title: `${city}今日油价`,
        content: content,
        icon: "fuelpump.fill",
        "icon-color": color
    });
}

function fail(reason) {
    const cache = $persistentStore.read(cacheKey);

    if (cache) {
        show(
            cache + "\n⚠️ 刷新失败，以上为缓存",
            "#FF9500"
        );
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

        const safeCity = city
            .replace(/市$/, "")
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        function getPrice(grade, fuel) {
            const regex = new RegExp(
                safeCity + "(?:市)?\\s*" + grade +
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
            `92# 汽油：¥${boldPrice(p92)}/L`,
            `95# 汽油：¥${boldPrice(p95)}/L`,
            `98# 汽油：¥${boldPrice(p98)}/L`,
            `\u20070# 柴油：¥${boldPrice(p0)}/L`,
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

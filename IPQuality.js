
const policy = (
    typeof $argument === "string"
        ? $argument.trim()
        : ""
) || "PROXY";

function boldNumber(value) {
    const digits = [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];
    return String(value).replace(
        /\d/g, n => digits[Number(n)]
    );
}

function show(content, color = "#34C759") {
    $done({
        title: "IP 纯净度检测",
        content: content,
        icon: "checkmark.shield.fill",
        "icon-color": color
    });
}

function request(url) {
    return new Promise((resolve, reject) => {
        $httpClient.get({
            url: url,
            policy: policy,
            timeout: 8,
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Cache-Control": "no-cache",
                "Pragma": "no-cache"
            }
        }, (error, response, data) => {
            if (error || !response ||
                response.status !== 200 || !data) {
                return reject(new Error("请求失败"));
            }

            resolve(data);
        });
    });
}

async function getJSON(url) {
    return JSON.parse(await request(url));
}

async function safeRequest(task) {
    try {
        return await task();
    } catch (e) {
        return null;
    }
}

function detect(value) {
    if (value === true) return "⚠️ 已检出";
    if (value === false) return "未检出";
    return "未知";
}

function countryName(value) {
    const countries = {
        HK: "中国香港",
        TW: "中国台湾",
        MO: "中国澳门",
        CN: "中国大陆",
        US: "美国",
        JP: "日本",
        SG: "新加坡",
        KR: "韩国",
        GB: "英国",
        DE: "德国",
        FR: "法国",
        CA: "加拿大",
        AU: "澳大利亚",
        NL: "荷兰",
        MY: "马来西亚",
        TH: "泰国",
        VN: "越南",
        IN: "印度",
        ID: "印度尼西亚",
        RU: "俄罗斯",
        "Hong Kong": "中国香港",
        "Taiwan": "中国台湾",
        "China": "中国大陆",
        "United States": "美国",
        "Japan": "日本",
        "Singapore": "新加坡",
        "South Korea": "韩国",
        "United Kingdom": "英国",
        "Germany": "德国",
        "France": "法国",
        "Canada": "加拿大",
        "Australia": "澳大利亚",
        "Netherlands": "荷兰"
    };

    return countries[value] || value || "未知";
}

function networkType(data) {
    if (data.hosting === true) {
        return "数据中心 / 机房";
    }

    const types = {
        "residential": "住宅网络",
        "residential proxy": "住宅代理",
        "data center": "数据中心 / 机房",
        "datacenter": "数据中心 / 机房",
        "hosting": "数据中心 / 机房",
        "corporate": "企业网络",
        "business": "企业网络",
        "education": "教育网络",
        "mobile": "移动网络",
        "isp": "运营商网络"
    };

    const type = data.connection_type || "";

    return types[type.toLowerCase()] ||
        type || "未知";
}

function validScore(value) {
    if (value === null ||
        value === undefined ||
        value === "") {
        return null;
    }

    const score = Number(value);

    return Number.isFinite(score) &&
        score >= 0 && score <= 100
        ? score
        : null;
}

function formatScore(score) {
    return score === null
        ? "暂不可用"
        : `${boldNumber(score)}/𝟭𝟬𝟬`;
}

async function getScamalytics(ip) {
    const html = await request(
        `https://scamalytics.com/ip/${encodeURIComponent(ip)}`
    );

    const text = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ");

    const match = text.match(
        /Fraud\s+Score\s*[:：]?\s*(\d{1,3})\b/i
    );

    return match ? validScore(match[1]) : null;
}

function evaluate(scores) {
    const available = scores.filter(
        score => score !== null
    );

    if (!available.length) {
        return {
            label: "⚪ 暂无法评价",
            color: "#8E8E93"
        };
    }

    // 取两个平台中较高的风险评分
    const score = Math.max(...available);

    let label;
    let color;

    if (score >= 85) {
        label = "🔴 极高风险";
        color = "#FF3B30";
    } else if (score >= 60) {
        label = "🟠 高风险";
        color = "#FF9500";
    } else if (score > 30) {
        label = "🟡 中等风险";
        color = "#FFCC00";
    } else {
        label = "🟢 低风险";
        color = "#34C759";
    }

    if (available.length === 1) {
        label += "（单源）";
    }

    return { label, color };
}

async function main() {
    let ip = "";

    try {
        // 第一阶段：获取当前出口 IP
        const ipData = await safeRequest(() =>
            getJSON("https://api.ipify.org?format=json")
        );

        if (ipData && ipData.ip) {
            ip = ipData.ip;
        } else {
            const backup = await safeRequest(() =>
                getJSON("https://api.ipapi.is/")
            );

            ip = backup && backup.ip;
        }

        if (!ip) {
            throw new Error("无法获取出口 IP");
        }

        const encodedIP = encodeURIComponent(ip);

        // 第二阶段：并行查询三个数据源
        const results = await Promise.all([
            safeRequest(() =>
                getJSON(
                    `https://api.ipapi.is/?q=${encodedIP}`
                )
            ),
            safeRequest(() =>
                getJSON(
                    `https://api.ffraud.com/public/ip/${encodedIP}`
                )
            ),
            safeRequest(() =>
                getScamalytics(ip)
            )
        ]);

        const geo = results[0] || {};
        const fraud = results[1] &&
            results[1].success === true
            ? results[1] : {};

        const fraudScore = validScore(
            fraud.fraud_score
        );

        const riskScore = validScore(
            results[2]
        );

        const evaluation = evaluate([
            fraudScore,
            riskScore
        ]);

        const country = countryName(
            (fraud.geo && fraud.geo.country) ||
            (geo.location && geo.location.country) ||
            geo.country
        );

        const company = typeof geo.company === "string"
            ? geo.company
            : (geo.company && geo.company.name);

        const isp = fraud.ISP ||
            fraud.organization ||
            company ||
            "未知";

        const rawASN = fraud.ASN ||
            (geo.asn && geo.asn.asn) ||
            geo.asn;

        const asnMatch = String(rawASN || "")
            .match(/^(?:AS)?(\d+)/i);

        const asn = asnMatch
            ? `AS${asnMatch[1]}`
            : "未知";

        const abuseFlags = [
            fraud.is_abuser,
            fraud.recent_abuse
        ];

        const abuse = abuseFlags.includes(true)
            ? true
            : abuseFlags.every(v => v === false)
                ? false
                : undefined;

        const time = new Date(
            Date.now() + 8 * 3600000
        ).toISOString()
         .slice(0, 19)
         .replace("T", " ");

        const content = [
            `出口 IP：${ip}`,
            `归属地区：${country}`,
            `网络运营商：${isp}`,
            `ASN：${asn}`,
            `网络类型：${networkType(fraud)}`,
            "━━━━━━━━━━━━",
            `代理检测：${detect(fraud.proxy)}`,
            `VPN 检测：${detect(fraud.vpn)}`,
            `Tor 检测：${detect(fraud.tor)}`,
            `机房检测：${detect(fraud.hosting)}`,
            `历史滥用：${detect(abuse)}`,
            "━━━━━━━━━━━━",
            `欺诈评分：${formatScore(fraudScore)}`,
            `风险评分：${formatScore(riskScore)}`,
            `综合评价：${evaluation.label}`,
            "━━━━━━━━━━━━",
            `刷新：${time}`,
            "来源：ipapi.is / FFraud / Scamalytics"
        ].join("\n");

        show(content, evaluation.color);

    } catch (e) {
        show(
            (ip ? `出口 IP：${ip}\n` : "") +
            `检测失败：${e.message}`,
            "#FF3B30"
        );
    }
}

main();


const args = (
    typeof $argument === "string"
        ? $argument
        : "PROXY|5|500"
).split("|");

const policy = (args[0] || "PROXY").trim() || "PROXY";

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

const targetSeconds = clamp(
    Number(args[1]) || 5, 3, 10
);

const maxMB = clamp(
    Number(args[2]) || 500, 20, 1000
);

const MB = 1000000;
const maxBytes = maxMB * MB;
const chunkLimit = 2 * MB;
const warmupSize = 1 * MB;
const baseURL = "https://speed.cloudflare.com";
const barLength = 15;

function bold(value) {
    const digits = [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];

    return String(value).replace(
        /\d/g, n => digits[Number(n)]
    );
}

function testURL(bytes) {
    return `${baseURL}/__down?bytes=${bytes}` +
        `&t=${Date.now()}${Math.random()}`;
}

// HTTP请求，保留真实错误信息
function request(bytes, route, timeout = 10) {
    return new Promise((resolve, reject) => {
        const start = Date.now();

        $httpClient.get({
            url: testURL(bytes),
            policy: route,
            timeout: timeout,
            "binary-mode": true,
            headers: {
                "Cache-Control": "no-cache",
                "Pragma": "no-cache",
                "Accept-Encoding": "identity"
            }
        }, (error, response, data) => {
            const elapsed = Math.max(
                Date.now() - start, 1
            );

            if (error || !response) {
                return reject(new Error(
                    error
                        ? String(error.message || error)
                        : "服务器无响应"
                ));
            }

            if (Number(response.status) !== 200) {
                return reject(new Error(
                    `HTTP ${response.status}`
                ));
            }

            const received = data
                ? (data.byteLength || data.length || 0)
                : 0;

            if (bytes > 0 && received !== bytes) {
                return reject(new Error(
                    `数据不完整：${received}/${bytes} B`
                ));
            }

            resolve({
                bytes: received,
                elapsed: elapsed
            });
        });
    });
}

// 延迟测试：连续3次，取中位数
async function testLatency(route) {
    const samples = [];

    for (let i = 0; i < 3; i++) {
        try {
            const r = await request(0, route, 3);
            samples.push(r.elapsed);
        } catch (e) {}
    }

    if (!samples.length) return null;

    samples.sort((a, b) => a - b);

    const mid = Math.floor(samples.length / 2);

    return samples.length % 2
        ? samples[mid]
        : Math.round(
            (samples[mid - 1] + samples[mid]) / 2
        );
}

// 自适应下载测速
async function adaptiveDownload(route) {
    let totalBytes = 0;
    let measuredBytes = 0;
    let measuredTime = 0;
    let samples = 0;
    let estimatedRate = 0;
    let warning = "";

    // 第一阶段：1MB预测速
    let warmup;

    try {
        warmup = await request(
            warmupSize, route, 30
        );
    } catch (e) {
        return {
            speed: null,
            bytes: null,
            duration: 0,
            samples: 0,
            warning: "预测速失败：" + e.message
        };
    }

    totalBytes += warmup.bytes;

    estimatedRate =
        warmup.bytes / warmup.elapsed;

    // 第二阶段：自适应正式测速
    const targetMS = targetSeconds * 1000;
    const start = Date.now();

    while (
        measuredTime < targetMS &&
        totalBytes < maxBytes &&
        Date.now() - start < targetMS + 5000
    ) {
        const remainingTime = Math.max(
            250, targetMS - measuredTime
        );

        const segmentTime = Math.min(
            1000, remainingTime
        );

        let nextBytes = Math.round(
            estimatedRate * segmentTime
        );

        nextBytes = clamp(
            nextBytes, 128000, chunkLimit
        );

        nextBytes = Math.min(
            nextBytes,
            maxBytes - totalBytes
        );

        if (nextBytes <= 0) break;

        try {
            // 严格串行下载
            const r = await request(
                nextBytes, route, 10
            );

            totalBytes += r.bytes;
            measuredBytes += r.bytes;
            measuredTime += r.elapsed;
            samples++;

            const currentRate =
                r.bytes / r.elapsed;

            estimatedRate =
                estimatedRate * 0.4 +
                currentRate * 0.6;

        } catch (e) {
            warning = "测速中断：" + e.message;
            break;
        }
    }

    if (
        measuredBytes <= 0 ||
        measuredTime <= 0
    ) {
        return {
            speed: null,
            bytes: totalBytes,
            duration: 0,
            samples: 0,
            warning: warning || "正式测速失败"
        };
    }

    const speed =
        measuredBytes * 8 /
        (measuredTime / 1000) /
        1000000;

    if (measuredTime < targetMS && !warning) {
        warning = totalBytes >= maxBytes
            ? "已达流量上限"
            : "已达测速时间限制";
    }

    return {
        speed: speed,
        bytes: totalBytes,
        duration: measuredTime / 1000,
        samples: samples,
        warning: warning
    };
}

// 单条线路完整测速
async function testRoute(route) {
    const latency = await testLatency(route);
    const download = await adaptiveDownload(route);

    return {
        latency: latency,
        ...download
    };
}

// 优化后的进度条
function progressBar(speed, maxSpeed) {
    if (speed === null || maxSpeed <= 0) {
        return "┄".repeat(barLength);
    }

    const filled = clamp(
        Math.round(speed / maxSpeed * barLength),
        0,
        barLength
    );

    return "━".repeat(filled) +
        "┄".repeat(barLength - filled);
}

function formatSpeed(speed) {
    return speed === null
        ? "测速失败"
        : `${bold(speed.toFixed(2))} Mbps`;
}

function formatLatency(latency) {
    return latency === null
        ? "检测失败"
        : `${bold(latency)} ms`;
}

function formatTraffic(bytes) {
    return bytes === null
        ? "未知"
        : `${(bytes / MB).toFixed(2)} MB`;
}

function routeContent(name, result, maxSpeed) {
    return [
        name,
        formatSpeed(result.speed),
        progressBar(result.speed, maxSpeed),
        `延迟：${formatLatency(result.latency)}`,
        `耗时：${result.duration.toFixed(2)} 秒`,
        `流量：${formatTraffic(result.bytes)}`,
        ...(result.warning
            ? [`提示：${result.warning}`]
            : [])
    ];
}

async function main() {
    try {
        // 第一阶段：直连完整测速
        const direct = await testRoute("DIRECT");

        // 第二阶段：代理完整测速
        const proxy = await testRoute(policy);

        const maxSpeed = Math.max(
            direct.speed || 0,
            proxy.speed || 0
        );

        let retention = "无法计算";
        let loss = "无法计算";
        let extraLatency = "无法计算";
        let color = "#8E8E93";

        if (
            direct.speed !== null &&
            proxy.speed !== null &&
            direct.speed > 0
        ) {
            const ratio =
                proxy.speed / direct.speed * 100;

            retention =
                `${bold(ratio.toFixed(2))}%`;

            loss = ratio > 100
                ? `提升 ${bold(
                    (ratio - 100).toFixed(2)
                )}%`
                : `${bold(
                    (100 - ratio).toFixed(2)
                )}%`;

            color = ratio >= 80
                ? "#34C759"
                : ratio >= 40
                    ? "#FFCC00"
                    : "#FF9500";
        }

        if (
            direct.latency !== null &&
            proxy.latency !== null
        ) {
            const diff =
                proxy.latency - direct.latency;

            extraLatency =
                (diff > 0 ? "+" : "") +
                bold(diff) + " ms";
        }

        if (
            direct.speed === null ||
            proxy.speed === null
        ) {
            color = "#FF3B30";
        }

        const totalTraffic =
            direct.bytes === null ||
            proxy.bytes === null
                ? "未知"
                : formatTraffic(
                    direct.bytes + proxy.bytes
                );

        const time = new Date(
            Date.now() + 8 * 3600000
        ).toISOString()
         .slice(0, 19)
         .replace("T", " ");

        const content = [
            ...routeContent(
                "🌐 直连网络",
                direct,
                maxSpeed
            ),

            "",

            ...routeContent(
                `🚀 ${policy}`,
                proxy,
                maxSpeed
            ),

            "━━━━━━━━━━━━",
            `速度保留：${retention}`,
            `速度损耗：${loss}`,
            `额外延迟：${extraLatency}`,
            "━━━━━━━━━━━━",
            `总下载量：${totalTraffic}`,
            `测速模式：自适应 ${targetSeconds} 秒`,
            "来源：Cloudflare",
            `刷新：${time}`
        ].join("\n");

        $done({
            title: "直连与代理测速",
            content: content,
            icon: "speedometer",
            "icon-color": color
        });

    } catch (e) {
        $done({
            title: "直连与代理测速",
            content: `测速失败：${e.message}`,
            icon: "speedometer",
            "icon-color": "#FF3B30"
        });
    }
}

main();

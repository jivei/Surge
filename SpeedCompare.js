
/**
 * Surge 直连与代理测速
 * Version: 2.0.0
 *
 * 多路并发、自适应下载测速
 * DIRECT 与代理严格串行
 * 无需 API Key
 */

const VERSION = "2.0.0";

const args = (
    typeof $argument === "string"
        ? $argument
        : "PROXY|10|1000"
).split("|");

const POLICY = (args[0] || "PROXY").trim() || "PROXY";

const MB = 1000000;
const BASE_URL = "https://speed.cloudflare.com";

function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
}

const TARGET_TIME = clamp(
    Number(args[1]) || 10, 5, 15
) * 1000;

const MAX_BYTES = Math.floor(
    clamp(Number(args[2]) || 1000, 20, 2000) * MB
);

const MIN_CHUNK = 128000;
const MAX_CHUNK = 4 * MB;
const INITIAL_CHUNK = 512000;

const INITIAL_CONCURRENCY = 4;
const MAX_CONCURRENCY = 8;

const BAR_LENGTH = 15;

function bold(value) {
    const digits = [..."𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];

    return String(value).replace(
        /\d/g,
        n => digits[Number(n)]
    );
}

function median(values) {
    if (!values.length) return null;

    const sorted = [...values].sort(
        (a, b) => a - b
    );

    const mid = Math.floor(sorted.length / 2);

    return sorted.length % 2
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function testURL(bytes) {
    return `${BASE_URL}/__down?bytes=${bytes}` +
        `&t=${Date.now()}_${Math.random()}`;
}

// HTTP 下载请求
function request(bytes, policy, timeout = 10) {
    return new Promise(resolve => {
        const start = Date.now();

        $httpClient.get({
            url: testURL(bytes),
            policy: policy,
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

            const received = data
                ? (data.byteLength || data.length || 0)
                : 0;

            if (error || !response) {
                return resolve({
                    ok: false,
                    bytes: 0,
                    elapsed: elapsed,
                    error: error
                        ? String(error.message || error)
                        : "服务器无响应"
                });
            }

            const status = Number(response.status);

            if (status !== 200) {
                return resolve({
                    ok: false,
                    bytes: 0,
                    elapsed: elapsed,
                    error: `HTTP ${status}`
                });
            }

            if (bytes > 0 && received !== bytes) {
                return resolve({
                    ok: false,
                    bytes: received,
                    elapsed: elapsed,
                    error: `数据不完整 ${received}/${bytes} B`
                });
            }

            resolve({
                ok: true,
                bytes: received,
                elapsed: elapsed,
                error: ""
            });
        });
    });
}

// 延迟及抖动测试
async function testLatency(policy) {
    const samples = [];

    for (let i = 0; i < 5; i++) {
        const r = await request(0, policy, 3);

        if (r.ok) {
            samples.push(r.elapsed);
        }
    }

    if (!samples.length) {
        return {
            latency: null,
            jitter: null
        };
    }

    const differences = [];

    for (let i = 1; i < samples.length; i++) {
        differences.push(
            Math.abs(samples[i] - samples[i - 1])
        );
    }

    const jitter = differences.length
        ? differences.reduce((a, b) => a + b, 0) /
          differences.length
        : null;

    return {
        latency: Math.round(median(samples)),
        jitter: jitter === null
            ? null
            : Math.round(jitter)
    };
}

// 多路并发自适应下载测速
async function testDownload(policy) {
    let chunk = INITIAL_CHUNK;
    let concurrency = INITIAL_CONCURRENCY;

    let requestedBytes = 0;
    let receivedBytes = 0;
    let measuredBytes = 0;
    let measuredTime = 0;

    let rounds = 0;
    let failedRounds = 0;
    let lastError = "";
    let warning = "";

    let peakConcurrency = concurrency;
    let peakChunk = chunk;

    const start = Date.now();

    while (
        measuredTime < TARGET_TIME &&
        requestedBytes < MAX_BYTES &&
        Date.now() - start < TARGET_TIME + 20000
    ) {
        const jobs = [];

        // 创建同一线路的并发请求
        for (let i = 0; i < concurrency; i++) {
            const remaining =
                MAX_BYTES - requestedBytes;

            if (remaining <= 0) break;

            const size = Math.floor(
                Math.min(chunk, remaining)
            );

            if (size <= 0) break;

            // 请求前预留流量，失败也计入上限
            requestedBytes += size;

            jobs.push(size);
        }

        if (!jobs.length) break;

        const roundStart = Date.now();

        const results = await Promise.all(
            jobs.map(size =>
                request(size, policy, 10)
            )
        );

        const roundTime = Math.max(
            Date.now() - roundStart, 1
        );

        const successful = results.filter(
            r => r.ok
        );

        const failed = results.filter(
            r => !r.ok
        );

        const roundBytes = successful.reduce(
            (sum, r) => sum + r.bytes, 0
        );

        receivedBytes += results.reduce(
            (sum, r) => sum + r.bytes, 0
        );

        peakConcurrency = Math.max(
            peakConcurrency, jobs.length
        );

        peakChunk = Math.max(
            peakChunk, chunk
        );

        if (failed.length) {
            lastError = failed[0].error;

            // 请求失败时自动降低内存压力
            chunk = Math.max(
                MIN_CHUNK,
                Math.floor(chunk / 2)
            );

            concurrency = Math.max(
                1, Math.floor(concurrency / 2)
            );
        }

        if (!successful.length) {
            failedRounds++;

            // 防止持续失败时无限重试
            if (failedRounds >= 3) {
                warning = lastError;
                break;
            }

            // 已进入正式测速后，失败耗时也计入
            if (rounds > 0) {
                measuredTime += roundTime;
            }

            continue;
        }

        failedRounds = 0;

        const roundSpeed =
            roundBytes * 8 / roundTime / 1000;

        // 第一轮作为预热，不计入正式测速
        if (rounds > 0) {
            measuredBytes += roundBytes;
            measuredTime += roundTime;
        }

        rounds++;

        // 动态调整分段大小与并发数
        if (!failed.length) {
            if (roundTime < 1000) {
                chunk = Math.min(
                    MAX_CHUNK,
                    Math.floor(chunk * 2)
                );
            } else if (roundTime > 2500) {
                chunk = Math.max(
                    MIN_CHUNK,
                    Math.floor(chunk * 0.7)
                );
            }

            if (
                roundSpeed > 100 &&
                chunk >= 2 * MB
            ) {
                concurrency = Math.min(
                    MAX_CONCURRENCY,
                    concurrency + 1
                );
            }

            if (roundSpeed < 10) {
                concurrency = Math.max(
                    1, concurrency - 1
                );
            }
        }
    }

    if (
        measuredBytes <= 0 ||
        measuredTime <= 0
    ) {
        return {
            speed: null,
            bytes: receivedBytes,
            duration: 0,
            concurrency: peakConcurrency,
            chunk: peakChunk,
            warning: warning ||
                lastError ||
                "有效测速数据不足"
        };
    }

    // 总有效字节数 ÷ 实际并发批次耗时
    const speed =
        measuredBytes * 8 /
        measuredTime / 1000;

    if (measuredTime < TARGET_TIME) {
        warning = warning || (
            requestedBytes >= MAX_BYTES
                ? "已达流量上限"
                : "测速提前结束"
        );
    }

    if (lastError && !warning) {
        warning = "部分请求失败，已自动降级";
    }

    return {
        speed: speed,
        bytes: receivedBytes,
        duration: measuredTime / 1000,
        concurrency: peakConcurrency,
        chunk: peakChunk,
        warning: warning
    };
}

// 单条线路完整测试
async function testRoute(policy) {
    const latency = await testLatency(policy);
    const download = await testDownload(policy);

    return {
        ...latency,
        ...download
    };
}

// 相对速度进度条
function progressBar(speed, maxSpeed) {
    if (speed === null || maxSpeed <= 0) {
        return "┄".repeat(BAR_LENGTH);
    }

    const filled = clamp(
        Math.round(speed / maxSpeed * BAR_LENGTH),
        0,
        BAR_LENGTH
    );

    return "━".repeat(filled) +
        "┄".repeat(BAR_LENGTH - filled);
}

function formatSpeed(speed) {
    return speed === null
        ? "测速失败"
        : `${bold(speed.toFixed(2))} Mbps`;
}

function formatMS(value) {
    return value === null
        ? "未知"
        : `${bold(value)} ms`;
}

function formatTraffic(bytes) {
    if (bytes >= 1000 * MB) {
        return `${(bytes / MB / 1000).toFixed(2)} GB`;
    }

    return `${(bytes / MB).toFixed(2)} MB`;
}

function routeContent(name, result, maxSpeed) {
    return [
        name,
        formatSpeed(result.speed),
        progressBar(result.speed, maxSpeed),
        `延迟：${formatMS(result.latency)}`,
        `抖动：${formatMS(result.jitter)}`,
        `耗时：${result.duration.toFixed(1)} 秒`,
        `流量：${formatTraffic(result.bytes)}`,
        ...(result.warning
            ? [`提示：${result.warning}`]
            : [])
    ];
}

async function main() {
    try {
        // 第一阶段：DIRECT
        const direct = await testRoute("DIRECT");

        // 第二阶段：指定策略或节点
        // DIRECT 全部完成后才开始
        const proxy = await testRoute(POLICY);

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
            direct.bytes + proxy.bytes;

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
                `🚀 ${POLICY}`,
                proxy,
                maxSpeed
            ),

            "━━━━━━━━━━━━━━━",
            `速度保留：${retention}`,
            `速度损耗：${loss}`,
            `额外延迟：${extraLatency}`,
            "━━━━━━━━━━━━━━━",
            `总下载量：${formatTraffic(totalTraffic)}`,
            `峰值并发：${direct.concurrency}/${proxy.concurrency} 路`,
            `测速模式：自适应 ${TARGET_TIME / 1000} 秒`,
            "测速来源：Cloudflare",
            `脚本版本：${VERSION}`,
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
            content: [
                `测速失败：${e.message}`,
                `脚本版本：${VERSION}`
            ].join("\n"),
            icon: "speedometer",
            "icon-color": "#FF3B30"
        });
    }
}

main();

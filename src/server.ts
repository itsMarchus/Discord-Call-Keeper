import http from "node:http";
import { Client } from "discord.js";
import { VoiceCallKeeper } from "./voice";

export function startHttpServer(
  port: number,
  client: Client,
  voiceKeeper: VoiceCallKeeper
): http.Server {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // Endpoint: /healthz (Lightweight JSON for UptimeRobot / Health Checkers)
    if (url.pathname === "/healthz" || url.pathname === "/ping") {
      const isHealthy = client.isReady();
      const stats = voiceKeeper.stats;
      const uptimeSec = Math.floor(process.uptime());

      const data = {
        status: isHealthy ? "healthy" : "starting",
        botOnline: client.isReady(),
        botTag: client.user?.tag || null,
        botPingMs: client.ws.ping >= 0 ? client.ws.ping : null,
        voiceConnected: stats.isConnected,
        voiceStatus: stats.status,
        guildName: stats.guildName,
        channelName: stats.channelName,
        reconnectCount: stats.reconnectCount,
        connectedSince: stats.connectedSince ? stats.connectedSince.toISOString() : null,
        processUptimeSeconds: uptimeSec,
        memoryUsageMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        timestamp: new Date().toISOString(),
      };

      res.writeHead(isHealthy ? 200 : 503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      });
      res.end(JSON.stringify(data, null, 2));
      return;
    }

    // Endpoint: / (Rich Web Dashboard)
    if (url.pathname === "/") {
      const stats = voiceKeeper.stats;
      const botOnline = client.isReady();
      const botTag = client.user?.tag || "Connecting...";
      const botPing = client.ws.ping >= 0 ? `${client.ws.ping}ms` : "N/A";
      const connectedTimestamp = stats.connectedSince ? stats.connectedSince.getTime() : null;
      const memMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Discord Call Keeper | 24/7 Voice Monitor</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0e14;
      --card-bg: rgba(22, 27, 34, 0.75);
      --border: rgba(255, 255, 255, 0.08);
      --accent-discord: #5865F2;
      --accent-green: #57F287;
      --accent-red: #ED4245;
      --accent-yellow: #FEE75C;
      --text-main: #f0f6fc;
      --text-muted: #8b949e;
      --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 15%, rgba(88, 101, 242, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 85% 85%, rgba(87, 242, 135, 0.08) 0%, transparent 40%);
      color: var(--text-main);
      font-family: var(--font-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .container {
      width: 100%;
      max-width: 760px;
    }

    .header {
      text-align: center;
      margin-bottom: 28px;
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(88, 101, 242, 0.15);
      border: 1px solid rgba(88, 101, 242, 0.3);
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #9aa5ff;
      margin-bottom: 12px;
    }

    .title {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #ffffff 40%, #9aa5ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }

    .subtitle {
      color: var(--text-muted);
      font-size: 1rem;
    }

    .card {
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
      margin-bottom: 20px;
    }

    .status-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pulse-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background-color: ${stats.isConnected ? "var(--accent-green)" : "var(--accent-red)"};
      position: relative;
      box-shadow: 0 0 12px ${stats.isConnected ? "var(--accent-green)" : "var(--accent-red)"};
    }

    .pulse-dot::after {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      border-radius: 50%;
      border: 2px solid ${stats.isConnected ? "var(--accent-green)" : "var(--accent-red)"};
      animation: pulse 2s infinite ease-out;
    }

    @keyframes pulse {
      0% { transform: scale(0.9); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .status-text h3 {
      font-size: 1.15rem;
      font-weight: 700;
    }

    .status-text p {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .badge {
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .badge.active {
      background: rgba(87, 242, 135, 0.15);
      color: var(--accent-green);
      border: 1px solid rgba(87, 242, 135, 0.3);
    }

    .badge.offline {
      background: rgba(237, 66, 69, 0.15);
      color: var(--accent-red);
      border: 1px solid rgba(237, 66, 69, 0.3);
    }

    .uptime-section {
      text-align: center;
      padding: 16px 0 24px;
    }

    .uptime-label {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      font-weight: 600;
      margin-bottom: 8px;
    }

    .uptime-clock {
      font-family: var(--font-mono);
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: #ffffff;
      text-shadow: 0 0 20px rgba(88, 101, 242, 0.35);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .metric-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .metric-title {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-value {
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .guide-card {
      background: rgba(88, 101, 242, 0.06);
      border: 1px solid rgba(88, 101, 242, 0.2);
      border-radius: 14px;
      padding: 18px 22px;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .guide-card h4 {
      color: #9aa5ff;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .guide-card code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: #57F287;
    }

    .footer {
      text-align: center;
      margin-top: 16px;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .footer a {
      color: #9aa5ff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-badge">
        <span>⚡ 24/7 Voice Channel Sustainer</span>
      </div>
      <h1 class="title">Discord Call Keeper</h1>
      <p class="subtitle">Keeping your server voice call alive continuously</p>
    </div>

    <div class="card">
      <div class="status-banner">
        <div class="status-indicator">
          <div class="pulse-dot"></div>
          <div class="status-text">
            <h3>${stats.status}</h3>
            <p>${botOnline ? `Bot: ${botTag}` : "Connecting to Discord Gateway..."}</p>
          </div>
        </div>
        <span class="badge ${stats.isConnected ? "active" : "offline"}">
          ${stats.isConnected ? "Call Sustained" : "Disconnected"}
        </span>
      </div>

      <div class="uptime-section">
        <div class="uptime-label">Active Connected Duration</div>
        <div class="uptime-clock" id="uptime-clock">00:00:00</div>
      </div>

      <div class="grid">
        <div class="metric-card">
          <div class="metric-title">Server (Guild)</div>
          <div class="metric-value" title="${stats.guildName}">${stats.guildName}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Voice Channel</div>
          <div class="metric-value" title="${stats.channelName}">🔊 ${stats.channelName}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Discord Ping</div>
          <div class="metric-value">${botPing}</div>
        </div>
        <div class="metric-card">
          <div class="metric-title">Memory (RSS)</div>
          <div class="metric-value">${memMb} MB</div>
        </div>
      </div>
    </div>

    <div class="guide-card">
      <h4>🌐 Keep-Alive Monitoring (Render + UptimeRobot)</h4>
      <p>
        Render free web services spin down after 15 minutes of inactivity. 
        Add this URL (<code id="current-url"></code>) or <code>/healthz</code> as an <strong>HTTP(s) monitor in UptimeRobot</strong> set to ping every <strong>5 minutes</strong> to keep this service alive 24/7!
      </p>
    </div>

    <div class="footer">
      Discord Call Keeper &bull; Open Source Project &bull; <a href="/healthz" target="_blank">View JSON Health (/healthz)</a>
    </div>
  </div>

  <script>
    document.getElementById('current-url').textContent = window.location.origin;

    const connectedSince = ${connectedTimestamp};
    const clockEl = document.getElementById('uptime-clock');

    function updateClock() {
      if (!connectedSince) {
        clockEl.textContent = "Connecting...";
        return;
      }
      const now = Date.now();
      const diffMs = Math.max(0, now - connectedSince);
      const totalSec = Math.floor(diffMs / 1000);

      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const pad = (n) => String(n).padStart(2, '0');

      if (days > 0) {
        clockEl.textContent = \`\${days}d \${pad(hours)}h \${pad(minutes)}m \${pad(seconds)}s\`;
      } else {
        clockEl.textContent = \`\${pad(hours)}:\${pad(minutes)}:\${pad(seconds)}\`;
      }
    }

    updateClock();
    setInterval(updateClock, 1000);
  </script>
</body>
</html>`;

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(html);
      return;
    }

    // 404 for any unknown route
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`[HTTP Server] Health check and status web dashboard running on port ${port}`);
  });

  return server;
}

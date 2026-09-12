import { describe, it } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { startHttpServer } from "../src/server";
import { VoiceCallKeeper } from "../src/voice";
import { Client } from "discord.js";

describe("HTTP Server & Health Endpoints", () => {
  it("should respond to /healthz with correct JSON payload and status", async () => {
    // Mock minimal Discord client
    const mockClient = {
      isReady: () => true,
      user: { tag: "CallKeeperBot#0001" },
      ws: { ping: 42 },
    } as unknown as Client;

    // Mock minimal VoiceCallKeeper
    const mockVoiceKeeper = {
      stats: {
        isConnected: true,
        status: "Connected (24/7 Active)",
        guildId: "111",
        guildName: "Test Guild",
        channelId: "222",
        channelName: "Test VC",
        connectedSince: new Date("2026-09-10T00:00:00Z"),
        reconnectCount: 0,
        lastDisconnectReason: null,
      },
    } as unknown as VoiceCallKeeper;

    const testPort = 3999;
    const server = startHttpServer(testPort, mockClient, mockVoiceKeeper);

    try {
      const response = await new Promise<{ statusCode: number; data: any }>((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/healthz`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 0,
              data: JSON.parse(body),
            });
          });
        }).on("error", reject);
      });

      assert.equal(response.statusCode, 200);
      assert.equal(response.data.status, "healthy");
      assert.equal(response.data.botOnline, true);
      assert.equal(response.data.botTag, "CallKeeperBot#0001");
      assert.equal(response.data.botPingMs, 42);
      assert.equal(response.data.voiceConnected, true);
      assert.equal(response.data.voiceStatus, "Connected (24/7 Active)");
      assert.equal(response.data.guildName, "Test Guild");
      assert.equal(response.data.channelName, "Test VC");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should respond with 503 when bot is not ready", async () => {
    const mockClient = {
      isReady: () => false,
      user: null,
      ws: { ping: -1 },
    } as unknown as Client;

    const mockVoiceKeeper = {
      stats: {
        isConnected: false,
        status: "Initializing",
        guildId: "111",
        guildName: "Unknown Guild",
        channelId: "222",
        channelName: "Unknown Channel",
        connectedSince: null,
        reconnectCount: 0,
        lastDisconnectReason: null,
      },
    } as unknown as VoiceCallKeeper;

    const testPort = 3998;
    const server = startHttpServer(testPort, mockClient, mockVoiceKeeper);

    try {
      const response = await new Promise<{ statusCode: number; data: any }>((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/healthz`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 0,
              data: JSON.parse(body),
            });
          });
        }).on("error", reject);
      });

      assert.equal(response.statusCode, 503);
      assert.equal(response.data.status, "starting");
      assert.equal(response.data.botOnline, false);
      assert.equal(response.data.voiceConnected, false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("should render the web dashboard HTML on GET /", async () => {
    const mockClient = {
      isReady: () => true,
      user: { tag: "CallKeeperBot#0001" },
      ws: { ping: 25 },
    } as unknown as Client;

    const mockVoiceKeeper = {
      stats: {
        isConnected: true,
        status: "Connected (24/7 Active)",
        guildId: "111",
        guildName: "Test Guild",
        channelId: "222",
        channelName: "General Voice",
        connectedSince: new Date(),
        reconnectCount: 0,
        lastDisconnectReason: null,
      },
    } as unknown as VoiceCallKeeper;

    const testPort = 3997;
    const server = startHttpServer(testPort, mockClient, mockVoiceKeeper);

    try {
      const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
        http.get(`http://127.0.0.1:${testPort}/`, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({
              statusCode: res.statusCode || 0,
              body,
            });
          });
        }).on("error", reject);
      });

      assert.equal(response.statusCode, 200);
      assert.ok(response.body.includes("Discord Call Keeper"));
      assert.ok(response.body.includes("General Voice"));
      assert.ok(response.body.includes("Test Guild"));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});

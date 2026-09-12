import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config";

describe("Configuration Validation", () => {
  const originalEnv = { ...process.env };

  it("should load valid configuration properly", () => {
    process.env.DISCORD_TOKEN = "valid_token_test_123";
    process.env.GUILD_ID = "987654321098765432";
    process.env.CHANNEL_ID = "987654321098765431";
    process.env.PORT = "8080";

    const config = loadConfig();
    assert.equal(config.token, "valid_token_test_123");
    assert.equal(config.guildId, "987654321098765432");
    assert.equal(config.channelId, "987654321098765431");
    assert.equal(config.port, 8080);

    process.env = { ...originalEnv };
  });

  it("should fallback to port 3000 if PORT is invalid", () => {
    process.env.DISCORD_TOKEN = "valid_token_test_123";
    process.env.GUILD_ID = "987654321098765432";
    process.env.CHANNEL_ID = "987654321098765431";
    process.env.PORT = "invalid_port";

    const config = loadConfig();
    assert.equal(config.port, 3000);

    process.env = { ...originalEnv };
  });
});

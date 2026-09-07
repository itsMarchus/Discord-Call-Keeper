import { Client, GatewayIntentBits, ActivityType, Events } from "discord.js";
import { loadConfig } from "./config";
import { VoiceCallKeeper } from "./voice";
import { startHttpServer } from "./server";

async function main() {
  console.log("\n=======================================================");
  console.log("  🚀 Starting Discord Call Keeper (24/7 Voice Sustainer)");
  console.log("=======================================================\n");

  const config = loadConfig();

  // Create Discord client with required intents
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  const voiceKeeper = new VoiceCallKeeper(client, config.guildId, config.channelId);

  // Start HTTP server immediately so Render health checks and UptimeRobot pass during boot
  const server = startHttpServer(config.port, client, voiceKeeper);

  client.once(Events.ClientReady, async (readyClient) => {
    console.log(`[Bot] Logged in as ${readyClient.user.tag}!`);

    // Set custom bot presence
    readyClient.user.setPresence({
      activities: [
        {
          name: "Sustaining Call 24/7 🟢",
          type: ActivityType.Custom,
        },
      ],
      status: "online",
    });

    // Start voice keeper connection
    await voiceKeeper.start();
  });

  client.on(Events.Error, (err) => {
    console.error("[Bot Error]", err);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("\n[App] Shutting down gracefully...");
    voiceKeeper.stop();
    server.close(() => {
      console.log("[App] HTTP server closed.");
    });
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Log in to Discord
  console.log("[Bot] Logging in to Discord Gateway...");
  try {
    await client.login(config.token);
  } catch (error: any) {
    console.error("\n❌ FAILED TO LOG IN TO DISCORD:");
    console.error(error?.message || error);
    console.error("\nPlease ensure your DISCORD_TOKEN is valid and reset it if necessary.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unhandled fatal error:", err);
  process.exit(1);
});

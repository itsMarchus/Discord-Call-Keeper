import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

export interface AppConfig {
  token: string;
  guildId: string;
  channelId: string;
  port: number;
}

export function loadConfig(): AppConfig {
  const token = process.env.DISCORD_TOKEN?.trim();
  const guildId = process.env.GUILD_ID?.trim();
  const channelId = process.env.CHANNEL_ID?.trim();
  const port = parseInt(process.env.PORT || "3000", 10);

  const missing: string[] = [];
  if (!token || token === "your_bot_token_here") missing.push("DISCORD_TOKEN");
  if (!guildId || guildId === "123456789012345678") missing.push("GUILD_ID");
  if (!channelId || channelId === "123456789012345678") missing.push("CHANNEL_ID");

  if (missing.length > 0) {
    console.error("\n=======================================================");
    console.error("  ❌ CONFIGURATION ERROR: Missing required environment variables");
    console.error("=======================================================");
    console.error(`  Please provide the following in your .env file or host environment:\n`);
    for (const key of missing) {
      console.error(`    - ${key}`);
    }
    console.error("\n  Refer to .env.example or the README for setup instructions.");
    console.error("=======================================================\n");
    process.exit(1);
  }

  return {
    token: token!,
    guildId: guildId!,
    channelId: channelId!,
    port: isNaN(port) ? 3000 : port,
  };
}

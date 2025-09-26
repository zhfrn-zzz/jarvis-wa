/**
 * Bot Manager to store global bot instance reference
 * This allows commands to access the bot socket when needed
 */
class BotManager {
  private static instance: BotManager;
  private botSocket: any = null;

  private constructor() {}

  public static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  public setBotSocket(socket: any): void {
    this.botSocket = socket;
  }

  public getBotSocket(): any {
    return this.botSocket;
  }

  public hasBotSocket(): boolean {
    return this.botSocket !== null;
  }
}

export const botManager = BotManager.getInstance();
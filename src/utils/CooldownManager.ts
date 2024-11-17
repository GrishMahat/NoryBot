export class CooldownManager {
  private cooldowns: Map<string, number>;
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxCooldowns: number;

  constructor(cleanupIntervalMs: number = 300000, maxCooldowns: number = 1000) {
    this.cooldowns = new Map();
    this.maxCooldowns = maxCooldowns;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  /**
   * Check if a cooldown is active and return remaining time
   * @param userId The ID of the user
   * @param targetId The ID of the command/button/etc
   * @returns Remaining time in seconds, or 0 if no cooldown
   */
  checkCooldown(userId: string, targetId: string): number {
    const key = this.getCooldownKey(userId, targetId);
    const cooldownTime = this.cooldowns.get(key);

    if (!cooldownTime) return 0;

    const remaining = cooldownTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Set a cooldown for a user-target combination
   * @param userId The ID of the user
   * @param targetId The ID of the command/button/etc
   * @param durationSeconds Duration of cooldown in seconds
   */
  setCooldown(userId: string, targetId: string, durationSeconds: number): void {
    // Clean up if we're at capacity
    if (this.cooldowns.size >= this.maxCooldowns) {
      this.cleanup();
    }

    const key = this.getCooldownKey(userId, targetId);
    this.cooldowns.set(key, Date.now() + durationSeconds * 1000);
  }

  /**
   * Check if a user has an active cooldown
   * @param userId The ID of the user
   * @param targetId The ID of the command/button/etc
   */
  isOnCooldown(userId: string, targetId: string): boolean {
    const cooldownTime = this.cooldowns.get(
      this.getCooldownKey(userId, targetId)
    );
    return Boolean(cooldownTime && Date.now() < cooldownTime);
  }

  /**
   * Get remaining cooldown time in seconds
   * @param userId The ID of the user
   * @param targetId The ID of the command/button/etc
   */
  getRemainingTime(userId: string, targetId: string): number {
    const cooldownTime = this.cooldowns.get(
      this.getCooldownKey(userId, targetId)
    );
    return cooldownTime ? Math.ceil((cooldownTime - Date.now()) / 1000) : 0;
  }

  /**
   * Remove a specific cooldown
   * @param userId The ID of the user
   * @param targetId The ID of the command/button/etc
   */
  removeCooldown(userId: string, targetId: string): void {
    this.cooldowns.delete(this.getCooldownKey(userId, targetId));
  }

  /**
   * Clean up expired cooldowns
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.cooldowns.entries()) {
      if (timestamp <= now) {
        this.cooldowns.delete(key);
      }
    }
  }

  /**
   * Generate a consistent key for the cooldown map
   */
  private getCooldownKey(userId: string, targetId: string): string {
    return `${userId}-${targetId}`;
  }

  /**
   * Get the current number of active cooldowns
   */
  get size(): number {
    return this.cooldowns.size;
  }

  /**
   * Destroy the cooldown manager and clear the cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cooldowns.clear();
  }
}

// Export a singleton instance
export default new CooldownManager();

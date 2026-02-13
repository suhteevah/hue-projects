import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ServerNode, Environment } from '@matter/main';
import '@matter/nodejs';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Manages the Matter.js ServerNode lifecycle.
 *
 * The ServerNode acts as a "controller" that can commission and interact
 * with Matter devices on the local network. Fabric credentials are persisted
 * to disk so commissioned devices survive server restarts.
 */
@Injectable()
export class MatterControllerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatterControllerService.name);
  private serverNode: ServerNode | null = null;

  private get storagePath(): string {
    return path.resolve(process.cwd(), 'data', 'matter-storage');
  }

  async onModuleInit() {
    try {
      await this.initialize();
    } catch (err) {
      this.logger.warn(
        `Matter controller initialization deferred: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  /**
   * Initialize the Matter ServerNode. Creates storage directory if needed
   * and starts the controller node.
   */
  async initialize(): Promise<void> {
    if (this.serverNode) {
      return; // Already initialized
    }

    // Ensure storage directory exists
    fs.mkdirSync(this.storagePath, { recursive: true });

    this.logger.log(`Initializing Matter controller (storage: ${this.storagePath})`);

    // Configure environment for the controller
    const environment = Environment.default;
    environment.vars.set('storage.path', this.storagePath);

    // Create the ServerNode (acts as our controller/commissioner)
    this.serverNode = await ServerNode.create({
      id: 'smart-home-controller',
      environment,
    });

    // Start the node so it can discover and interact with devices
    await this.serverNode.start();

    this.logger.log('Matter controller initialized and started');
  }

  /**
   * Get the active ServerNode instance.
   * @throws Error if not initialized
   */
  getServerNode(): ServerNode {
    if (!this.serverNode) {
      throw new Error(
        'Matter controller not initialized. Commission a device to trigger initialization.',
      );
    }
    return this.serverNode;
  }

  /**
   * Check if the controller is initialized.
   */
  isInitialized(): boolean {
    return this.serverNode !== null;
  }

  /**
   * Close the Matter controller and release resources.
   */
  async close(): Promise<void> {
    if (this.serverNode) {
      this.logger.log('Shutting down Matter controller...');
      try {
        await this.serverNode.close();
      } catch (err) {
        this.logger.warn(`Error closing Matter controller: ${err}`);
      }
      this.serverNode = null;
    }
  }
}

import { ethers } from 'ethers';
import { ABI, PREDICTION_ADDRESS } from './constants';
import { ProviderService } from './provider';
import { LogService } from './logs';
import { BetEvent, RoundInfo } from './types';
import { toast } from "@/components/ui/use-toast";

export class PredictionService {
  private provider: ProviderService;
  private contract: ethers.Contract | null;
  private interface: ethers.Interface;
  private logService: LogService;

  constructor() {
    this.provider = ProviderService.getInstance();
    this.interface = new ethers.Interface(ABI);
    this.contract = null;
    this.logService = new LogService();
    this.initializeContract();
  }

  private async initializeContract() {
    try {
      const provider = await this.provider.getProvider();
      this.contract = new ethers.Contract(
        PREDICTION_ADDRESS,
        ABI,
        provider
      );
    } catch (error) {
      console.error('Failed to initialize contract:', error);
      this.contract = null;
    }
  }

  private async ensureContract() {
    if (!this.contract) {
      await this.initializeContract();
      if (!this.contract) {
        throw new Error('Contract initialization failed');
      }
    }
    return this.contract;
  }

  // 註解掉重試邏輯
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      const contract = await this.ensureContract();
      return await operation();
    } catch (error) {
      console.error('Operation failed:', error);
      throw error;
    }
  }

  async getCurrentEpoch(): Promise<number> {
    return this.executeWithRetry(async () => {
      const contract = await this.ensureContract();
      const epoch = await contract.currentEpoch();
      return Number(epoch);
    });
  }

  async getRoundInfo(epoch: number): Promise<RoundInfo> {
    return this.executeWithRetry(async () => {
      const contract = await this.ensureContract();
      return contract.rounds(epoch);
    });
  }

  async getTimeUntilNextRound(): Promise<number> {
    const currentEpoch = await this.getCurrentEpoch();
    const roundInfo = await this.getRoundInfo(currentEpoch);
    const startTimestamp = Number(roundInfo.startTimestamp) * 1000;
    return startTimestamp - Date.now();
  }

  async getWalletHistory(address: string, fromEpoch: number, toEpoch: number) {
    return this.executeWithRetry(() => this.logService.queryLogsInBatches(address));
  }

  onNewBet(address: string, callback: (bet: BetEvent) => void) {
    const setupListeners = async () => {
      try {
        const contract = await this.ensureContract();
        
        contract.on("BetBull", (sender: string, epoch: bigint, amount: bigint) => {
          if (sender.toLowerCase() === address.toLowerCase()) {
            callback({
              type: 'bull',
              epoch: Number(epoch),
              amount: ethers.formatEther(amount),
            });
          }
        });

        contract.on("BetBear", (sender: string, epoch: bigint, amount: bigint) => {
          if (sender.toLowerCase() === address.toLowerCase()) {
            callback({
              type: 'bear',
              epoch: Number(epoch),
              amount: ethers.formatEther(amount),
            });
          }
        });

        return () => {
          contract.removeAllListeners("BetBull");
          contract.removeAllListeners("BetBear");
        };
      } catch (error) {
        console.error('Failed to setup bet listeners:', error);
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupListeners().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }
}

export * from './types';
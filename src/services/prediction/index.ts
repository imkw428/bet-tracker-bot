import { ethers } from 'ethers';
import { PREDICTION_ABI, PREDICTION_ADDRESS } from './constants';
import { ProviderService } from './provider';
import { LogService } from './logs';
import { BetEvent, RoundInfo } from './types';

export class PredictionService {
  private provider: ProviderService;
  private contract: ethers.Contract | null = null;
  private interface: ethers.Interface;
  private logService: LogService;

  constructor() {
    this.provider = new ProviderService();
    this.interface = new ethers.Interface(PREDICTION_ABI);
    this.logService = new LogService(this.provider, this.interface);
  }

  private async initializeContract() {
    if (!this.contract) {
      const provider = await this.provider.getProvider();
      this.contract = new ethers.Contract(
        PREDICTION_ADDRESS,
        PREDICTION_ABI,
        provider
      );
    }
    return this.contract;
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        return await operation();
      } catch (error) {
        console.error(`Operation failed (retry ${retryCount + 1}/${maxRetries}):`, error);
        
        if (retryCount === maxRetries - 1) {
          throw new Error('Maximum retry attempts exceeded');
        }
        
        const provider = await this.provider.getProvider();
        this.contract = new ethers.Contract(PREDICTION_ADDRESS, PREDICTION_ABI, provider);
        retryCount++;
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  }

  async getCurrentEpoch(): Promise<number> {
    const contract = await this.initializeContract();
    return this.executeWithRetry(async () => {
      const epoch = await contract.currentEpoch();
      return Number(epoch);
    });
  }

  async getRoundInfo(epoch: number): Promise<RoundInfo> {
    const contract = await this.initializeContract();
    return this.executeWithRetry(() => contract.rounds(epoch));
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

  async onNewBet(address: string, callback: (bet: BetEvent) => void) {
    const contract = await this.initializeContract();
    
    const bullListener = (sender: string, epoch: bigint, amount: bigint) => {
      if (sender.toLowerCase() === address.toLowerCase()) {
        callback({
          type: 'bull',
          epoch: Number(epoch),
          amount: ethers.formatEther(amount),
        });
      }
    };

    const bearListener = (sender: string, epoch: bigint, amount: bigint) => {
      if (sender.toLowerCase() === address.toLowerCase()) {
        callback({
          type: 'bear',
          epoch: Number(epoch),
          amount: ethers.formatEther(amount),
        });
      }
    };

    contract.on("BetBull", bullListener);
    contract.on("BetBear", bearListener);

    return () => {
      contract.off("BetBull", bullListener);
      contract.off("BetBear", bearListener);
    };
  }

  setPollingInterval(intensive: boolean) {
    this.provider.setPollingInterval(intensive);
  }
}

export * from './types';
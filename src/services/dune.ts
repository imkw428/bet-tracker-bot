import { DuneClient } from 'dune-client';
import { supabaseService } from './supabase';

interface WalletTrackingData {
  address: string;
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
  totalActiveTime: number; // in minutes
  activePeriods: { start: Date; end: Date }[];
}

class DuneService {
  private client: DuneClient;
  private activeWallets: Map<string, WalletTrackingData>;
  private readonly POLLING_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.client = new DuneClient("MdStLrxoohfepf1sWAbISw21di5WQ8Sa");
    this.activeWallets = new Map();
  }

  private async fetchWallets(): Promise<string[]> {
    try {
      const result = await this.client.get_latest_result(4461837);
      return result.map((item: any) => item.address.toLowerCase());
    } catch (error) {
      console.error('Error fetching wallets from Dune:', error);
      return [];
    }
  }

  private updateWalletTracking(address: string, isPresent: boolean) {
    const now = new Date();
    let data = this.activeWallets.get(address);

    if (isPresent) {
      if (!data) {
        // New wallet
        data = {
          address,
          firstSeen: now,
          lastSeen: now,
          isActive: true,
          totalActiveTime: 0,
          activePeriods: [{ start: now, end: now }]
        };
        this.activeWallets.set(address, data);
      } else {
        // Update existing wallet
        data.lastSeen = now;
        if (!data.isActive) {
          data.isActive = true;
          data.activePeriods.push({ start: now, end: now });
        }
      }
    } else if (data?.isActive) {
      // Wallet is no longer present
      data.isActive = false;
      const lastPeriod = data.activePeriods[data.activePeriods.length - 1];
      lastPeriod.end = now;
      
      // Calculate total active time
      data.totalActiveTime = data.activePeriods.reduce((total, period) => {
        const duration = (period.end.getTime() - period.start.getTime()) / (1000 * 60);
        return total + duration;
      }, 0);
    }
  }

  private async syncWithSupabase(currentWallets: string[]) {
    // Add new wallets to monitoring
    for (const address of currentWallets) {
      const exists = await supabaseService.getWallets()
        .then(wallets => wallets.some(w => w.address.toLowerCase() === address.toLowerCase()));
      
      if (!exists) {
        await supabaseService.addWallet(address);
      }
    }
  }

  public async startTracking() {
    if (this.timer) {
      return;
    }

    const checkWallets = async () => {
      const currentWallets = await this.fetchWallets();
      
      // Update tracking data for all known wallets
      for (const [address] of this.activeWallets) {
        this.updateWalletTracking(
          address,
          currentWallets.includes(address.toLowerCase())
        );
      }

      // Add new wallets to tracking
      for (const address of currentWallets) {
        if (!this.activeWallets.has(address)) {
          this.updateWalletTracking(address, true);
        }
      }

      // Sync with Supabase
      await this.syncWithSupabase(currentWallets);
    };

    // Initial check
    await checkWallets();

    // Start polling
    this.timer = setInterval(checkWallets, this.POLLING_INTERVAL);
  }

  public stopTracking() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public getWalletStats(address: string): WalletTrackingData | null {
    return this.activeWallets.get(address) || null;
  }

  public getAllActiveWallets(): WalletTrackingData[] {
    return Array.from(this.activeWallets.values())
      .filter(data => data.isActive);
  }
}

export const duneService = new DuneService();
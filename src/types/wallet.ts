export interface WalletActivity {
  address: string;
  firstSeen: Date;
  lastSeen: Date;
  isActive: boolean;
  totalActiveTime: number; // 以分钟为单位
  activePeriods: { start: Date; end: Date }[];
  winRate?: number;
  totalBets?: number;
  averageBetSize?: number;
}

export interface WalletAnalytics {
  address: string;
  consistency: number; // 0-1 之间的分数
  profitability: number; // 正负数表示盈亏
  activityScore: number; // 基于活跃时间的分数
}
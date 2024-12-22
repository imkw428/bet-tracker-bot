import { WalletAnalytics as WalletAnalyticsType } from "@/types/wallet";

interface WalletAnalyticsProps {
  analytics?: WalletAnalyticsType;
}

export const WalletAnalyticsDisplay = ({ analytics }: WalletAnalyticsProps) => {
  if (!analytics) return null;

  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <div>
        <div className="font-bold mb-1">一致性</div>
        <div className={`${analytics.consistency > 0.7 ? 'text-win' : 'text-neutral'}`}>
          {(analytics.consistency * 100).toFixed(1)}%
        </div>
      </div>
      <div>
        <div className="font-bold mb-1">盈利能力</div>
        <div className={`${analytics.profitability > 0 ? 'text-win' : 'text-loss'}`}>
          {analytics.profitability.toFixed(3)} BNB
        </div>
      </div>
      <div>
        <div className="font-bold mb-1">活跃度</div>
        <div className={`${analytics.activityScore > 0.5 ? 'text-win' : 'text-neutral'}`}>
          {(analytics.activityScore * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};
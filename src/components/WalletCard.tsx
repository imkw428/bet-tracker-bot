import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletAnalytics } from "@/types/wallet";
import { formatDuration, intervalToDuration } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface Bet {
  type: 'bull' | 'bear';
  epoch: number;
  amount: string;
}

interface WalletHistory {
  bulls: { epoch: number; amount: string; }[];
  bears: { epoch: number; amount: string; }[];
  claims: { epoch: number; amount: string; }[];
}

interface WalletCardProps {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
  note: string;
  analytics?: WalletAnalytics;
  firstSeen: string;
}

export const WalletCard = ({ 
  address, 
  history, 
  recentBets, 
  note, 
  analytics,
  firstSeen 
}: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const hasHistory = history && (
    history.bulls.length > 0 || 
    history.bears.length > 0 || 
    history.claims.length > 0
  );

  // 計算持續時間
  const duration = intervalToDuration({
    start: new Date(firstSeen),
    end: new Date()
  });

  const durationString = formatDuration(duration, {
    locale: zhTW,
    format: ['months', 'days', 'hours']
  });

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h2 className="text-base font-bold">
              {address.slice(0, 6)}...{address.slice(-4)}
            </h2>
            <p className="text-xs text-muted-foreground">
              監控時長: {durationString}
            </p>
            <Badge variant={hasHistory ? "default" : "secondary"} className="mt-1">
              {hasHistory ? "舊錢包" : "新錢包"}
            </Badge>
          </div>
          {note && (
            <span className="text-xs text-muted-foreground">{note}</span>
          )}
        </div>

        {analytics && (
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
        )}

        {winningEpochs.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2">贏得的回合</h3>
            <div className="flex flex-wrap gap-1">
              {winningEpochs.slice(-3).map((epoch) => (
                <Badge key={epoch} variant="default" className="bg-win text-white text-xs">
                  {epoch}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {recentBets.length > 0 && (
          <div>
            <h3 className="text-sm font-bold mb-2">最新下注</h3>
            <div className="space-y-1">
              {recentBets.map((bet, i) => (
                <div
                  key={`${bet.epoch}-${i}`}
                  className={`text-xs p-1.5 rounded ${
                    bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                  }`}
                >
                  {bet.type === 'bull' ? '看漲' : '看跌'} - {bet.amount} BNB (回合 {bet.epoch})
                </div>
              ))}
            </div>
          </div>
        )}

        {history && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="font-bold text-win mb-1">看漲</div>
              {history.bulls.slice(-2).map((bet, i) => (
                <div key={i}>
                  {bet.amount} BNB
                </div>
              ))}
            </div>
            <div>
              <div className="font-bold text-loss mb-1">看跌</div>
              {history.bears.slice(-2).map((bet, i) => (
                <div key={i}>
                  {bet.amount} BNB
                </div>
              ))}
            </div>
            <div>
              <div className="font-bold text-neutral mb-1">獲勝</div>
              {history.claims.slice(-2).map((claim, i) => (
                <div key={i}>
                  {claim.amount} BNB
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
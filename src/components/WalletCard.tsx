import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletAnalytics } from "@/types/wallet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  totalTimeOnList?: number;
  currentEpoch: number;
}

export const WalletCard = ({ 
  address, 
  history, 
  recentBets,
  analytics,
  firstSeen,
  totalTimeOnList = 0,
  currentEpoch
}: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const hasHistory = history && (
    history.bulls.length > 0 || 
    history.bears.length > 0 || 
    history.claims.length > 0
  );

  const formatTotalTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} 分鐘`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours} 小時 ${mins} 分鐘`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days} 天 ${hours} 小時`;
    }
  };

  // 獲取最近五個回合的記錄，從當前回合開始
  const getRecentRounds = () => {
    if (!history) return [];
    
    const allBets = [
      ...history.bulls.map(bet => ({ ...bet, type: 'bull' as const })),
      ...history.bears.map(bet => ({ ...bet, type: 'bear' as const }))
    ];

    // 從當前回合開始，生成最近 5 個回合的數據
    return Array.from({ length: 5 }, (_, index) => {
      const roundEpoch = currentEpoch - index;
      const bet = allBets.find(b => b.epoch === roundEpoch);
      const won = winningEpochs.includes(roundEpoch);
      
      return {
        epoch: roundEpoch,
        type: bet?.type || null,
        amount: bet?.amount || null,
        won
      };
    });
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">
            {address.slice(0, 6)}...{address.slice(-4)}
          </h2>
          <p className="text-xs text-muted-foreground">
            首次發現: {firstSeen}
          </p>
          <p className="text-xs text-muted-foreground">
            累計時間: {formatTotalTime(totalTimeOnList)}
          </p>
          <Badge variant={hasHistory ? "default" : "secondary"} className="mt-1">
            {hasHistory ? "舊錢包" : "新錢包"}
          </Badge>
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

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">回合</TableHead>
                <TableHead>下注</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead className="w-20">結果</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getRecentRounds().map((round) => (
                <TableRow key={round.epoch}>
                  <TableCell className="font-medium">{round.epoch}</TableCell>
                  <TableCell>
                    {round.type === 'bull' && (
                      <span className="text-win">看漲</span>
                    )}
                    {round.type === 'bear' && (
                      <span className="text-loss">看跌</span>
                    )}
                    {!round.type && "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {round.amount ? `${round.amount} BNB` : "-"}
                  </TableCell>
                  <TableCell>
                    {round.won ? (
                      <Badge variant="default" className="bg-win">
                        獲勝
                      </Badge>
                    ) : round.type ? (
                      <Badge variant="default" className="bg-loss">
                        失敗
                      </Badge>
                    ) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
};
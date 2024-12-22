import { Badge } from "@/components/ui/badge";

interface WalletHeaderProps {
  address: string;
  firstSeen: string;
  totalTimeOnList?: number;
  hasHistory: boolean;
}

export const WalletHeader = ({ 
  address, 
  firstSeen, 
  totalTimeOnList = 0,
  hasHistory 
}: WalletHeaderProps) => {
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

  return (
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
  );
};
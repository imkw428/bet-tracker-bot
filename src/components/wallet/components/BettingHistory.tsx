import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Round {
  epoch: number;
  type: 'bull' | 'bear' | null;
  amount: string | null;
  won: boolean;
  status: '可下注' | '運行中' | '已完成';
}

interface BettingHistoryProps {
  rounds: Round[];
}

export const BettingHistory = ({ rounds }: BettingHistoryProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">回合</TableHead>
            <TableHead>下注</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead className="w-20">狀態</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => (
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
                {round.status === '可下注' ? (
                  <Badge variant="outline" className="bg-blue-100">
                    可下注
                  </Badge>
                ) : round.status === '運行中' ? (
                  <Badge variant="outline" className="bg-yellow-100">
                    運行中
                  </Badge>
                ) : round.won ? (
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
  );
};
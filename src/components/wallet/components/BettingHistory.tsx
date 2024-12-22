import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react";

interface Round {
  epoch: number;
  type: 'bull' | 'bear' | null;
  amount: string | null;
  won: boolean;
  result?: 'bull' | 'bear';
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
            <TableHead>結果</TableHead>
            <TableHead className="text-right">金額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rounds.map((round) => (
            <TableRow key={round.epoch}>
              <TableCell className="font-medium">{round.epoch}</TableCell>
              <TableCell>
                {round.type === 'bull' && (
                  <span className="text-win flex items-center gap-1">
                    <ArrowUpCircle className="w-4 h-4" />
                    看漲
                  </span>
                )}
                {round.type === 'bear' && (
                  <span className="text-loss flex items-center gap-1">
                    <ArrowDownCircle className="w-4 h-4" />
                    看跌
                  </span>
                )}
                {!round.type && "-"}
              </TableCell>
              <TableCell>
                {round.result === 'bull' && (
                  <span className="text-win flex items-center gap-1">
                    <ArrowUpCircle className="w-4 h-4" />
                    上漲
                  </span>
                )}
                {round.result === 'bear' && (
                  <span className="text-loss flex items-center gap-1">
                    <ArrowDownCircle className="w-4 h-4" />
                    下跌
                  </span>
                )}
                {!round.result && "等待中"}
              </TableCell>
              <TableCell className="text-right">
                {round.amount ? (
                  <span className={round.won ? "text-win" : ""}>
                    {round.amount} BNB
                  </span>
                ) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
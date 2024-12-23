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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
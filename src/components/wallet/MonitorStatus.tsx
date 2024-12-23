import { Card } from "@/components/ui/card";

interface MonitorStatusProps {
  currentEpoch: number | null;
  walletsCount: number;
  isPaused: boolean;
}

export const MonitorStatus = ({ currentEpoch, walletsCount, isPaused }: MonitorStatusProps) => {
  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">當前狀態</h2>
      <div className="space-y-2">
        <p>當前回合: <span className={isPaused ? "" : "animate-blink"}>{currentEpoch}</span></p>
        <p>監控錢包數量: {walletsCount}</p>
        <p>系統狀態: {isPaused ? "已暫停" : "監控中"}</p>
      </div>
    </Card>
  );
};
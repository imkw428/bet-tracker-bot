import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface MonitorControlsProps {
  isSoundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  monitoring: boolean;
  onStartMonitoring: () => void;
}

export const MonitorControls = ({
  isSoundEnabled,
  setSoundEnabled,
  monitoring,
  onStartMonitoring
}: MonitorControlsProps) => {
  return (
    <div className="flex items-center justify-end gap-2 mb-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSoundEnabled(!isSoundEnabled)}
      >
        <Volume2 className={isSoundEnabled ? 'text-green-500' : 'text-gray-400'} />
      </Button>
      <Button onClick={onStartMonitoring} disabled={monitoring}>
        {monitoring ? "監控中..." : "開始監控"}
      </Button>
    </div>
  );
};
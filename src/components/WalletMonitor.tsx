import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { duneService } from '@/services/dune';
import { WalletList } from './WalletList';
import { WalletDashboard } from './WalletDashboard';
import { useToast } from "@/components/ui/use-toast";
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { MonitorHeader } from './wallet/components/MonitorHeader';
import { MonitorControls } from './wallet/components/MonitorControls';

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [monitoring, setMonitoring] = useState(false);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  
  const {
    wallets,
    setWallets,
    handleWalletAdd,
    handleWalletRemove,
    handleWalletNoteUpdate
  } = useWalletData();

  const { currentEpoch, predictionServiceRef } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

  const startMonitoring = () => {
    if (wallets.length === 0) {
      toast({
        title: "錯誤",
        description: "請至少添加一個錢包地址",
        variant: "destructive",
      });
      return;
    }
    setMonitoring(true);
    duneService.startTracking();
  };

  return (
    <div className="container mx-auto p-4 font-mono">
      <MonitorHeader />
      <MonitorControls
        isSoundEnabled={isSoundEnabled}
        setSoundEnabled={setSoundEnabled}
        monitoring={monitoring}
        onStartMonitoring={startMonitoring}
      />

      <WalletList
        wallets={wallets}
        monitoring={monitoring}
        onWalletAdd={handleWalletAdd}
        onWalletRemove={handleWalletRemove}
        onWalletNoteUpdate={handleWalletNoteUpdate}
      />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
      />
    </div>
  );
};
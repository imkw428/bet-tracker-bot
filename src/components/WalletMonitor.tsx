import { useState } from 'react';
import { WalletDashboard } from './WalletDashboard';
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { MonitorHeader } from './wallet/components/MonitorHeader';
import { useToast } from "@/components/ui/use-toast";

export const WalletMonitor = () => {
  const [monitoring] = useState(true);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  
  const {
    wallets,
    setWallets,
  } = useWalletData();

  const { currentEpoch, predictionServiceRef, roundResults } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

  // 添加日誌來幫助調試
  console.log('Current wallets:', wallets);
  console.log('Monitoring status:', monitoring);
  console.log('Current epoch:', currentEpoch);

  if (wallets.length === 0) {
    return (
      <div className="container mx-auto p-4 font-mono">
        <MonitorHeader />
        <div className="text-center py-8">
          <p>正在載入錢包資料...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 font-mono">
      <MonitorHeader />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
        roundResults={roundResults}
      />
    </div>
  );
};
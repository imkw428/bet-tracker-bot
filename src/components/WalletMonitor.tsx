import { useState } from 'react';
import { WalletDashboard } from './WalletDashboard';
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { MonitorHeader } from './wallet/components/MonitorHeader';

export const WalletMonitor = () => {
  const [monitoring] = useState(true);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  
  const {
    wallets,
    setWallets,
  } = useWalletData();

  const { currentEpoch, predictionServiceRef } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

  return (
    <div className="container mx-auto p-4 font-mono">
      <MonitorHeader />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
      />
    </div>
  );
};
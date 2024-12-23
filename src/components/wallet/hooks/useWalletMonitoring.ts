import { useState, useEffect, useRef } from 'react';
import { PredictionService } from '@/services/prediction';
import { duneService } from '@/services/dune';
import { useToast } from "@/components/ui/use-toast";
import { WalletData } from '../types';

export const useWalletMonitoring = (
  wallets: WalletData[],
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>,
  isSoundEnabled: boolean,
  notificationSound: HTMLAudioElement
) => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const predictionServiceRef = useRef<PredictionService>();

  useEffect(() => {
    if (!predictionServiceRef.current) return;

    let interval: NodeJS.Timeout;
    const predictionService = predictionServiceRef.current;

    const checkRoundTiming = async () => {
      try {
        const timeUntilNext = await predictionService.getTimeUntilNextRound();
        const shouldIntensivePolling = timeUntilNext <= 30000 && timeUntilNext > 0;
        
        predictionService.setPollingInterval(shouldIntensivePolling);
        
        const epoch = await predictionService.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        for (const wallet of wallets) {
          const history = await predictionService.getWalletHistory(wallet.address, 0, 0);
          setWallets(prevWallets =>
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return { ...w, history };
              }
              return w;
            })
          );
        }

        const nextCheckDelay = shouldIntensivePolling ? 1000 : 3000;
        interval = setTimeout(checkRoundTiming, nextCheckDelay);
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
        interval = setTimeout(checkRoundTiming, 3000);
      }
    };

    checkRoundTiming();

    const cleanupFns = wallets.map(wallet => {
      return predictionService.onNewBet(wallet.address, (bet) => {
        if (isSoundEnabled) {
          notificationSound.play().catch(console.error);
        }

        setWallets(prevWallets => 
          prevWallets.map(w => {
            if (w.address === wallet.address) {
              return {
                ...w,
                recentBets: [bet]
              };
            }
            return w;
          })
        );

        toast({
          title: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} 新的${bet.type === 'bull' ? '看漲' : '看跌'}下注!`,
          description: `金額: ${bet.amount} BNB，回合: ${bet.epoch}`,
        });
      });
    });

    return () => {
      clearTimeout(interval);
      cleanupFns.forEach(cleanup => cleanup && cleanup());
    };
  }, [wallets, toast, isSoundEnabled, notificationSound]);

  return { currentEpoch, predictionServiceRef };
};
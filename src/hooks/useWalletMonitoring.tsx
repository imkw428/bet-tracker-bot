import { useState, useEffect, useRef } from 'react';
import { PredictionService } from '@/services/prediction';
import { useToast } from "@/components/ui/use-toast";
import { duneService } from '@/services/dune';

export const useWalletMonitoring = (
  wallets: any[],
  monitoring: boolean,
  isSoundEnabled: boolean,
  notificationSound: HTMLAudioElement
) => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const predictionServiceRef = useRef<PredictionService>();
  const cleanupFnsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (monitoring) {
      duneService.startTracking();
    } else {
      duneService.stopTracking();
    }

    return () => {
      duneService.stopTracking();
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring || !predictionServiceRef.current) return;

    let interval: NodeJS.Timeout;
    const predictionService = predictionServiceRef.current;

    const checkRoundTiming = async () => {
      try {
        const timeUntilNext = await predictionService.getTimeUntilNextRound();
        const shouldIntensivePolling = timeUntilNext <= 30000 && timeUntilNext > 0;
        
        predictionService.setPollingInterval(shouldIntensivePolling);
        
        const epoch = await predictionService.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        const nextCheckDelay = shouldIntensivePolling ? 1000 : 3000;
        interval = setTimeout(checkRoundTiming, nextCheckDelay);
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
        interval = setTimeout(checkRoundTiming, 3000);
      }
    };

    checkRoundTiming();

    return () => {
      clearTimeout(interval);
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring || !predictionServiceRef.current) return;

    const predictionService = predictionServiceRef.current;

    const setupWalletListeners = async () => {
      cleanupFnsRef.current.forEach(cleanup => cleanup());
      cleanupFnsRef.current = [];

      const cleanupPromises = wallets.map(async wallet => {
        const cleanup = await predictionService.onNewBet(wallet.address, (bet) => {
          if (isSoundEnabled) {
            notificationSound.play().catch(console.error);
          }

          toast({
            title: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} 新的${bet.type === 'bull' ? '看漲' : '看跌'}下注!`,
            description: `金額: ${bet.amount} BNB，回合: ${bet.epoch}`,
          });
        });
        return cleanup;
      });

      const cleanupFns = await Promise.all(cleanupPromises);
      cleanupFnsRef.current = cleanupFns;
    };

    setupWalletListeners();

    return () => {
      cleanupFnsRef.current.forEach(cleanup => cleanup());
      cleanupFnsRef.current = [];
    };
  }, [monitoring, wallets, toast, isSoundEnabled, notificationSound]);

  const startMonitoring = () => {
    predictionServiceRef.current = new PredictionService();
  };

  return {
    currentEpoch,
    startMonitoring
  };
};
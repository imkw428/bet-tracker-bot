interface WalletHeaderProps {
  address: string;
  hasHistory: boolean;
  totalTimeOnList: number;
}

export const WalletHeader = ({ 
  address,
  hasHistory,
  totalTimeOnList
}: WalletHeaderProps) => {
  return (
    <div>
      <h3 className="text-lg font-semibold">
        {`${address.slice(0, 6)}...${address.slice(-4)}`}
      </h3>
      <span className="text-sm text-neutral-500">
        {`On List Time: ${totalTimeOnList} min`}
      </span>
    </div>
  );
};
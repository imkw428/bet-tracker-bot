export const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

export const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
export const BLOCKS_PER_QUERY = 20; // Reduced from 50 to 20
export const QUERY_DELAY = 8000; // Increased from 5000 to 8000ms
export const MAX_RETRIES = 3; // Reduced from 5 to 3
export const CHUNK_SIZE = 5; // Reduced from 10 to 5 blocks per chunk

export const BSC_NETWORK = {
  name: 'bnb',
  chainId: 56,
  ensAddress: null,
  ensNetwork: null
};

export const RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org"
];
export const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

export const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
export const BLOCKS_PER_QUERY = 25; // Further reduced block range
export const REQUEST_DELAY = 8000; // Increased delay between requests
export const RATE_LIMIT_DELAY = 45000; // Increased rate limit delay
export const MAX_RETRIES = 8; // Increased max retries

export const RPC_ENDPOINTS = [
  "https://bsc-rpc.gateway.pokt.network",
  "https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3",
  "https://rpc.ankr.com/bsc",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://bsc.blockpi.network/v1/rpc/public",
  "https://bsc-mainnet.public.blastapi.io",
  "https://bsc.meowrpc.com",
  "https://newest-quaint-needle.bsc.quiknode.pro/7af7a237cb588bf7328c258d9878a3c099c3356b"
];
# 🦅 PROJECT CITADEL: SPY TRADING GUIDE

Welcome to the Citadel Multi-Agent Risk Engine. To ensure your AI agents extract the maximum possible mathematical accuracy from your chart, use the following framework when submitting an S&P 500 (SPY) trade for analysis.

## 1. THE SYMBOL
Always type exactly **`SPY`** into the target **"SYM"** box on your dashboard before pressing send. The background Python engine will automatically map this to the S&P 500 ETF and lock into the live price matrix.

## 2. THE TIMEFRAME KEYWORD (Crucial for Scalpers!)
Because SPY is highly volatile during the New York session, the AI needs to know exactly what time-interval to download from Yahoo Finance.
You **must** include one of the following exact keywords anywhere in your text prompt so the engine can format your 1,000-candle block perfectly:
* **For Scalps:** Use `1m` or `5m`
* **For Intraday:** Use `15m` or `30m` or `1h`
* **For Swings:** Use `4h` or `1d`

## 3. THE VISUAL IMAGE
Upload a clean, bright screenshot of your chart. 
* Do NOT zoom out too far. The AI works best when the candles are clearly distinguishable.
* Make sure your Order Blocks (OBs) or Fair Value Gaps (FVGs) are clearly drawn with boxes.

## 4. THE 3-PART TEXT DIRECTIVE (The "Prompt")
Do not simply type *"Is this a good trade?"* 
For the highest probability analysis, you must state your structural logic clearly. Use this perfect format:

1. **The Bias & Timeframe:** *"I am looking for a short entry on the 5m chart."*
2. **The Logic:** *"Price just swept Asian High liquidity and tapped perfectly into the 5m bearish Order Block."*
3. **The Parameter:** *"My entry is 520.10, Stop Loss firmly at 521.00, and Take Profit at 518.00."*

### ✅ Example of a PERFECT Scalper Input:
> **Symbol Box:** `SPY`
> **Chat Box:** *"Reviewing a 1m scalp short. We just formed a 1m FVG after a major Liquidity Sweep at the open. Entry is 518.50, Stop Loss is tightly above the wick at 519.05, Target is 516.00."*
> **Attachment:** (Clear 1m Chart Screenshot)

---
### 🧠 How the AI specifically handles this SPY request:
1. It downloads exactly the last 1,000 **1-minute** candles for SPY to map the immediate tape-reading momentum.
2. It visually scans your photo to verify your FVG lines up with its calculations.
3. It cross-references the live price (e.g. `$518.45`) to verify if you are pulling the trigger too early mathematically.
4. It outputs your final **EXECUTE** or **NO TRADE** verification!

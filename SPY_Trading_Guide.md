# 🦅 PROJECT CITADEL: PLATFORM TRADING GUIDE (Equities, Forex, Crypto, Commodities)

Welcome to the Citadel Multi-Agent Risk Engine. To ensure your AI agents extract the maximum possible mathematical accuracy from your chart, use the following framework when submitting trades.

## 1. THE SYMBOL ("SYM" Box)
The platform features an intelligent Auto-Correction API, but typing cleanly guarantees the safest result.
* **Equities/Indices:** Type the standard ticker (e.g., `SPY`, `QQQ`, `AAPL`).
* **Forex:** Simply type the 6-letter pair (e.g., `EURUSD`, `GBPUSD`, `AUDJPY`). The system will auto-format it. 
* **Commodities:** Use standard symbols. For Gold type `XAUUSD`. For US Spot Crude type `CL=F`.
* **Crypto:** Simply type `BTCUSD` or `ETHUSD`. The system natively corrects these to target exact spot rates.

## 2. THE TIMEFRAME KEYWORD (Crucial for the Algorithm!)
The AI downloads a 1,000-candle mathematical matrix explicitly tied to your timeframe. You **must** include one of the following exact keywords anywhere in your text prompt:
* **For Scalps:** Use `1m` or `5m`
* **For Intraday:** Use `15m` or `30m` or `1h`
* **For Swings:** Use `4h` or `1d`

## 3. THE VISUAL IMAGE
Upload a clean, bright screenshot of your chart. 
* Zoom in appropriately so the AI clearly identifies individual candles.
* Make sure your Order Blocks (OBs) or Fair Value Gaps (FVGs) are cleanly drawn with shaded rectangles.

## 4. PERFECT INPUT EXAMPLES BY ASSET CLASS

For the highest probability analysis, dictate your bias, logic, and exact parameters clearly so the AI has context for your markings.

### 🇺🇸 SPY / Equities (1m Scalp)
> **SYM:** `SPY`
> **Chat Box:** *"Reviewing a 1m scalp short. We just swept Asian High liquidity and formed a bearish 1m FVG. Entry is 518.50, Stop Loss is tightly above the wick at 519.05, Target is 516.00."*

### 💱 Forex (15m Intraday)
> **SYM:** `EURUSD`
> **Chat Box:** *"Long EURUSD on the 15m chart. Price tapped perfectly into a discount 15m order block. Looking for a premium target. Entry 1.0850, Stop 1.0830, Target 1.0900."*

### 🏅 Commodities / Gold (1h Trade)
> **SYM:** `XAUUSD`
> **Chat Box:** *"Analyzing a 1h short on Gold. We hit major supply block at 2350. Waiting for a confirmation break. Limit entry 2345, Stop Loss 2355, Take Profit 2320."*

### ₿ Crypto (4h Swing)
> **SYM:** `BTCUSD`
> **Chat Box:** *"Looking at a 4h long setup. Bitcoin swept a massive sell-side liquidity pool and printed a 4h bullish engulfing right through the CHoCH. Entry 64000, Stop Loss 61000, Target 70000."*

---
### 🧠 How the AI specifically handles these requests:
1. It automatically corrects your symbol formatting flawlessly and punches through the firewall.
2. It downloads exactly the last 1,000 candles explicitly matching your text string (`15m`, `1h`, `4h`) to form a mathematical foundation matrix.
3. It cross-references the instantaneous live price exactly matching Yahoo Finance to structurally verify your chart upload.
4. It outputs your final **EXECUTE**, **WAIT**, or **NO TRADE** verification safely.

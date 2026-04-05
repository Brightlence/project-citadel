import os
import json
import pathlib
import bcrypt
import jwt
import uuid
import requests
import asyncio
import base64
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import google.generativeai as genai
import anthropic
import openai
import yfinance as yf
import requests
import re
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import engine, Base, get_db
import models

load_dotenv()

# Instantiating the SQLite Tables
models.Base.metadata.create_all(bind=engine)

# Configure Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# JWT SECRETS
SECRET_KEY = os.getenv("JWT_SECRET", "CITADEL_SECURE_RNG_KEY_DEFAULT_99")
ALGORITHM = "HS256"

# Globals
rulebook_genai_file = None
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")

def fetch_yfinance_data(symbol: str, timeframe: str = "15m"):
    if not symbol: return ""
    try:
        # Intelligently Auto-Format Forex and Crypto tickers for Yahoo Finance native standards
        symbol = symbol.upper().strip()
        if len(symbol) == 6 and symbol.isalpha() and not symbol.endswith("=X"):
            symbol = f"{symbol}=X" # Auto converts AUDUSD to AUDUSD=X
        elif len(symbol) in [6, 7] and symbol.endswith("USD") and "-" not in symbol and symbol != "AUDUSD=X":
            # Auto converts BTCUSD to BTC-USD (fallback attempt)
            if symbol.startswith("BTC") or symbol.startswith("ETH") or symbol.startswith("SOL"):
                symbol = f"{symbol[:-3]}-USD"

        # Let yfinance internally handle the curl_cffi session to bypass cloudflare blocks
        ticker = yf.Ticker(symbol)
        
        # Adjust periods to massive historical limits to guarantee at least 1,000 bars
        period = "60d"
        interval = "15m"
        timeframe = timeframe.lower()
        if timeframe in ["1m", "5m"]: period = "7d"; interval = timeframe
        elif timeframe in ["15m", "30m"]: period = "60d"; interval = timeframe
        elif timeframe in ["1h", "60m"]: period = "730d"; interval = "1h"
        elif timeframe == "4h": period = "730d"; interval = "1h" # Fallback approximation
        elif timeframe == "1d": period = "10y"; interval = "1d"
        elif timeframe == "1wk": period = "max"; interval = "1wk"

        data = ticker.history(period=period, interval=interval)
        
        if not data.empty:
            price = round(data['Close'].iloc[-1], 2)
            volume = int(data['Volume'].iloc[-1])
            
            # Massive 1,000 candle CSV mathematical matrix
            df_slice = data.tail(1000)[['Open', 'High', 'Low', 'Close', 'Volume']].round(4)
            csv_matrix = df_slice.to_csv(index=True)
            
            return f"LIVE Quote -> Symbol: {symbol} | Current Price: ${price}\n\nRAW HISTORICAL MARKET MATRIX ({interval}, LAST 1000 BARS):\n{csv_matrix}"
        return f"LIVE DATA UNAVAILABLE FOR {symbol}"
    except Exception as e:
        return f"Error fetching live data array: {e}"

def fetch_fundamental_data(symbol: str) -> str:
    if not symbol: return "No symbol provided for news fetch."
    original_symbol = symbol
        
    formatted_news = f"FUNDAMENTAL CONTEXT FOR {original_symbol}:\n"
    
    # --- 1. FOREX FACTORY ECONOMIC CALENDAR ---
    try:
        url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        ff_res = requests.get(url, headers=headers, timeout=5)
        if ff_res.status_code == 200:
            ff_data = ff_res.json()
            relevant_currencies = ['USD']
            clean_sym = original_symbol.upper().strip().replace('=X', '')
            if len(clean_sym) >= 6:
                relevant_currencies.extend([clean_sym[:3], clean_sym[3:6]])
            elif len(clean_sym) == 3:
                relevant_currencies.append(clean_sym)
            
            high_impact_events = []
            for event in ff_data:
                if event.get('country') in relevant_currencies and event.get('impact') in ['High', 'Medium']:
                    dt = event.get('date', '')
                    high_impact_events.append(f"- [{event.get('impact')}] {event.get('country')}: {event.get('title')} (Time: {dt})")
            
            if high_impact_events:
                formatted_news += "\n[UPCOMING MACRO ECONOMIC EVENTS (FOREX FACTORY)]\n" + "\n".join(high_impact_events) + "\n"
    except Exception:
        pass

    # --- 2. YAHOO FINANCE HEADLINES ---
    try:
        symbol = original_symbol.upper().strip()
        if len(symbol) == 6 and symbol.isalpha() and not symbol.endswith("=X"):
            symbol = f"{symbol}=X" 
        elif len(symbol) in [6, 7] and symbol.endswith("USD") and "-" not in symbol and symbol != "AUDUSD=X":
            if symbol.startswith("BTC") or symbol.startswith("ETH") or symbol.startswith("SOL"):
                symbol = f"{symbol[:-3]}-USD"

        ticker = yf.Ticker(symbol)
        news_items = ticker.news
        
        if news_items:
            formatted_news += "\n[RECENT YAHOO HEADLINES]\n"
            for i, item in enumerate(news_items[:10]):
                headline = item.get('title', 'Unknown Title')
                publisher = item.get('publisher', 'Unknown Publisher')
                formatted_news += f"{i+1}. {headline} (Source: {publisher})\n"
        elif "[UPCOMING MACRO" not in formatted_news:
            formatted_news += "\nNo recent specific headlines found."
            
        return formatted_news
    except Exception as e:
        if "[UPCOMING MACRO" in formatted_news: return formatted_news
        return f"Warning: Fundamental data currently unavailable ({str(e)})."

# --- AUTH & CRYPTO UTILITIES ---
def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=7)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user

def get_current_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Strictly restricted to Admin Tier.")
    return current_user

@asynccontextmanager
async def lifespan(app: FastAPI):
    global rulebook_genai_file
    
    # 1. Setup Admin Account dynamically if it doesn't exist
    db = next(get_db())
    admin_exists = db.query(models.User).filter(models.User.role == "ADMIN").first()
    if not admin_exists:
        print("Initializing Master Admin Account (admin@citadel.net / password: admin)")
        admin = models.User(
            email="admin@citadel.net",
            hashed_password=get_password_hash("admin"),
            role="ADMIN"
        )
        db.add(admin)
        db.commit()
    
    # 2. Setup Gemini Rulebook Native PDF
    pdf_path = "Chart_Patterns_Rulebook.pdf"
    if not os.path.exists(pdf_path):
        pdfs = list(pathlib.Path('.').glob('*.pdf'))
        if pdfs:
            pdf_path = str(pdfs[0])

    if os.path.exists(pdf_path):
        print(f"Uploading Rulebook PDF '{pdf_path}' to Gemini File API...")
        try:
            rulebook_genai_file = genai.upload_file(path=pdf_path, mime_type="application/pdf")
        except Exception as e:
            print(f"Failed to upload PDF: {e}")
            
    yield
    if rulebook_genai_file:
        try:
            genai.delete_file(rulebook_genai_file.name)
        except Exception:
            pass

app = FastAPI(title="Project Citadel Backend Architecture", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# PYDANTIC SCHEMAS
# ---------------------------------------------------------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    access_token: str  # The physical master token to gain entry

class TokenLogin(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    class Config:
        from_attributes = True

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str

class TradePlan(BaseModel):
    entry: Optional[float] = None
    sl: Optional[float] = None
    tp: Optional[float] = None

class TradingDecision(BaseModel):
    verdict: str
    pattern_found: bool
    trade_plan: Optional[TradePlan] = None
    ai_reasoning: str

# ---------------------------------------------------------
# 1. IDENTITY ROUTER (AUTH)
# ---------------------------------------------------------
@app.post("/api/v1/auth/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already completely registered.")
        
    # Check the Access Token to see if it is a valid leaked/unleaked token
    token_record = db.query(models.AccessToken).filter(models.AccessToken.token == user.access_token).first()
    if not token_record or not token_record.is_active:
        raise HTTPException(status_code=403, detail="Invalid, revoked, or expired Access Token.")
    
    # Check if the token was already used by someone else
    if token_record.used_by_id is not None:
        raise HTTPException(status_code=403, detail="This Access Token has already been consumed.")
    
    # Registration successful.
    new_user = models.User(
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role="GUEST"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Consume the token strictly wrapping it to this user's ID
    token_record.used_by_id = new_user.id
    db.commit()
    
    return new_user

@app.post("/api/v1/auth/login", response_model=TokenLogin)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or signature password")
    
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

@app.get("/api/v1/auth/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/api/v1/auth/password")
def update_password(payload: PasswordUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid current signature password.")
    current_user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Signature password effectively rewritten."}

@app.delete("/api/v1/auth/me")
def delete_my_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == "ADMIN":
        raise HTTPException(status_code=400, detail="Master node cannot be purged.")
    
    for token in current_user.keys_used:
        token.used_by_id = None
        token.is_active = False 
        
    db.query(models.TradeSession).filter(models.TradeSession.user_id == current_user.id).delete()
    db.delete(current_user)
    db.commit()
    return {"message": "Account successfully purged."}

# ---------------------------------------------------------
# 2. THE ADMIN HUB
# ---------------------------------------------------------
@app.get("/api/v1/admin/users")
def get_all_users(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    # Include their session count
    data = []
    for u in users:
        data.append({
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "total_trades": len(u.sessions)
        })
    return data

@app.delete("/api/v1/admin/users/{user_id}")
def delete_tenant(user_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    if admin.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot purge the master node.")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Entity not found.")
    
    # Revoke tokens registered to this user
    for token in user.keys_used:
        token.used_by_id = None
        token.is_active = False 
        
    db.query(models.TradeSession).filter(models.TradeSession.user_id == user.id).delete()
    db.delete(user)
    db.commit()
    return {"message": "Tenant successfully purged from the database."}


@app.get("/api/v1/admin/tokens")
def get_all_tokens(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    tokens = db.query(models.AccessToken).order_by(models.AccessToken.created_at.desc()).all()
    data = []
    for t in tokens:
        data.append({
            "id": t.id,
            "token": t.token,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "used_by_id": t.used_by_id,
            "used_by_email": t.used_by_user.email if t.used_by_user else None
        })
    return data

@app.post("/api/v1/admin/tokens/generate")
def generate_token(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    # Generate a massive cryptographically secure master key string
    new_key = f"CITADEL-{str(uuid.uuid4()).upper()[:13]}"
    db_token = models.AccessToken(token=new_key)
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token

@app.post("/api/v1/admin/tokens/{token_id}/revoke")
def revoke_token(token_id: int, admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    token_record = db.query(models.AccessToken).filter(models.AccessToken.id == token_id).first()
    if not token_record:
        raise HTTPException(status_code=404, detail="Token entity not found.")
    
    token_record.is_active = False # Killswitch flipped
    db.commit()
    return {"message": "Token Signature Revoked and Disabled Successfully."}

@app.delete("/api/v1/admin/tokens/revoked")
def clear_revoked_tokens(admin: models.User = Depends(get_current_admin), db: Session = Depends(get_db)):
    db.query(models.AccessToken).filter(models.AccessToken.is_active == False).delete()
    db.commit()
    return {"message": "Revoked keys permanently cleared."}

# ---------------------------------------------------------
# 3. TRADING PLATFORM ENGINE
# ---------------------------------------------------------
@app.get("/api/v1/history")
def get_user_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.TradeSession).filter(models.TradeSession.user_id == current_user.id).order_by(models.TradeSession.created_at.asc()).all()
    # Format them for the react loop
    history = []
    for s in sessions:
        # Reconstruct the AI Data envelope
        data = {
            "verdict": s.verdict,
            "pattern_found": True, # Synthesized
            "trade_plan": { "entry": s.entry, "sl": s.sl, "tp": s.tp } if s.entry else None,
            "ai_reasoning": s.ai_reasoning
        }
        history.append({
            "type": "history", # Tells UI it's an old fetched message
            "user_query": s.user_query,
            "data": data,
            "timestamp": s.created_at.strftime("%I:%M:%S %p")
        })
    return history

@app.delete("/api/v1/history")
def delete_user_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.TradeSession).filter(models.TradeSession.user_id == current_user.id).delete()
    db.commit()
    return {"message": "History successfully purged."}

@app.post("/api/v1/analyze-trade", response_model=TradingDecision)
async def analyze_trade(
    chart_image: UploadFile = File(...),
    live_data: str = Form(...),
    current_user: models.User = Depends(get_current_user), # Restrict to Authenticated JWT connections purely
    db: Session = Depends(get_db)
):
    try:
        image_bytes = await chart_image.read()
        chart_part = {
            "mime_type": chart_image.content_type,
            "data": image_bytes
        }
        
        parsed_live_data = json.loads(live_data)
        asset_symbol = parsed_live_data.get("asset", "")
        user_query = parsed_live_data.get("user_query", "").lower()
        
        timeframe_match = re.search(r'\b(1m|5m|15m|30m|1h|4h|1d|1wk)\b', user_query)
        detected_timeframe = timeframe_match.group(1) if timeframe_match else "15m"

        real_time_market_data = fetch_yfinance_data(asset_symbol, detected_timeframe) if asset_symbol else ""
        fundamental_news_data = fetch_fundamental_data(asset_symbol) if asset_symbol else ""

        # ---------------------------------------------
        # AGENT 1: ELITE INSTITUTIONAL TRADING AI
        # ---------------------------------------------
        elite_trader_prompt = f"""
You are an elite institutional trading AI operating inside a multi-agent system.
Your job is NOT to predict the market, but to FILTER, VALIDATE, and STRUCTURE only high-quality trade opportunities.
You must think like a professional trader using:
- Smart Money Concepts (SMC)
- Price Action
- Market Structure
- Liquidity theory
- Risk management
- Fundamental News and Macroeconomic context
- Uploaded chart pattern pdf

========================
INPUTS
========================
- Live market qualitative data: {live_data}
- Fundamental News Context: {fundamental_news_data}
- Quantitative Raw Matrix (Live Price + 1000-Bar Array): {real_time_market_data}
- User Profile: Institutional standard (strict R:R, strict capital preservation).

Follow these exactly in your analysis:

========================
STEP 1: MARKET STRUCTURE ANALYSIS (SMC CORE)
========================
- Identify Trend, BOS, CHoCH, Liquidity zones, Order blocks, FVG.
- Is market trending or ranging? In premium or discount zone?

========================
STEP 2: LIQUIDITY & INTENT
========================
- Identify resting liquidity. Detect fake breakouts, stop hunts.

========================
STEP 3: FUNDAMENTAL/NEWS CATALYST
========================
- Review the injected Fundamental News Context. 
- Does the real-world news narrative align with the technical chart? 
- Will upcoming data or recent headlines cause unpredictable liquidity sweeps that endanger this setup?
- If the news severely contradicts the technicals or indicates high impending volatility, you must factor this into invalidating the trade.

========================
STEP 4: TRADE SETUP VALIDATION
========================
- Validate Structure, Entry, Catalyst, R:R >= 1:2, Market conditions.
- If invalid, state "NO TRADE" explicitly.

========================
STEP 5: ENTRY STRATEGY
========================
- Define entry zone, SL, TP (min 1:2), Entry type.

========================
STEP 6: TIME-BASED INTELLIGENCE
========================
- If not ready, state "WAIT" and conditions.

========================
STEP 7: RISK ENGINE
========================
- Calculate position parameters.

========================
STEP 8: CONFIDENCE & QUALITY SCORE
========================
- Output Confidence Score (0-100) and Quality Score (0-10)

========================
STEP 9: TRADE DECISION OUTPUT
========================
- Choose ONE: 1. EXECUTE TRADE | 2. WAIT | 3. NO TRADE

========================
STEP 10: PROFESSIONAL SUMMARY
========================
- Bias, Decision, Entry, Stop Loss, Take Profit, Risk/Reward, Confidence, Reasoning.
- Note how the fundamental news impacted your decision.
"""

        async def fetch_gemini_analysis():
            try:
                trader_contents = [elite_trader_prompt, chart_part]
                if rulebook_genai_file:
                    trader_contents.append(rulebook_genai_file) 
                
                trader_model = genai.GenerativeModel("gemini-2.5-flash")
                trader_response = await trader_model.generate_content_async(
                    trader_contents,
                    generation_config=genai.GenerationConfig(temperature=0.2)
                )
                return "### 🤖 Gemini Elite Trader Analysis:\n" + trader_response.text
            except Exception as e:
                return f"### 🤖 Gemini Elite Trader Analysis:\n[API SKIPPED or QUOTA EXHAUSTED: {str(e)}]"

        async def fetch_claude_analysis():
            anthropic_key = os.getenv("ANTHROPIC_API_KEY")
            if not anthropic_key:
                return "### 🤖 Claude Elite Trader Analysis:\n[API SKIPPED: Missing ANTHROPIC_API_KEY in .env]"
            try:
                client = anthropic.AsyncAnthropic(api_key=anthropic_key)
                encoded_image = base64.b64encode(image_bytes).decode('utf-8')
                response = await client.messages.create(
                    model="claude-3-5-sonnet-latest",
                    max_tokens=2048,
                    temperature=0.2,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": elite_trader_prompt},
                                {
                                    "type": "image",
                                    "source": {
                                        "type": "base64",
                                        "media_type": chart_part["mime_type"],
                                        "data": encoded_image
                                    }
                                }
                            ]
                        }
                    ]
                )
                return "### 🤖 Claude Elite Trader Analysis:\n" + response.content[0].text
            except Exception as e:
                return f"### 🤖 Claude Elite Trader Analysis:\n[API SKIPPED or QUOTA EXHAUSTED: {str(e)}]"

        async def fetch_deepseek_analysis():
            deepseek_key = os.getenv("DEEPSEEK_API_KEY")
            if not deepseek_key:
                return "### 🤖 DeepSeek Elite Trader Analysis:\n[API SKIPPED: Missing DEEPSEEK_API_KEY in .env]"
            try:
                client = openai.AsyncOpenAI(api_key=deepseek_key, base_url="https://api.deepseek.com")
                response = await client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": "You are an elite quantitative trading AI."},
                        {"role": "user", "content": elite_trader_prompt + "\n\n(Note: Evaluate the numerical data provided above purely textually, as no image is attached for you due to model constraints.)"}
                    ],
                    temperature=0.2,
                    max_tokens=2048
                )
                return "### 🤖 DeepSeek Elite Trader Analysis:\n" + response.choices[0].message.content
            except Exception as e:
                return f"### 🤖 DeepSeek Elite Trader Analysis:\n[API SKIPPED or QUOTA EXHAUSTED: {str(e)}]"

        # Run all three API models in parallel using an asyncio gathering pool
        analyses = await asyncio.gather(
            fetch_gemini_analysis(),
            fetch_claude_analysis(),
            fetch_deepseek_analysis()
        )
        trader_analysis = "\n\n=======================\n\n".join(analyses)

        # ---------------------------------------------
        # AGENT 2: SENIOR TRADING RISK MANAGER
        # ---------------------------------------------
        risk_manager_prompt = f"""
You are a senior trading risk manager operating inside a multi-agent quantitative system.
You are given the detailed analysis from multiple Elite Institutional Trading AIs (Gemini, Claude, and DeepSeek).

Your job:
- Identify agreement or conflict in the analyses.
- Reject weak setups.
- Approve only high-quality trades.
- If there is disagreement or weak structure → RETURN "NO TRADE"
- If timing is not right → RETURN "WAIT"
- Only approve trades with strong confluence across multiple models → RETURN "EXECUTE TRADE"
Final authority: You decide whether the trader should act. Your primary goal is to PREVENT bad trades, not generate trades.

=== ELITE TRADERS' ANALYSES ===
{trader_analysis}
===============================

Your output MUST be strictly wrapped in the following JSON schema:
{{
  "verdict": "EXECUTE TRADE", // Choose: "EXECUTE TRADE", "WAIT", "NO TRADE", or "CHAT"
  "pattern_found": true, // true if structural patterns were respected
  "trade_plan": {{
      "entry": 0.00, // Numerical value or null
      "sl": 0.00, // Numerical value or null
      "tp": 0.00 // Numerical value or null
  }},
  "ai_reasoning": "Your comments as the Risk Manager evaluating the setup." 
}}
"""
        risk_manager_model = genai.GenerativeModel("gemini-2.5-flash")
        final_response = await risk_manager_model.generate_content_async(
            risk_manager_prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.0,
                response_mime_type="application/json",
            )
        )
        
        decision_data = json.loads(final_response.text)
        
        # Combine the reasonings for the ultimate user breakdown
        combined_reasoning = f"### 🛡️ MULTI-MODEL RISK MANAGER VERIFICATION\n{decision_data.get('ai_reasoning', '')}\n\n---\n\n{trader_analysis}"
        decision_data['ai_reasoning'] = combined_reasoning

        decision = TradingDecision(**decision_data)
        
        # Silently Auditing / Logging to the Database bounded to this specific JWT Token tenant
        trade_log = models.TradeSession(
            user_id=current_user.id,
            user_query=json.loads(live_data).get('user_query', ''),
            verdict=decision.verdict,
            entry=decision.trade_plan.entry if decision.trade_plan else None,
            sl=decision.trade_plan.sl if decision.trade_plan else None,
            tp=decision.trade_plan.tp if decision.trade_plan else None,
            ai_reasoning=decision.ai_reasoning
        )
        db.add(trade_log)
        db.commit()
        
        return decision.dict()
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

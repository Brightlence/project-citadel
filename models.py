from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="GUEST")  # Roles: ADMIN or GUEST
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sessions = relationship("TradeSession", back_populates="user")
    keys_used = relationship("AccessToken", back_populates="used_by_user")

class AccessToken(Base):
    """Tokens generated exclusively by the ADMIN to allow strictly gated system registration"""
    __tablename__ = "access_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)  # Admin can revoke/kill switch this
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Null if unused, mapped to User ID if someone has burned the token for registration
    used_by_id = Column(Integer, ForeignKey("users.id"), nullable=True) 
    used_by_user = relationship("User", back_populates="keys_used")

class TradeSession(Base):
    """Historical logs of every prompt and AI strategy response for strict per-tenant boundaries"""
    __tablename__ = "trade_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    # Inputs
    user_query = Column(String)
    
    # Computed Outputs from Gemini API Payload Schema
    verdict = Column(String)
    entry = Column(Float, nullable=True)
    sl = Column(Float, nullable=True)
    tp = Column(Float, nullable=True)
    ai_reasoning = Column(String)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="sessions")

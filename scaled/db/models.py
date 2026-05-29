import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text,
    ForeignKey, Enum, JSON, create_engine
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from scaled.core.config import get_settings

Base = declarative_base()


# --- Enums ---

class CustomerSegment(str, enum.Enum):
    DNB = "digital_native_business"
    STRATEGICS = "strategics"
    INDUSTRIES = "industries"
    PUBLIC_SECTOR = "public_sector"
    SMALL_BUSINESS = "small_business"
    SELF_SERVE = "self_serve"


class PlanTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    MAX_100 = "max_100"
    MAX_200 = "max_200"
    TEAM_STANDARD = "team_standard"
    TEAM_PREMIUM = "team_premium"
    ENTERPRISE = "enterprise"
    API = "api"


class HealthStatus(str, enum.Enum):
    HEALTHY = "healthy"
    MONITOR = "monitor"
    AT_RISK = "at_risk"
    CRITICAL = "critical"


class OnboardingStage(str, enum.Enum):
    SIGNED_UP = "signed_up"
    API_KEY_CREATED = "api_key_created"
    FIRST_API_CALL = "first_api_call"
    FIRST_WORKFLOW = "first_workflow"
    INTEGRATED = "integrated"
    SCALING = "scaling"
    CHAMPION = "champion"


class PlayType(str, enum.Enum):
    TOKEN_OPTIMIZATION = "token_optimization"
    BURN_RATE_ALERT = "burn_rate_alert"
    INCIDENT_OUTREACH = "incident_outreach"
    ONBOARDING_NUDGE = "onboarding_nudge"
    EXPANSION_SIGNAL = "expansion_signal"
    CHURN_RISK = "churn_risk"
    REACTIVATION = "reactivation"
    MILESTONE_CELEBRATION = "milestone_celebration"


class PlayStatus(str, enum.Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class IncidentSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# --- Models ---

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    segment = Column(Enum(CustomerSegment), nullable=False)
    plan_tier = Column(Enum(PlanTier), nullable=False)
    onboarding_stage = Column(Enum(OnboardingStage), default=OnboardingStage.SIGNED_UP)
    monthly_commitment = Column(Float, default=0.0)  # $ spending commitment
    seats = Column(Integer, default=1)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    arr = Column(Float, default=0.0)  # annual recurring revenue
    health_status = Column(Enum(HealthStatus), default=HealthStatus.HEALTHY)
    health_score = Column(Integer, default=100)  # 0-100
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    metadata_ = Column("metadata", JSON, default=dict)

    usage_events = relationship("UsageEvent", back_populates="customer")
    health_checks = relationship("HealthCheck", back_populates="customer")
    plays = relationship("Play", back_populates="customer")
    comms = relationship("Communication", back_populates="customer")


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    model = Column(String(50), nullable=False)  # claude-opus-4-6, claude-sonnet-4-6, etc.
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cost = Column(Float, default=0.0)  # computed from token pricing
    endpoint = Column(String(100), default="messages")  # messages, batch, claude_code
    cache_hits = Column(Integer, default=0)
    cache_misses = Column(Integer, default=0)

    customer = relationship("Customer", back_populates="usage_events")


class HealthCheck(Base):
    __tablename__ = "health_checks"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    score = Column(Integer, nullable=False)  # 0-100
    status = Column(Enum(HealthStatus), nullable=False)
    signals = Column(JSON, default=dict)  # structured signal data
    analysis = Column(Text)  # Claude's analysis
    recommendations = Column(JSON, default=list)  # Claude's recommendations

    customer = relationship("Customer", back_populates="health_checks")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(IncidentSeverity), nullable=False)
    started_at = Column(DateTime, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    affected_services = Column(JSON, default=list)  # ["api", "claude_code", "console"]
    affected_models = Column(JSON, default=list)  # ["claude-opus-4-6", "claude-sonnet-4-6"]
    status_page_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)


class Play(Base):
    __tablename__ = "plays"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    play_type = Column(Enum(PlayType), nullable=False)
    status = Column(Enum(PlayStatus), default=PlayStatus.PENDING)
    trigger_signal = Column(JSON, default=dict)  # what triggered this play
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    executed_at = Column(DateTime, nullable=True)
    result = Column(JSON, nullable=True)  # outcome data

    customer = relationship("Customer", back_populates="plays")
    communications = relationship("Communication", back_populates="play")


class Communication(Base):
    __tablename__ = "communications"

    id = Column(Integer, primary_key=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    play_id = Column(Integer, ForeignKey("plays.id"), nullable=True)
    channel = Column(String(50), default="email")  # email, in_app, slack
    subject = Column(String(500))
    body = Column(Text, nullable=False)
    generated_by = Column(String(50), default="claude")  # claude or human
    sent_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)
    clicked_at = Column(DateTime, nullable=True)

    customer = relationship("Customer", back_populates="comms")
    play = relationship("Play", back_populates="communications")


# --- Engine & Session ---

def get_engine():
    return create_engine(get_settings().database_url)


def get_session():
    engine = get_engine()
    Session = sessionmaker(bind=engine)
    return Session()


def init_db():
    engine = get_engine()
    Base.metadata.create_all(engine)
    return engine

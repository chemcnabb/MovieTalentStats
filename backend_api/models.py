from typing import Optional
import uuid
from sqlmodel import Field, SQLModel
from pydantic import computed_field  # <--- Import this!

class TalentBase(SQLModel):
    name: str = Field(index=True)
    role: str = Field(index=True)  # 'Screenwriter', 'Director', 'Novelist'
    completion_rate: float = Field(default=0.0)  # Audience retention (0.0 to 1.0)
    word_of_mouth_score: float = Field(default=1.0)  # Organic lift multiplier (1.0 to 10.0)
    rewrite_ratio: float = Field(default=0.0)  # Production inefficiency/penalty (0.0 to 1.0)
    ip_strength: float = Field(default=0.0)  # IP reliance (0 = original work, 1 = huge franchise)
    base_cost: float = Field(default=0.0)  # Market rate to hire / option salary

# Add this inside models.py (right underneath class TalentBase)

class TalentCreate(TalentBase):
    """
    Schema used for creating a brand new talent entry via POST requests.
    Inherits all structural configurations directly from TalentBase.
    """
    pass

class Talent(TalentBase, table=True):
    """
    The exact mapping of the SQLite table structure.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)


class TalentRead(TalentBase):
    """
    The API response schema. This explicitly declares creative_war as a field
    so FastAPI/Pydantic can serialize it correctly without raising validation errors.
    """
    id: str
    # This decorator tells Pydantic v2 to structurally calculate and 
    # output this field during JSON dump operations automatically.
    @computed_field
    @property
    def creative_war(self) -> float:
        raw_engagement = (self.completion_rate * 10) + self.word_of_mouth_score
        ip_discount = 1.0 - (self.ip_strength * 0.5)
        efficiency_penalty = self.rewrite_ratio * 3.0
        
        calculated_war = (raw_engagement * ip_discount) - efficiency_penalty
        return round(max(0.0, calculated_war), 2)

    @classmethod
    def model_validate(cls, obj, **kwargs):
        # Calculate Sabermetrics parameters dynamically
        raw_engagement = (obj.completion_rate * 10) + obj.word_of_mouth_score
        ip_discount = 1.0 - (obj.ip_strength * 0.5)
        efficiency_penalty = obj.rewrite_ratio * 3.0
        
        calculated_war = (raw_engagement * ip_discount) - efficiency_penalty
        
        
        
        # Instantiate the schema with all structural field values present
        return cls(
            id=obj.id,
            name=obj.name,
            role=obj.role,
            completion_rate=obj.completion_rate,
            word_of_mouth_score=obj.word_of_mouth_score,
            rewrite_ratio=obj.rewrite_ratio,
            ip_strength=obj.ip_strength,
            base_cost=obj.base_cost,
            creative_war=round(max(0.0, calculated_war), 2)
        )


class TalentUpdate(SQLModel):
    """
    Schema used for partial, dynamic updates via React.
    """
    name: Optional[str] = None
    role: Optional[str] = None
    completion_rate: Optional[float] = None
    word_of_mouth_score: Optional[float] = None
    rewrite_ratio: Optional[float] = None
    ip_strength: Optional[float] = None
    base_cost: Optional[float] = None

from beanie import Document, PydanticObjectId
from pydantic import Field
import time

class Alert(Document):
    user_id: PydanticObjectId
    ticker: str
    condition: str  # "ABOVE" or "BELOW"
    price: float
    is_triggered: bool = False
    triggered_at: float | None = None
    created_at: float = Field(default_factory=time.time)

    class Settings:
        name = "alerts"

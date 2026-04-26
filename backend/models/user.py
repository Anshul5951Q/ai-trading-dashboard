from beanie import Document
from pydantic import Field, EmailStr

class User(Document):
    email: EmailStr
    hashed_password: str
    
    class Settings:
        name = "users"

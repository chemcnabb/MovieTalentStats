from sqlmodel import create_engine, SQLModel, Session
from fastapi import Depends

sqlite_file_name = "scouting_studio.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# connect_args={"check_same_thread": False} is vital specifically for SQLite with FastAPI multi-threading
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# Dependency to provide safe transaction scopes per API request
def get_session():
    with Session(engine) as session:
        yield session

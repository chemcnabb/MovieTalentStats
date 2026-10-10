from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select, func
from typing import List, Optional, Dict, Any

from database import create_db_and_tables, get_session
from models import Talent, TalentCreate, TalentRead, TalentUpdate

app = FastAPI(title="Creative Sabermetrics Studio Backend")

# 🚨 Setup CORS so your local React App can query the API without blockages
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Change to your React dev URL in production (e.g., ["http://localhost:5173"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.post("/talent/", response_model=TalentRead)
def create_talent_profile(talent: TalentCreate, session: Session = Depends(get_session)):
    db_talent = Talent.model_validate(talent)
    session.add(db_talent)
    session.commit()
    session.refresh(db_talent)
    return db_talent

@app.get("/talent/", response_model=Dict[str, Any])
def query_talent_pool(
    role: Optional[str] = None, 
    max_cost: Optional[float] = None,
    undervalued_only: bool = False, # <--- New analytical filter parameter
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_session)
):
    page = max(1, page)
    page_size = max(1, min(100, page_size))
    
    statement = select(Talent)
    count_statement = select(func.count()).select_from(Talent)
    
    if role:
        statement = statement.where(Talent.role == role)
        count_statement = count_statement.where(Talent.role == role)
    if max_cost:
        statement = statement.where(Talent.base_cost <= max_cost)
        count_statement = count_statement.where(Talent.base_cost <= max_cost)
        
    db_results = session.exec(statement).all()
    
    output_pool = [
        TalentRead.model_validate(item).model_dump() 
        for item in db_results
    ]
    
    # Calculate Valuation Metrics on the fly
    for item in output_pool:
        # Prevent division by zero errors on low cost baselines
        cost_factor = max(1.0, item["base_cost"] / 100000.0) 
        # Value Rating isolates high-yield WAR at budget pricing tiers
        item["value_rating"] = round(item["creative_war"] / cost_factor, 2)

    # Sort logic swaps depending on active scouting filter
    if undervalued_only:
        # Filter: Must possess meaningful baseline WAR, sorted by highest value ROI yield
        filtered_pool = [x for x in output_pool if x["creative_war"] >= 3.0]
        sorted_pool = sorted(filtered_pool, key=lambda x: x["value_rating"], reverse=True)
        total_count = len(sorted_pool)
    else:
        sorted_pool = sorted(output_pool, key=lambda x: x["creative_war"], reverse=True)
        total_count = session.exec(count_statement).one() if not (role or max_cost) else len(sorted_pool)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_results = sorted_pool[start_idx:end_idx]
    
    return {
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
        "items": paginated_results
    }


'''@app.get("/talent/", response_model=Dict[str, Any])
def query_talent_pool(
    role: Optional[str] = None, 
    max_cost: Optional[float] = None,
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_session)
):
    # Ensure inputs don't crash under negative bounds
    page = max(1, page)
    page_size = max(1, min(100, page_size)) # Hard cap page size to 100 max
    
    # 1. Construct the base query criteria
    statement = select(Talent)
    count_statement = select(func.count()).select_from(Talent)
    
    if role:
        statement = statement.where(Talent.role == role)
        count_statement = count_statement.where(Talent.role == role)
    if max_cost:
        statement = statement.where(Talent.base_cost <= max_cost)
        count_statement = count_statement.where(Talent.base_cost <= max_cost)
        
    # 2. Get the total count for frontend pagination counters
    total_count = session.exec(count_statement).one()
    
    # 3. Pull all records matching criteria to sort them by dynamic WAR accurately
    db_results = session.exec(statement).all()
    
    # 4. Serialize into dynamic Pydantic structures with computed_fields
    output_pool = [
        TalentRead.model_validate(item).model_dump() 
        for item in db_results
    ]
    
    # 5. Sort the entire matching list by Creative WAR descending
    sorted_pool = sorted(output_pool, key=lambda x: x["creative_war"], reverse=True)
    
    # 6. Apply pagination slice on the sorted list python layer
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_results = sorted_pool[start_idx:end_idx]
    
    return {
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_count + page_size - 1) // page_size,
        "items": paginated_results
    }
'''

@app.patch("/talent/{talent_id}", response_model=TalentRead)
def update_talent_metrics(
    talent_id: str, 
    talent_update: TalentUpdate, 
    session: Session = Depends(get_session)
):
    db_talent = session.get(Talent, talent_id)
    if not db_talent:
        raise HTTPException(status_code=404, detail="Talent profile not found")
    
    # Extract only the modified values sent from the React UI
    update_data = talent_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_talent, key, value)
        
    session.add(db_talent)
    session.commit()
    session.refresh(db_talent)
    return db_talent

import os
import ast
import json
import pandas as pd
from tqdm import tqdm
from sqlmodel import Session, create_engine, select
# Import the existing DB engine and models we built earlier
from database import engine, create_db_and_tables
from models import Talent

def parse_crew_safely(crew_str):
    """
    Safely unpacks the Kaggle credits stringified JSON array 
    to extract Directors and Screenwriters.
    """
    if pd.isna(crew_str) or not isinstance(crew_str, str):
        return []
    try:
        # The dataset sometimes uses Python literal evaluation notation rather than strict JSON
        return ast.literal_eval(crew_str)
    except (ValueError, SyntaxError):
        try:
            return json.loads(crew_str)
        except Exception:
            return []

def run_sabermetric_ingestion(metadata_path="movies_metadata.csv", credits_path="credits.csv"):
    print("🚀 Initializing Sabermetric Database Layout...")
    create_db_and_tables()

    print("📖 Loading Movies Metadata File (This might take a moment)...")
    # Low_memory=False stops type inference warnings on massive dataframes
    meta_df = pd.read_csv(metadata_path, low_memory=False)
    
    # Drop messy rows where ID isn't an integer numeric value
    meta_df['id'] = pd.to_numeric(meta_df['id'], errors='coerce')
    meta_df = meta_df.dropna(subset=['id'])
    meta_df['id'] = meta_df['id'].astype(int)
    
    print("🎬 Loading Production Credits System...")
    credits_df = pd.read_csv(credits_path)
    credits_df['id'] = credits_df['id'].astype(int)

    print("🔗 Merging Metadata and Creative Credits...")
    merged_df = pd.merge(meta_df, credits_df, on='id')

    # Storage tracker to accumulate and average statistical markers per person
    # Structure: { (name, role): { "completion_rates": [], "vote_scores": [], "budgets": [], "belongs_to_collection": [] } }
    scouting_aggregation = {}

    print("🧠 Extracting Filmmakers & Deriving Sabermetric Ratios...")
    for _, row in tqdm(merged_df.iterrows(), total=merged_df.shape[0]):
        # Parse numbers cleanly
        vote_avg = pd.to_numeric(row.get('vote_average'), errors='coerce')
        vote_count = pd.to_numeric(row.get('vote_count'), errors='coerce')
        budget = pd.to_numeric(row.get('budget'), errors='coerce')
        
        # Filter for statistically significant entries to prevent outlier noise
        if pd.isna(vote_avg) or vote_count < 10:
            continue
            
        # 1. Map Completion / Retention Rate using Normalized Viewer Scores
        # We transform vote_average (0-10) to a decimal percentage metric (0.0 - 1.0)
        derived_retention = min(1.0, max(0.0, vote_avg / 10.0))
        
        # 2. Map Organic Word-of-Mouth (WOM)
        # Highly reviewed films signify high viral velocity / exit velocity
        derived_wom = min(10.0, max(1.0, 1.0 + (vote_count / 1500.0) * 9.0))
        
        # 3. Track Franchise Reliance
        # If the movie belongs to an established franchise collection, individual impact lowers
        is_franchise = 1.0 if pd.notna(row.get('belongs_to_collection')) and row.get('belongs_to_collection') != "" else 0.0
        
        # Extract crew arrays
        crew_list = parse_crew_safely(row.get('crew'))
        
        for member in crew_list:
            job = member.get('job')
            name = member.get('name')
            if not name or job not in ['Director', 'Screenplay', 'Writer']:
                continue
            
            # Group Screenplay & General Writers under "Screenwriter"
            normalized_role = "Screenwriter" if job in ['Screenplay', 'Writer'] else "Director"
            key = (name, normalized_role)
            
            if key not in scouting_aggregation:
                scouting_aggregation[key] = {
                    "retention": [], "wom": [], "budget": [], "franchise": [], "count": 0
                }
                
            scouting_aggregation[key]["retention"].append(derived_retention)
            scouting_aggregation[key]["wom"].append(derived_wom)
            scouting_aggregation[key]["budget"].append(budget if budget > 0 else 500000) # Fallback baseline
            scouting_aggregation[key]["franchise"].append(is_franchise)
            scouting_aggregation[key]["count"] += 1

    print("💾 Committing Aggregated Profiles into SQLite Database...")
    with Session(engine) as session:
        # Pull existing records to avoid duplicate profiles on repeated runs
        existing_records = session.exec(select(Talent.name, Talent.role)).all()
        existing_lookup = set(existing_records)

        inserted_count = 0
        
        for (name, role), metrics in scouting_aggregation.items():
            # Exclude low-volume creators to isolate consistent trends
            if metrics["count"] < 2:
                continue
                
            if (name, role) in existing_lookup:
                continue

            # Calculate historical mean values across projects
            avg_retention = sum(metrics["retention"]) / len(metrics["retention"])
            avg_wom = sum(metrics["wom"]) / len(metrics["wom"])
            avg_franchise = sum(metrics["franchise"]) / len(metrics["franchise"])
            avg_budget = sum(metrics["budget"]) / len(metrics["budget"])
            
            # Map efficiency penalty (Rewrite Ratio)
            # High volume of work with fluctuating review bands signals a high-chaos editing process
            rewrite_variance = 0.15 if len(metrics["retention"]) > 3 else 0.05
            
            # Formulate hypothetical base salary option tiering based on asset budget experience
            calculated_cost = max(75000.0, round(avg_budget * 0.02, -3))

            talent_record = Talent(
                name=name,
                role=role,
                completion_rate=round(avg_retention, 2),
                word_of_mouth_score=round(avg_wom, 1),
                rewrite_ratio=rewrite_variance,
                ip_strength=round(avg_franchise, 2),
                base_cost=min(1500000.0, calculated_cost) # Cap standard hiring variables
            )
            
            session.add(talent_record)
            inserted_count += 1
            
            # Commit batch segments periodically to prevent memory locking
            if inserted_count % 500 == 0:
                session.commit()
                
        session.commit()
        print(f"🎉 Successfully ingested and saved {inserted_count} creative professionals into SQLite!")

if __name__ == "__main__":
    # Verifies both tracking files exist locally before processing
    if not os.path.exists("movies_metadata.csv") or not os.path.exists("credits.csv"):
        print("❌ Error: Missing source files. Please verify 'movies_metadata.csv' and 'credits.csv' are in this directory.")
    else:
        run_sabermetric_ingestion()

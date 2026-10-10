"""
Sabermetric Ingestion Script for The Movies Dataset (Kaggle)
Source: https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset

Transforms raw film credits and metadata into Moneyball Sabermetrics:
- Derived Retention Rate = vote_average / 10.0
- Organic Word-of-Mouth (Exit Velocity) = 1.0 + (vote_count / 1500.0) * 9.0
- Franchise Reliance (IP Park Factor) = 1.0 if belongs_to_collection else 0.0
- Rewrite Variance = 0.15 if projects > 3 else 0.05
- Base Salary Cap = max(75000, round(avg_budget * 0.02, -3))
"""

import os
import ast
import json
import pandas as pd
from tqdm import tqdm

base_path = "movie_data"

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

def run_sabermetric_ingestion(metadata_path=f"{base_path}/movies_metadata.csv", credits_path=f"{base_path}/credits.csv", output_json="data/talent_data.json"):
    print("📖 Loading Movies Metadata File...")
    meta_df = pd.read_csv(metadata_path, low_memory=False)
    
    # Force ID column to be string first, strip whitespaces, then drop non-numeric junk
    meta_df['id'] = meta_df['id'].astype(str).str.strip()
    meta_df['id'] = pd.to_numeric(meta_df['id'], errors='coerce')
    meta_df = meta_df.dropna(subset=['id'])
    meta_df['id'] = meta_df['id'].astype(int)
    
    print("🎬 Loading Production Credits System...")
    credits_df = pd.read_csv(credits_path)
    
    credits_df['id'] = pd.to_numeric(credits_df['id'], errors='coerce')
    credits_df = credits_df.dropna(subset=['id'])
    credits_df['id'] = credits_df['id'].astype(int)

    print("🔗 Merging Metadata and Creative Credits...")
    merged_df = pd.merge(meta_df, credits_df, on='id')
    
    print(f"📊 Merged Dataset Size: {merged_df.shape[0]} rows matched.")
    if merged_df.shape[0] == 0:
        print("❌ Error: Zero rows matched during the merge. Double-check your CSV file headers.")
        return

    scouting_aggregation = {}

    print("🧠 Extracting Filmmakers & Deriving Sabermetric Ratios...")
    for _, row in tqdm(merged_df.iterrows(), total=merged_df.shape[0]):
        vote_avg = pd.to_numeric(row.get('vote_average'), errors='coerce')
        vote_count = pd.to_numeric(row.get('vote_count'), errors='coerce')
        budget = pd.to_numeric(row.get('budget'), errors='coerce')
        
        # Lowered vote threshold constraint to 2 to ensure hidden talent/indie films bypass filters
        if pd.isna(vote_avg) or pd.isna(vote_count) or vote_count < 2:
            continue
            
        derived_retention = min(1.0, max(0.0, float(vote_avg) / 10.0))
        derived_wom = min(10.0, max(1.0, 1.0 + (float(vote_count) / 1500.0) * 9.0))
        
        is_franchise = 1.0 if pd.notna(row.get('belongs_to_collection')) and str(row.get('belongs_to_collection')).strip() != "" else 0.0
        
        crew_list = parse_crew_safely(row.get('crew'))
        if not crew_list:
            continue
        
        for member in crew_list:
            job = member.get('job')
            name = member.get('name')
            if not name or job not in ['Director', 'Screenplay', 'Writer']:
                continue
            
            normalized_role = "Screenwriter" if job in ['Screenplay', 'Writer'] else "Director"
            key = (name, normalized_role)
            
            if key not in scouting_aggregation:
                scouting_aggregation[key] = {
                    "retention": [], "wom": [], "budget": [], "franchise": [], "count": 0
                }
                
            scouting_aggregation[key]["retention"].append(derived_retention)
            scouting_aggregation[key]["wom"].append(derived_wom)
            scouting_aggregation[key]["budget"].append(budget if budget > 0 else 500000)
            scouting_aggregation[key]["franchise"].append(is_franchise)
            scouting_aggregation[key]["count"] += 1

    print(f"💾 Aggregated {len(scouting_aggregation)} unique profiles. Writing output...")
    
    import uuid
    records = []
    for (name, role), metrics in scouting_aggregation.items():
        if metrics["count"] < 1:
            continue

        avg_retention = sum(metrics["retention"]) / len(metrics["retention"])
        avg_wom = sum(metrics["wom"]) / len(metrics["wom"])
        avg_franchise = sum(metrics["franchise"]) / len(metrics["franchise"])
        avg_budget = sum(metrics["budget"]) / len(metrics["budget"])
        
        rewrite_variance = 0.15 if len(metrics["retention"]) > 3 else 0.05
        calculated_cost = max(75000.0, round(avg_budget * 0.02, -3))

        records.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "role": role,
            "completion_rate": round(avg_retention, 2),
            "word_of_mouth_score": round(avg_wom, 1),
            "rewrite_ratio": rewrite_variance,
            "ip_strength": round(avg_franchise, 2),
            "base_cost": min(1500000.0, float(calculated_cost))
        })

    os.makedirs(os.path.dirname(output_json), exist_ok=True)
    with open(output_json, "w") as f:
        json.dump(records, f, indent=2)
        
    print(f"🎉 Successfully ingested {len(records)} creative profiles into {output_json}!")

if __name__ == "__main__":
    if not os.path.exists(f"{base_path}/movies_metadata.csv") or not os.path.exists(f"{base_path}/credits.csv"):
        print(f"❌ Error: Missing source files. Place 'movies_metadata.csv' and 'credits.csv' into './{base_path}/'.")
    else:
        run_sabermetric_ingestion()

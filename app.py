from fastapi import FastAPI, HTTPException
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from io import BytesIO
from prophet import Prophet
import pulp
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Data
file_path = "synthetic_data.csv"
df = pd.read_csv(file_path)
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values('date')

store_cat_demand = df.groupby(['date', 'store_id', 'category'])['quantity'].sum().reset_index()
stores = df['store_id'].unique()
categories = df['category'].unique()
future_periods = 7
forecast_dict = {}

# Precompute forecasts for each store-category pair
for cat in categories:
    df_cat = store_cat_demand[store_cat_demand['category'] == cat]
    stores_in_cat = df_cat['store_id'].unique()
    
    for store in stores_in_cat:
        df_sc = df_cat[df_cat['store_id'] == store].copy()
        df_sc = df_sc.rename(columns={'date': 'ds', 'quantity': 'y'})
        
        if len(df_sc) < 10:
            continue
        
        model = Prophet(daily_seasonality=True)
        model.fit(df_sc)
        
        # Get the last date from training data
        last_date = df_sc['ds'].max()
        # Create a DataFrame that includes the historical dates and future dates
        future = model.make_future_dataframe(periods=future_periods)
        forecast = model.predict(future)
        
        # Extract past 7 days (within the training period)
        past_mask = (forecast['ds'] > (last_date - pd.Timedelta(days=7))) & (forecast['ds'] <= last_date)
        past_7 = forecast[past_mask][['ds', 'yhat']]
        
        # Extract next 7 days (future dates)
        future_mask = forecast['ds'] > last_date
        future_7 = forecast[future_mask][['ds', 'yhat']]
        
        forecast_dict[(store, cat)] = {
            "past_7_days": past_7.to_dict(orient='records'),
            "next_7_days": future_7.to_dict(orient='records')
        }

# Sample available inventory per product category
available_inventory = {'TECH': 500, 'BOOK': 600, 'HOME': 400, 'KIDS': 300}

@app.get("/forecast/store/{store_id}")
def forecast_store(store_id: str):
    results = {
        cat: forecast_dict.get((store_id, cat), "No forecast available")
        for cat in categories
    }
    return results

@app.get("/forecast/product/{product_category}")
def forecast_product(product_category: str):
    results = {
        store: forecast_dict.get((store, product_category), "No forecast available")
        for store in stores
    }
    return results

@app.get("/historical/{forecast_type}/{days}")
def get_historical_data(forecast_type: str, days: int, name: str = None):
    # Calculate the date range for the last 'days' of data.
    latest_date = df['date'].max()
    start_date = latest_date - pd.Timedelta(days=days - 1)
    
    # Filter the DataFrame for records within the date range.
    filtered_df = df[df['date'] >= start_date].copy()
    
    # Format the date for proper display.
    filtered_df['date'] = filtered_df['date'].dt.strftime("%Y-%m-%d")
    
    # If a name is provided, filter based on the forecast_type.
    # If forecast_type is 'store', then name refers to a store.
    # If forecast_type is 'product', then name refers to a product category.
    if name:
        if forecast_type.lower() == "store":
            filtered_df = filtered_df[filtered_df['store_id'] == name]
        elif forecast_type.lower() == "product":
            filtered_df = filtered_df[filtered_df['category'] == name]
    
    # Group the data based on forecast_type.
    # For store, if a specific store is selected, we want to see each day's breakdown by category.
    # For product, if a specific product is selected, we'll show each day's breakdown by store.
    if forecast_type.lower() == "store":
        if name:  # a specific store is selected, show breakdown by category.
            grouped = filtered_df.groupby(['date', 'category'])['quantity'].sum().reset_index()
        else:  # no specific store, so group by date and store.
            grouped = filtered_df.groupby(['date', 'store_id'])['quantity'].sum().reset_index()
    elif forecast_type.lower() == "product":
        if name:  # a specific product is selected, show breakdown by store.
            grouped = filtered_df.groupby(['date', 'store_id'])['quantity'].sum().reset_index()
        else:  # no specific product, so group by date and product.
            grouped = filtered_df.groupby(['date', 'category'])['quantity'].sum().reset_index()
    else:
        # If an unrecognized forecast_type is passed, return the ungrouped historical records.
        grouped = filtered_df

    return JSONResponse(content=grouped.to_dict(orient="records"))

@app.get("/allocation")
def allocate_stock(by: str, category: str = None, store: str = None, inventory: int = None):
    """
    Allocation endpoint that works in two modes:
    
    1. by=product (default):
       - Expects a query parameter `category` to be provided.
       - For the given product category, it uses the next 7 days forecast for each store
         to allocate the available inventory (from available_inventory) across stores.
       - The optimization is run separately for each day.
       
    2. by=store:
       - Expects a query parameter `store` to be provided.
       - For the given store, it allocates a total inventory (if not provided via `inventory`,
         the sum of available inventory for all categories with forecasts for that store is used)
         among the product categories that the store sells.
       - Again, the optimization is run separately for each day.
    """
    if by not in ["product", "store"]:
        raise HTTPException(status_code=400, detail="Query parameter 'by' must be either 'product' or 'store'.")

    daily_allocations = {}

    if by == "product":
        if not category:
            raise HTTPException(status_code=400, detail="For product allocation, please provide a 'category'.")
        if category not in available_inventory:
            raise HTTPException(status_code=400, detail=f"Available inventory for category {category} not defined.")
        
        # Use the inventory parameter if provided; otherwise, use the default available_inventory
        avail = inventory if inventory is not None else available_inventory[category]
        
        # Gather forecasts for all stores that have forecasts for this category.
        store_forecasts = {
            s: forecast_dict[(s, category)]["next_7_days"]
            for s in stores if (s, category) in forecast_dict
        }
        if not store_forecasts:
            raise HTTPException(status_code=404, detail=f"No forecast available for category {category}.")
        
        # Assume all stores share the same forecast dates.
        common_dates = [entry["ds"] for entry in list(store_forecasts.values())[0]]
        
        # Run allocation optimization for each day separately.
        for i, day in enumerate(common_dates):
            # Build a dictionary of forecast values for this day for each store.
            day_forecasts = {s: forecast_list[i]["yhat"] 
                            for s, forecast_list in store_forecasts.items() if len(forecast_list) > i}
            if not day_forecasts:
                continue

            # Create an optimization model for the day.
            prob = pulp.LpProblem(f"Allocation_product_{category}_{day}", pulp.LpMinimize)
            x = {s: pulp.LpVariable(f"alloc_{s}", lowBound=0, cat='Continuous') for s in day_forecasts}
            d = {s: pulp.LpVariable(f"dev_{s}", lowBound=0, cat='Continuous') for s in day_forecasts}

            # Objective: minimize total deviation
            prob += pulp.lpSum([d[s] for s in day_forecasts])
            # Constraint: total allocated must equal available inventory for the product.
            prob += pulp.lpSum([x[s] for s in day_forecasts]) == avail

            # For each store, keep allocation close to forecast.
            for s in day_forecasts:
                f_val = day_forecasts[s]
                prob += x[s] - f_val <= d[s]
                prob += f_val - x[s] <= d[s]

            prob.solve()
            allocation_day = {s: x[s].varValue for s in day_forecasts}
            daily_allocations[str(day)] = allocation_day

        return JSONResponse(content=daily_allocations)

    elif by == "store":
        if not store:
            raise HTTPException(status_code=400, detail="For store allocation, please provide a 'store'.")
        # Determine the product categories for which this store has forecasts.
        relevant_categories = [cat for cat in categories if (store, cat) in forecast_dict]
        if not relevant_categories:
            raise HTTPException(status_code=404, detail=f"No forecast available for store {store}.")
        
        # For store allocation, if no total inventory is provided, sum the available inventory for these categories.
        if inventory is None:
            avail = sum(available_inventory.get(cat, 0) for cat in relevant_categories)
        else:
            avail = inventory
        
        # Gather forecasts for each category for the given store.
        store_forecasts = {
            cat: forecast_dict[(store, cat)]["next_7_days"]
            for cat in relevant_categories
        }
        # Assume common dates among the different category forecasts.
        common_dates = [entry["ds"] for entry in list(store_forecasts.values())[0]]
        
        # Run allocation optimization for each day separately.
        for i, day in enumerate(common_dates):
            day_forecasts = {cat: forecast_list[i]["yhat"] 
                             for cat, forecast_list in store_forecasts.items() if len(forecast_list) > i}
            if not day_forecasts:
                continue

            prob = pulp.LpProblem(f"Allocation_store_{store}_{day}", pulp.LpMinimize)
            x = {cat: pulp.LpVariable(f"alloc_{cat}", lowBound=0, cat='Continuous') for cat in day_forecasts}
            d = {cat: pulp.LpVariable(f"dev_{cat}", lowBound=0, cat='Continuous') for cat in day_forecasts}

            prob += pulp.lpSum([d[cat] for cat in day_forecasts])
            prob += pulp.lpSum([x[cat] for cat in day_forecasts]) == avail

            for cat in day_forecasts:
                f_val = day_forecasts[cat]
                prob += x[cat] - f_val <= d[cat]
                prob += f_val - x[cat] <= d[cat]

            prob.solve()
            allocation_day = {cat: x[cat].varValue for cat in day_forecasts}
            daily_allocations[str(day)] = allocation_day

        return JSONResponse(content=daily_allocations)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

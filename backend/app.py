import torch
import torch.nn as nn
import joblib
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import io
import base64
from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timedelta
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware

# Load dataset used for training
file_path = "synthetic_data.csv"  # Ensure this is the correct path
df = pd.read_csv(file_path)
df['date'] = pd.to_datetime(df['date'])

# Get the most recent date in the dataset
last_date = df['date'].max()

# Aggregate sales data for store and product forecasting
store_sales = df.groupby(['date', 'store_id'])['quantity'].sum().unstack().fillna(0)
product_sales = df.groupby(['date', 'sku'])['quantity'].sum().unstack().fillna(0)

# Define LSTM Model
class LSTMModel(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2):
        super(LSTMModel, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_size, input_size)
    
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out

# Load scalers
scalers_store = joblib.load("scalers_store.pkl")
scalers_product = joblib.load("scalers_product.pkl")

# Ensure correct input sizes for model
input_size_store = len(store_sales.columns)  # Matches trained model
input_size_product = len(product_sales.columns)  # Matches trained model

# Load trained models
store_model = LSTMModel(input_size=input_size_store)
store_model.load_state_dict(torch.load("store_model.pth"))
store_model.eval()

product_model = LSTMModel(input_size=input_size_product)
product_model.load_state_dict(torch.load("product_model.pth"))
product_model.eval()

# API Setup
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change this to your frontend URL for better security
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allows all headers
)

class ForecastRequest(BaseModel):
    days: int  # Number of days to forecast

# Forecast function
def forecast(model, X, scalers, steps=7):
    predictions = []
    input_seq = X[-1].unsqueeze(0)
    
    for _ in range(steps):
        pred = model(input_seq).detach().numpy()
        predictions.append(pred)
        input_seq = torch.cat([input_seq[:, 1:, :], torch.tensor(pred).unsqueeze(0)], dim=1)
    
    predictions = np.array(predictions).squeeze()
    inv_predictions = np.zeros_like(predictions)
    for i, col in enumerate(scalers.keys()):
        inv_predictions[:, i] = scalers[col].inverse_transform(predictions[:, i].reshape(-1, 1)).flatten()
    
    return inv_predictions

# Prepare data for forecasting
def prepare_data_for_forecasting(data, scalers, sequence_length=7):
    data_scaled = np.zeros_like(data, dtype=np.float32)
    for i, col in enumerate(data.columns):
        data_scaled[:, i] = scalers[col].transform(data[[col]]).flatten()
    X = []
    for i in range(len(data_scaled) - sequence_length + 1):  # +1 to include last sequence
        X.append(data_scaled[i:i+sequence_length])
    return torch.tensor(np.array(X), dtype=torch.float32)

X_store = prepare_data_for_forecasting(store_sales, scalers_store)
X_product = prepare_data_for_forecasting(product_sales, scalers_product)

# Function to get actual historical data (last N days)
class HistoricalRequest(BaseModel):
    forecast_type: str
    days: int

@app.post("/historical")
def get_historical_data(request: HistoricalRequest):

    data = store_sales if request.forecast_type == "product" else product_sales

    # Retrieve last 'days' of historical data
    historical_data = data.iloc[-request.days:].sum(axis=1)

    # Convert to JSON format
    historical_records = [
        {"date": date.strftime("%Y-%m-%d"), "sales": sales}
        for date, sales in historical_data.items()
    ]

    return JSONResponse(content={"historical_data": historical_records})

@app.post("/forecast/store")
def forecast_store(request: ForecastRequest):
    data = store_sales
    historical_data = data.iloc[-30:].sum(axis=1)

    historical_records = [
        {"date": date.strftime("%Y-%m-%d"), "sales": sales}
        for date, sales in historical_data.items()
    ]

    forecast_values = forecast(store_model, X_store, scalers_store, steps=request.days)
    daily_totals = forecast_values.sum(axis=1).tolist()

    last_date = datetime.strptime(historical_records[-1]["date"], "%Y-%m-%d")
    future_records = [
        {"date": (last_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "sales": daily_totals[i]}
        for i in range(request.days)
    ]

    return {"forecast": historical_records + future_records}


@app.post("/forecast/product")
def forecast_product(request: ForecastRequest):
    data = product_sales
    historical_data = data.iloc[-30:].sum(axis=1)

    # Format historical records
    historical_records = [
        {"date": date.strftime("%Y-%m-%d"), "product": product}
        for date, product in historical_data.items()
    ]

    # Generate forecasted values
    forecast_values = forecast(product_model, X_product, scalers_product, steps=request.days)
    daily_totals = forecast_values.sum(axis=1).tolist()

    # Generate future dates for forecasts
    last_date = datetime.strptime(historical_records[-1]["date"], "%Y-%m-%d")
    future_records = [
        {"date": (last_date + timedelta(days=i+1)).strftime("%Y-%m-%d"), "product": daily_totals[i]}
        for i in range(request.days)
    ]

    return {"forecast": historical_records + future_records}


# Helper function to create plot and return as base64 image
def create_forecast_plot(historical_data, forecast_data, title, last_date):
    plt.figure(figsize=(12, 6))
    
    # Create date labels
    hist_dates = [last_date - timedelta(days=len(historical_data)-i) for i in range(len(historical_data))]
    forecast_dates = [last_date + timedelta(days=i+1) for i in range(len(forecast_data))]
    
    # Plot historical data
    plt.plot(hist_dates, historical_data, label='Historical', color='blue')
    
    # Plot forecast data
    plt.plot(forecast_dates, forecast_data, label='Forecast', color='red', linestyle='--')
    
    # Add a vertical line at the last historical date
    plt.axvline(x=last_date, color='green', linestyle='-', label='Forecast Start')
    
    plt.title(title)
    plt.xlabel('Date')
    plt.ylabel('Quantity')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Rotate date labels for better readability
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save plot to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()
    
    # Convert buffer to base64 string
    img_str = base64.b64encode(buf.read()).decode('utf-8')
    return img_str

# Return raw plot image
@app.get("/plot/{forecast_type}/{days}")
def get_forecast_plot(forecast_type: str, days: int):
    if forecast_type not in ["store", "product"]:
        return JSONResponse(status_code=400, content={"error": "Invalid forecast type. Use 'store' or 'product'."})
    
    # Get historical data (last 30 days)
    if forecast_type == "store":
        historical_data = get_historical_data(store_sales, days=30)
        forecast_values = forecast(store_model, X_store, scalers_store, steps=days)
    else:  # product
        historical_data = get_historical_data(product_sales, days=30)
        forecast_values = forecast(product_model, X_product, scalers_product, steps=days)
    
    # Sum across all stores/products for each day
    forecast_totals = forecast_values.sum(axis=1)
    
    # Create plot and save to buffer
    plt.figure(figsize=(12, 6))
    
    # Create date labels
    hist_dates = [last_date - timedelta(days=len(historical_data)-i) for i in range(len(historical_data))]
    forecast_dates = [last_date + timedelta(days=i+1) for i in range(len(forecast_totals))]
    
    # Plot historical data
    plt.plot(hist_dates, historical_data, label='Historical', color='blue')
    
    # Plot forecast data
    plt.plot(forecast_dates, forecast_totals, label='Forecast', color='red', linestyle='--')
    
    # Add a vertical line at the last historical date
    plt.axvline(x=last_date, color='green', linestyle='-', label='Forecast Start')
    
    plt.title(f"{forecast_type.capitalize()}-Level Forecast (Next {days} Days)")
    plt.xlabel('Date')
    plt.ylabel('Quantity')
    plt.legend()
    plt.grid(True, linestyle='--', alpha=0.7)
    
    # Rotate date labels for better readability
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Save plot to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()
    
    # Return the image
    return Response(content=buf.getvalue(), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
# RetailCast

This project provides a FastAPI-based web service that forecasts product demand and optimally allocates inventory using historical sales data. It leverages time series forecasting with Prophet and optimization with PuLP, along with data handling via pandas and visualization using Matplotlib.

## Features

- **Demand Forecasting:**  
  Precomputes 7-day past and future forecasts for each store and product category using Prophet.

- **Historical Data Retrieval:**  
  Provides historical sales data grouped by store or product category for a specified number of days.

- **Inventory Allocation Optimization:**  
  Allocates available inventory to stores (or product categories) based on forecasted demand, ensuring a minimal deviation between allocation and forecast.

- **CORS Support:**  
  Configured to allow requests from any origin for ease of integration with frontend applications.

## Prerequisites

You can install the required packages using pip:

```bash
pip install -r requirements.txt
```

## Installation & Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/hydrxd/RetailCast.git
   cd RetailCast
   ```

2. **Place your Data File:**

   Ensure you have a `synthetic_data.csv` file in the project directory. This CSV should contain at least the following columns:
   - `date` (date string)
   - `store_id`
   - `category`
   - `quantity`

3. **Run the Application:**

   Start the API using Uvicorn:

   ```bash
   uvicorn main:app --reload
   ```

   The service will be available at `http://localhost:8000`.

## API Endpoints

### 1. Forecasting Endpoints

- **Forecast by Store:**

  Retrieve forecasts for each product category for a specific store.

  **Endpoint:**  
  `GET /forecast/store/{store_id}`

- **Forecast by Product:**

  Retrieve forecasts for a specific product category across all stores.

  **Endpoint:**  
  `GET /forecast/product/{product_category}`

### 2. Historical Data Endpoint

Retrieve historical sales data with optional filtering by store or product category.

**Endpoint:**  
`GET /historical/{forecast_type}/{days}?name=<store_or_product_name>`

- `forecast_type`: Either `store` or `product`
- `days`: Number of past days to include
- `name` (optional): Specific store or product category to filter by

### 3. Inventory Allocation Endpoint

Allocate inventory based on forecasted demand in two modes:

- **By Product:**

  Allocates available inventory for a specified product category across stores for the next 7 days.

  **Endpoint:**  
  `GET /allocation?by=product&category=<category>&inventory=<optional_inventory_amount>`

- **By Store:**

  Allocates a given inventory among product categories for a specific store for the next 7 days.

  **Endpoint:**  
  `GET /allocation?by=store&store=<store_id>&inventory=<optional_inventory_amount>`

## Code Structure

- **main.py:**  
  Contains the FastAPI application with endpoints for forecasting, historical data retrieval, and inventory allocation.

- **synthetic_data.csv:**  
  Example data file used for demonstration purposes. Ensure your CSV file is in the correct format.

## Customization

- **Data Source:**  
  Replace `synthetic_data.csv` with your actual sales data CSV file.

- **Inventory Settings:**  
  The `available_inventory` dictionary in the code can be modified to reflect actual inventory levels for your product categories.

- **Forecasting Parameters:**  
  Adjust Prophet model settings or historical/future period definitions as needed.

## Acknowledgements

- [FastAPI](https://fastapi.tiangolo.com/) for the web framework.
- [Prophet](https://facebook.github.io/prophet/) for the forecasting model.
- [PuLP](https://coin-or.github.io/pulp/) for the optimization framework.
```

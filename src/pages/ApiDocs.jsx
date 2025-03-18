import React from "react";

const ApiSection = ({ title, url, method, description, requestBody, response }) => (
    <div className="bg-gray-100 p-5 rounded-lg mt-6 border border-gray-300">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p><strong className="text-gray-700">📌 URL:</strong> <code className="text-blue-600">{url}</code></p>
        <p><strong className="text-gray-700">🛠 Method:</strong> {method}</p>
        <p><strong className="text-gray-700">ℹ️ Description:</strong> {description}</p>

        {requestBody && (
            <>
                <p className="mt-2"><strong className="text-gray-700">📤 Request Body:</strong></p>
                <pre className="bg-gray-200 p-3 rounded text-sm overflow-auto">{requestBody}</pre>
            </>
        )}

        {response && (
            <>
                <p className="mt-2"><strong className="text-gray-700">📥 Response:</strong></p>
                <pre className="bg-gray-200 p-3 rounded text-sm overflow-auto">{response}</pre>
            </>
        )}
    </div>
);

const ApiDocs = () => {
    return (
        <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">📜 API Documentation</h2>
            <p className="text-gray-600 mb-4">This page provides details about the available API endpoints.</p>

            {/* API Endpoints */}
            <ApiSection
                title="Historical Data"
                url="/historical"
                method="POST"
                description="Retrieves historical sales or product data for a specified number of days."
                requestBody={`{
  "forecast_type": "product", // or "store"
  "days": 30
}`}
                response={`{
  "historical_data": [
    { "date": "2024-02-01", "sales": 1200 },
    { "date": "2024-02-02", "sales": 1350 }
  ]
}`}
            />

            <ApiSection
                title="Store Sales Forecast"
                url="/forecast/store"
                method="POST"
                description="Generates future sales forecasts for stores based on historical data."
                requestBody={`{
  "days": 30
}`}
                response={`{
  "forecast": [
    { "date": "2024-02-01", "sales": 1200 },
    { "date": "2024-02-02", "sales": 1350 },
    { "date": "2024-03-01", "sales": 1400 }
  ]
}`}
            />

            <ApiSection
                title="Product Sales Forecast"
                url="/forecast/product"
                method="POST"
                description="Generates future sales forecasts for products based on historical data."
                requestBody={`{
  "days": 30
}`}
                response={`{
  "forecast": [
    { "date": "2024-02-01", "product": 1200 },
    { "date": "2024-02-02", "product": 1350 },
    { "date": "2024-03-01", "product": 1400 }
  ]
}`}
            />

            <ApiSection
                title="Forecast Plot"
                url="/plot/{forecast_type}/{days}"
                method="GET"
                description="Generates a plot of historical and forecasted sales data."
                requestBody={`forecast_type: "store" or "product"
days: Number of future days to forecast`}
                response="Returns a PNG image of the forecast plot."
            />
        </div>
    );
};

export default ApiDocs;

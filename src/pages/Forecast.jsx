import React, { useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function Forecast() {
    const [days, setDays] = useState(7);
    const [forecast, setForecast] = useState(null);
    const [forecastType, setForecastType] = useState("store");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(
                `http://localhost:8000/forecast/${forecastType}`,
                { days }
            );
            setForecast(response.data.forecast);
        } catch (error) {
            console.error("Error fetching forecast:", error);
            setError("Failed to fetch forecast. Please try again.");
        }
        setLoading(false);
    };

    // Process data for Recharts
    const chartData = forecast
        ? forecast.map((entry, index) => ({
            date: entry.date,
            value: entry.sales ?? entry.product,
            type: index < 30 ? "Historical" : "Forecast",
        }))
        : [];

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">📈 Sales Forecast</h1>

            {/* Forecast Controls */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="border p-3 rounded-lg shadow-sm w-full md:w-auto"
                    placeholder="Days to forecast"
                    min="1"
                />
                <select
                    value={forecastType}
                    onChange={(e) => setForecastType(e.target.value)}
                    className="border p-3 rounded-lg shadow-sm w-full md:w-auto"
                >
                    <option value="store">Store</option>
                    <option value="product">Product</option>
                </select>
                <button
                    onClick={fetchForecast}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg shadow-md transition-all disabled:bg-gray-400"
                >
                    {loading ? "Loading..." : "Get Forecast"}
                </button>
            </div>

            {/* Error Message */}
            {error && <p className="text-red-600 font-semibold">{error}</p>}

            {/* Forecast List */}
            {forecast && (
                <div className="p-6 mt-6 bg-white shadow-lg rounded-xl border">
                    <h2 className="text-lg font-semibold mb-3">📅 Forecast Results</h2>
                    <ul className="list-disc ml-5 text-gray-700 space-y-2">
                        {forecast.slice(30).map((entry, index) => (
                            <li key={index}>
                                <span className="font-semibold">{entry.date}</span>:{" "}
                                {entry.sales ?? entry.product} (Forecast)
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Recharts Line Chart */}
            {forecast && (
                <div className="mt-8 p-6 bg-white shadow-lg rounded-xl border">
                    <h2 className="text-lg font-semibold mb-3">📊 Forecast Chart</h2>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" angle={-45} textAnchor="end" height={60} />
                            <YAxis
                                label={{
                                    value: "Sales",
                                    angle: -90,
                                    position: "insideLeft",
                                }}
                            />
                            <Tooltip />
                            <Legend />
                            {/* Historical Data - Gray */}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6b7280"
                                strokeWidth={2}
                                dot={{ r: 2 }}
                                name="Historical Data"
                            />
                            {/* Forecast Data - Blue */}
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 3 }}
                                name="Forecast Data"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

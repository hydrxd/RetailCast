import React, { useState } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

export default function ProductForecast() {
    const [forecast, setForecast] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("TECH");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Colors for each category title
    const categoryColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

    const fetchForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(
                `http://localhost:8000/forecast/product/${selectedCategory}`
            );
            setForecast(response.data);
        } catch (error) {
            console.error("Error fetching forecast:", error);
            setError("Failed to fetch forecast. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">📈 Sales Forecast by Store</h1>

            {/* Forecast Controls */}
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="border p-3 rounded-lg shadow-sm w-full md:w-auto"
                >
                    <option value="TECH">TECH</option>
                    <option value="KIDS">KIDS</option>
                    <option value="HOME">HOME</option>
                    <option value="BOOK">BOOK</option>
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

            {/* Forecast Results Display */}
            {forecast && (
                <div className="p-6 mt-6 bg-white shadow-lg rounded-xl border">
                    <h2 className="text-lg font-semibold mb-3">📅 Forecast Results</h2>
                    {Object.keys(forecast).map((cat, index) => {
                        // Combine past and forecast data into one array.
                        // Use Math.floor to round down each value.
                        const pastData = forecast[cat].past_7_days.map((entry) => ({
                            ds: entry.ds,
                            past: Math.floor(entry.yhat),
                        }));
                        const forecastData = forecast[cat].next_7_days.map((entry) => ({
                            ds: entry.ds,
                            forecast: Math.floor(entry.yhat),
                        }));
                        // Merge the two arrays (they are sequential by date)
                        const combinedData = [...pastData, ...forecastData];

                        return (
                            <div key={cat} className="mb-8">
                                <h3
                                    className="font-semibold text-xl mb-4"
                                    style={{ color: categoryColors[index % categoryColors.length] }}
                                >
                                    {cat}
                                </h3>

                                {/* Two-column layout for list display */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                    {/* Past 7 Days List */}
                                    <div>
                                        <h4 className="font-semibold text-lg mb-2">Past 7 Days</h4>
                                        <ul className="list-disc ml-6 text-gray-700">
                                            {forecast[cat].past_7_days.map((entry) => (
                                                <li key={entry.ds} className="mb-1">
                                                    {new Date(entry.ds).toLocaleDateString()}:{" "}
                                                    <strong>{Math.floor(entry.yhat)}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {/* Next 7 Days List */}
                                    <div>
                                        <h4 className="font-semibold text-lg mb-2">Next 7 Days</h4>
                                        <ul className="list-disc ml-6 text-gray-700">
                                            {forecast[cat].next_7_days.map((entry) => (
                                                <li key={entry.ds} className="mb-1">
                                                    {new Date(entry.ds).toLocaleDateString()}:{" "}
                                                    <strong>{Math.floor(entry.yhat)}</strong>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Recharts Graph Display */}
                                <div className="w-full" style={{ height: 300 }}>
                                    <ResponsiveContainer>
                                        <LineChart data={combinedData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="ds"
                                                tickFormatter={(date) =>
                                                    new Date(date).toLocaleDateString()
                                                }
                                            />
                                            <YAxis />
                                            <Tooltip
                                                labelFormatter={(date) =>
                                                    new Date(date).toLocaleDateString()
                                                }
                                            />
                                            <Legend />
                                            {/* Past 7 Days Line */}
                                            <Line
                                                type="monotone"
                                                dataKey="past"
                                                stroke="#8884d8"
                                                name="Past 7 Days"
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                            {/* Forecast (Next 7 Days) Line */}
                                            <Line
                                                type="monotone"
                                                dataKey="forecast"
                                                stroke="#82ca9d"
                                                name="Next 7 Days"
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

import React, { useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

const HistoricalData = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [forecastType, setForecastType] = useState("sales");
    const [days, setDays] = useState(30);
    const [error, setError] = useState(null);

    const fetchHistoricalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post("http://localhost:8000/historical", {
                forecast_type: forecastType,
                days: Number(days),
            });

            if (response.data.historical_data && Array.isArray(response.data.historical_data)) {
                const formattedData = response.data.historical_data.map(entry => ({
                    date: new Date(entry.date).toISOString().split("T")[0],
                    sales: Number(entry.sales),
                }));
                setData(formattedData);
            } else {
                setError("Invalid response from server.");
                setData([]);
            }
        } catch (error) {
            console.error("Error fetching historical data:", error);
            setError("Failed to load data. Please try again.");
            setData([]);
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">📊 Historic Data</h2>

            {/* User Inputs */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
                <label className="text-gray-600">Data Type:</label>
                <select
                    value={forecastType}
                    onChange={(e) => setForecastType(e.target.value)}
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300"
                >
                    <option value="sales">Sales</option>
                    <option value="product">Product</option>
                </select>

                <label className="text-gray-600">Days:</label>
                <input
                    type="number"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, Number(e.target.value)))}
                    className="border border-gray-300 p-2 rounded-lg w-20 focus:ring focus:ring-blue-300"
                    min="1"
                    max="365"
                />

                <button
                    onClick={fetchHistoricalData}
                    className={`px-4 py-2 rounded-lg text-white font-medium transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                        }`}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "Load Data"}
                </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}
            {loading && <p className="text-gray-600 mt-2">Fetching data...</p>}

            {data.length > 0 && (
                <div className="mt-6">
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default HistoricalData;

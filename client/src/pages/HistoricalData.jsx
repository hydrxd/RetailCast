import React, { useState } from "react";
import axios from "axios";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const HistoricalData = () => {
    const [data, setData] = useState([]);
    const [seriesKeys, setSeriesKeys] = useState([]);
    const [loading, setLoading] = useState(false);
    const [forecastType, setForecastType] = useState("store");
    const [days, setDays] = useState(30);
    const [name, setName] = useState(""); // store name or product category
    const [error, setError] = useState(null);

    const fetchHistoricalData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Build the GET URL with query parameter if name is provided.
            let url = `http://localhost:8000/historical/${forecastType}/${days}`;
            if (name) {
                url += `?name=${encodeURIComponent(name)}`;
            }
            const response = await axios.get(url);

            // Response data is an array of records.
            // For example, for a store view with a selected store, each record might be:
            // { date: "2024-01-27", category: "TECH", quantity: 52 }
            //
            // We'll pivot this data so that each date becomes an object with keys for each category (or store)
            // and values equal to the aggregated quantity.
            //
            // Determine the grouping key based on forecastType:
            let groupKey = "";
            if (forecastType === "store") {
                // For store view: if a store name is provided, group by category.
                // Otherwise, group by store_id.
                groupKey = name ? "category" : "store_id";
            } else if (forecastType === "product") {
                // For product view: if a product category is provided, group by store_id.
                // Otherwise, group by category.
                groupKey = name ? "store_id" : "category";
            }

            // Pivot the data:
            const pivot = {};
            const keysSet = new Set();
            response.data.forEach((record) => {
                const date = record.date;
                const key = record[groupKey];
                keysSet.add(key);
                if (!pivot[date]) {
                    pivot[date] = { date };
                }
                // Set the quantity value for this group key on this date.
                pivot[date][key] = record.quantity;
            });
            // Sort the pivoted data by date.
            const pivotData = Object.values(pivot).sort(
                (a, b) => new Date(a.date) - new Date(b.date)
            );
            setData(pivotData);
            setSeriesKeys(Array.from(keysSet));
        } catch (err) {
            console.error("Error fetching historical data:", err);
            setError("Failed to load data. Please try again.");
            setData([]);
            setSeriesKeys([]);
        }
        setLoading(false);
    };

    return (
        <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
                📊 Historic Data
            </h2>

            {/* User Inputs */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
                <label className="text-gray-600">Data Type:</label>
                <select
                    value={forecastType}
                    onChange={(e) => setForecastType(e.target.value)}
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300"
                >
                    <option value="store">Store</option>
                    <option value="product">Product</option>
                </select>

                <label className="text-gray-600">
                    {forecastType === "store" ? "Store Name:" : "Product Category:"}
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300"
                    placeholder={forecastType === "store" ? "e.g. Store 1" : "e.g. TECH"}
                />

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
                    className={`px-4 py-2 rounded-lg text-white font-medium transition ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
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
                        <LineChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                angle={-30}
                                textAnchor="end"
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            {seriesKeys.map((key, index) => (
                                <Line
                                    key={key}
                                    type="monotone"
                                    dataKey={key}
                                    stroke={
                                        ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][
                                        index % 5
                                        ]
                                    }
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default HistoricalData;

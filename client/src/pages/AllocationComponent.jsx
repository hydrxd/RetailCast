import React, { useState } from "react";
import axios from "axios";

const AllocationComponent = () => {
    const [allocationData, setAllocationData] = useState({});
    const [by, setBy] = useState("store");
    const [identifier, setIdentifier] = useState(""); // store name or product category
    const [inventory, setInventory] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fetchAllocation = async () => {
        setLoading(true);
        setError("");
        try {
            // Build the GET URL with query parameters.
            let url = `http://localhost:8000/allocation?by=${by}`;
            if (by === "store") {
                url += `&store=${encodeURIComponent(identifier)}`;
            } else if (by === "product") {
                url += `&category=${encodeURIComponent(identifier)}`;
            }
            if (inventory) {
                url += `&inventory=${inventory}`;
            }
            const response = await axios.get(url);
            setAllocationData(response.data);
        } catch (err) {
            console.error(err);
            setError("Error fetching allocation data.");
            setAllocationData({});
        }
        setLoading(false);
    };

    // Render a table: rows = dates, columns = allocation categories (e.g., TECH, BOOK, etc.)
    const renderTable = () => {
        const dates = Object.keys(allocationData);
        if (dates.length === 0) {
            return <p>No allocation data available.</p>;
        }

        // Gather unique category names from the allocations.
        const categoriesSet = new Set();
        dates.forEach((date) => {
            const alloc = allocationData[date];
            Object.keys(alloc).forEach((cat) => categoriesSet.add(cat));
        });
        const categories = Array.from(categoriesSet);

        return (
            <table className="min-w-full border-collapse">
                <thead>
                    <tr>
                        <th className="border p-2">Date</th>
                        {categories.map((cat) => (
                            <th key={cat} className="border p-2">
                                {cat}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dates.map((date) => {
                        // Remove time by taking only the first 10 characters.
                        const formattedDate = date.split(" ")[0];
                        return (
                            <tr key={date}>
                                <td className="border p-2">{formattedDate}</td>
                                {categories.map((cat) => (
                                    <td key={cat} className="border p-2">
                                        {allocationData[date][cat] !== undefined
                                            ? Math.floor(Number(allocationData[date][cat]))
                                            : "-"}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className="bg-white p-6 shadow-lg rounded-2xl border border-gray-200">
            <h2 className="text-2xl font-semibold mb-4">Allocation Results</h2>

            {/* Allocation Controls */}
            <div className="mb-4 flex flex-wrap items-center gap-4">
                <label className="text-gray-600">Allocation By:</label>
                <select
                    value={by}
                    onChange={(e) => {
                        setBy(e.target.value);
                        setIdentifier("");
                    }}
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300"
                >
                    <option value="store">Store</option>
                    <option value="product">Product</option>
                </select>

                <label className="text-gray-600">
                    {by === "store" ? "Store Name:" : "Product Category:"}
                </label>
                <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={by === "store" ? "e.g. Store 1" : "e.g. TECH"}
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300"
                />

                <label className="text-gray-600">Inventory:</label>
                <input
                    type="number"
                    value={inventory}
                    onChange={(e) => setInventory(e.target.value)}
                    placeholder="Enter inventory"
                    className="border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 w-28"
                />

                <button
                    onClick={fetchAllocation}
                    disabled={loading}
                    className={`px-4 py-2 rounded-lg text-white font-medium transition ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600"
                        }`}
                >
                    {loading ? "Loading..." : "Get Allocation"}
                </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}

            <div className="mt-6">{renderTable()}</div>
        </div>
    );
};

export default AllocationComponent;

import { Link } from "react-router-dom";
import { useState } from "react";

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 text-white rounded-md"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? "✖" : "☰"} {/* Unicode icons for simplicity */}
            </button>

            {/* Sidebar */}
            <div
                className={`fixed top-0 left-0 h-full w-64 bg-gray-900 text-white p-5 transition-transform duration-300 ${isOpen ? "translate-x-0" : "-translate-x-64"
                    } lg:translate-x-0`}
            >
                <h2 className="text-xl font-bold mb-6">📈 Sales Forecast</h2>

                <ul className="space-y-4">
                    {[
                        { name: "Dashboard", path: "/" },
                        { name: "Store Forecast", path: "/store-forecast" },
                        { name: "Product Forecast", path: "/product-forecast" },
                        { name: "Allocation", path: "/allocation" },
                        { name: "Historical Data", path: "/historical" },
                        { name: "API Docs", path: "/api-docs" },
                    ].map((item, index) => (
                        <li key={index}>
                            <Link
                                to={item.path}
                                className="block p-2 rounded-md hover:bg-gray-800 transition"
                                onClick={() => setIsOpen(false)} // Close on mobile click
                            >
                                {item.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default Sidebar;

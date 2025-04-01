import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import StoreForecast from "./pages/StoreForecast";
import ProductForecast from "./pages/ProductForecast";
import HistoricalData from "./pages/HistoricalData";
import AllocationComponent from "./pages/AllocationComponent";
import ApiDocs from "./pages/ApiDocs";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100 text-gray-900">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 p-6 ml-64">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/store-forecast" element={<StoreForecast />} />
            <Route path="/product-forecast" element={<ProductForecast />} />
            <Route path="/allocation" element={<AllocationComponent />} />
            <Route path="/historical" element={<HistoricalData />} />
            <Route path="/api-docs" element={<ApiDocs />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

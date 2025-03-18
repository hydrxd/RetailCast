const Dashboard = () => {
    return (
        <div className="p-6">
            {/* Page Title */}
            <h2 className="text-3xl font-bold mb-6">📊 Dashboard</h2>

            {/* Overview Section */}
            <p className="mb-6 text-gray-700">
                Welcome to the Sales Forecast Dashboard. Get insights and quick access to key features.
            </p>

            {/* Stats / Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                    { title: "Recent Forecast", desc: "Check the latest sales forecast for upcoming days.", color: "bg-blue-500" },
                    { title: "Sales Trends", desc: "Analyze historical sales data and trends.", color: "bg-green-500" },
                    { title: "Quick Links", desc: "Navigate easily to forecasts, historical data, and API docs.", color: "bg-yellow-500" },
                ].map((item, index) => (
                    <div key={index} className={`${item.color} text-white p-6 rounded-xl shadow-md`}>
                        <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                        <p className="text-sm">{item.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;

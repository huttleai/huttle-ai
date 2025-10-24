import MainLayout from "../layouts/MainLayout";

export default function Dashboard() {
  return (
    <MainLayout>
      <h1 className="text-4xl font-bold text-blue-400 mb-6">
        Dashboard Overview
      </h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">AI Insights</div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">Analytics</div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">Upcoming Tasks</div>
      </div>
    </MainLayout>
  );
}

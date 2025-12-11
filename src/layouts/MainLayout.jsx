export default function MainLayout({ children }) {
    return (
      <div className="flex min-h-screen bg-gray-950 text-white">
        <aside className="w-64 bg-gray-900 p-6">
          <h2 className="text-xl font-bold mb-4">Huttle AI</h2>
          <nav className="space-y-3">
            <a href="#" className="block hover:text-huttle-primary">Dashboard</a>
            <a href="#" className="block hover:text-huttle-primary">AI Tools</a>
            <a href="#" className="block hover:text-huttle-primary">Settings</a>
          </nav>
        </aside>
        <main className="flex-1 p-10">{children}</main>
      </div>
    );
  }
  
  
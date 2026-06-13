export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-blue-700 mb-8">
        Ortho Reminder Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Today's Appointments</h2>
          <p className="text-3xl font-bold">6</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Upcoming Appointments</h2>
          <p className="text-3xl font-bold">24</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-gray-500">Patients</h2>
          <p className="text-3xl font-bold">132</p>
        </div>
      </div>

      <button className="bg-blue-600 text-white px-6 py-3 rounded-lg mb-8">
        Add Patient
      </button>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Today's Schedule</h2>

        <div className="space-y-3">
          <div className="border p-4 rounded">
            10:00 AM - Ahmed Ali
          </div>

          <div className="border p-4 rounded">
            11:00 AM - Sara Mohammed
          </div>

          <div className="border p-4 rounded">
            12:30 PM - Ali Hassan
          </div>
        </div>
      </div>
    </main>
  );
}
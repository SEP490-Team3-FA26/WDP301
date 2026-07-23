export function Profile() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full bg-blue-100 border-4 border-white shadow-md overflow-hidden">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Alex Alexander</h2>
              <p className="text-slate-500">Product Designer at Lumina</p>
              <div className="mt-3 flex gap-3">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                  Change Photo
                </button>
                <button className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">First Name</label>
                <input 
                  type="text" 
                  defaultValue="Alex"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Last Name</label>
                <input 
                  type="text" 
                  defaultValue="Alexander"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Email Address</label>
              <input 
                type="email" 
                defaultValue="alex@lumina.design"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Bio</label>
              <textarea 
                rows={4}
                defaultValue="Passionate designer creating user-centric digital experiences."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" 
              />
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="button"
                className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

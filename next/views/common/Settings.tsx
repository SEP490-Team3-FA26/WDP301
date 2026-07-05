import { Bell, Lock, Globe, Shield } from "lucide-react";

export function Settings() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
        
        {/* Notifications */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900">Notifications</h2>
              <p className="text-sm text-slate-500">Choose what updates you want to receive.</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6 ml-11">
            <ToggleOption 
              title="Email Notifications" 
              description="Receive daily summary emails." 
              defaultChecked={true} 
            />
            <ToggleOption 
              title="Push Notifications" 
              description="Receive push notifications in browser." 
              defaultChecked={false} 
            />
          </div>
        </div>

        {/* Security */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900">Security</h2>
              <p className="text-sm text-slate-500">Manage security aspects of your account.</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6 ml-11">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Two-Factor Authentication</h3>
                <p className="text-xs text-slate-500 mt-1">Add an extra layer of security to your account.</p>
              </div>
              <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Enable
              </button>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-sm font-medium text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-1">Update your password regularly to keep your account secure.</p>
              </div>
              <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Update
              </button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-lg font-medium text-slate-900">Preferences</h2>
              <p className="text-sm text-slate-500">Customize your workspace experience.</p>
            </div>
          </div>
          
          <div className="mt-6 ml-11 space-y-4">
            <div className="space-y-2 max-w-xs">
              <label className="text-sm font-medium text-slate-700">Language</label>
              <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all">
                <option>English (US)</option>
                <option>French</option>
                <option>Spanish</option>
              </select>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function ToggleOption({ title, description, defaultChecked }: { title: string, description: string, defaultChecked: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  );
}

import React from 'react';
import { useAuth } from '../lib/auth';
import { User, Wallet, Mail, Calendar } from 'lucide-react';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Profile</h1>
            <p className="text-white/60">Manage your account information</p>
          </div>
        </div>

        {user ? (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <User className="h-5 w-5 text-cyan-400" />
                <div>
                  <label className="text-sm text-white/60">Name</label>
                  <p className="text-white font-medium">{user.name}</p>
                </div>
              </div>

              {user.email && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <Mail className="h-5 w-5 text-cyan-400" />
                  <div>
                    <label className="text-sm text-white/60">Email</label>
                    <p className="text-white font-medium">{user.email}</p>
                  </div>
                </div>
              )}

              {user.walletAddress && (
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                  <Wallet className="h-5 w-5 text-cyan-400" />
                  <div>
                    <label className="text-sm text-white/60">Wallet Address</label>
                    <p className="text-white font-medium font-mono">
                      {user.walletAddress}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <Calendar className="h-5 w-5 text-cyan-400" />
                <div>
                  <label className="text-sm text-white/60">Member Since</label>
                  <p className="text-white font-medium">
                    {new Date().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-white/60">Please log in to view your profile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
import React from 'react';
import { FileText, Plus, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Contracts = () => {
  const contracts = [
    { id: 1, name: "AI Service Agreement", status: "Active", date: "2024-01-15" },
    { id: 2, name: "Data Processing Contract", status: "Pending", date: "2024-01-20" },
    { id: 3, name: "API Usage Terms", status: "Completed", date: "2024-01-10" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400 bg-green-400/20';
      case 'Pending': return 'text-yellow-400 bg-yellow-400/20';
      case 'Completed': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-white/60 bg-white/10';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Contracts</h1>
              <p className="text-white/60">Manage your smart contracts and agreements</p>
            </div>
          </div>
          <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0">
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </div>

        <div className="space-y-4">
          {contracts.map((contract) => (
            <div key={contract.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h3 className="text-white font-medium">{contract.name}</h3>
                    <p className="text-sm text-white/60">Created: {contract.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Contracts;
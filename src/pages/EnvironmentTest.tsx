import React, { useState, useEffect } from 'react';
import { debugEnvironmentVariables } from '../lib/environment-debug';
import { getEnvironmentInfo, getEnvironmentConfig } from '../lib/environment';

const EnvironmentTest: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<any>(null);
  const [debugResult, setDebugResult] = useState<any>(null);

  useEffect(() => {
    // Get environment information
    const info = getEnvironmentInfo();
    setEnvInfo(info);
    
    // Run debug
    const result = debugEnvironmentVariables();
    setDebugResult(result);
  }, []);

  const runDebug = () => {
    const result = debugEnvironmentVariables();
    setDebugResult(result);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Environment Variables Test</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Environment Information */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">📋 Environment Information</h2>
            {envInfo && (
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(envInfo, null, 2)}
              </pre>
            )}
          </div>

          {/* Environment Configuration */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">⚙️ Environment Configuration</h2>
            <div className="space-y-2">
              <div>
                <strong>Canister ID (AIO_BASE_BACKEND):</strong>
                <span className="ml-2 text-cyan-400">
                  {getEnvironmentConfig('AIO_BASE_BACKEND').canisterId}
                </span>
              </div>
              <div>
                <strong>Host:</strong>
                <span className="ml-2 text-cyan-400">
                  {getEnvironmentConfig('AIO_BASE_BACKEND').host}
                </span>
              </div>
              <div>
                <strong>Network:</strong>
                <span className="ml-2 text-cyan-400">
                  {getEnvironmentConfig('AIO_BASE_BACKEND').network}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Debug Results */}
        <div className="mt-6 bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">🔍 Debug Results</h2>
            <button
              onClick={runDebug}
              className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded text-sm"
            >
              Run Debug Again
            </button>
          </div>
          
          {debugResult && (
            <div className="space-y-4">
              <div>
                <strong>Summary:</strong>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>✅ Has Canister IDs: {debugResult.summary.hasCanisterIds ? 'Yes' : 'No'}</div>
                  <div>✅ Has Network Config: {debugResult.summary.hasNetworkConfig ? 'Yes' : 'No'}</div>
                  <div>📊 Total Variables: {debugResult.summary.totalVariables}</div>
                  <div>🏗️ Canister Variables: {debugResult.summary.canisterVariables}</div>
                  <div>⚙️ DFX Variables: {debugResult.summary.dfxVariables}</div>
                </div>
              </div>
              
              <div>
                <strong>Canister IDs:</strong>
                <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto mt-2">
                  {JSON.stringify(debugResult.canisterIds, null, 2)}
                </pre>
              </div>
              
              <div>
                <strong>Network Configuration:</strong>
                <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto mt-2">
                  {JSON.stringify(debugResult.networkConfig, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">📖 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open your browser's Developer Tools (F12)</li>
            <li>Go to the Console tab</li>
            <li>Look for the debug output starting with "🔍 === Environment Variables Debug ==="</li>
            <li>Check if environment variables are loaded correctly</li>
            <li>If variables are missing, check the .env file and vite.config.js configuration</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentTest;

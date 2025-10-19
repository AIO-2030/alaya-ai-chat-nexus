// Device API Service - Handle backend communication for device management
import { Actor, HttpAgent, ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { 
  _SERVICE,
  DeviceInfo,
  DeviceType,
  DeviceStatus,
  DeviceCapability,
  DeviceFilter,
  DeviceListResponse as BackendDeviceListResponse
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Import environment configuration from shared module
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Canister configuration using shared environment module
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

// Log environment configuration for this module
logEnvironmentConfig('AIO_BASE_BACKEND');

// Initialize agent with proper configuration
const agent = new HttpAgent({ 
  host: HOST,
  // Add identity if available (for authenticated calls)
  // identity: await getIdentity()
});

// Configure agent for local development
if (isLocalNet()) {
  agent.fetchRootKey().catch(console.error);
}

// Actor singleton for re-use
let actor: ActorSubclass<_SERVICE> | null = null;

// Get or create actor instance
const getActor = (): ActorSubclass<_SERVICE> => {
  if (!actor) {
    console.log('[DeviceApi] Creating new actor instance for canister:', CANISTER_ID);
    actor = Actor.createActor(idlFactory, { 
      agent, 
      canisterId: CANISTER_ID 
    });
  }
  return actor;
};

// Type definitions for frontend compatibility
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  deviceType: DeviceType;
  owner: string;
  status: DeviceStatus;
  capabilities: DeviceCapability[];
  metadata: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  lastSeen: number;
  deleted: boolean;
}

export interface DeviceConnectionRequest {
  deviceId: string;
  wifiNetwork: string;
  password?: string;
}

export interface DeviceStatusUpdate {
  deviceId: string;
  status: DeviceStatus;
  lastSeen?: number;
}

export interface DeviceListResponse {
  devices: DeviceRecord[];
  total: number;
  offset: number;
  limit: number;
}

class DeviceApiService {
  // Helper method to convert DeviceInfo to DeviceRecord
  private convertDeviceInfoToRecord(deviceInfo: DeviceInfo): DeviceRecord {
    return {
      id: deviceInfo.id,
      name: deviceInfo.name,
      deviceType: deviceInfo.device_type,
      owner: deviceInfo.owner.toString(),
      status: deviceInfo.status,
      capabilities: deviceInfo.capabilities,
      metadata: Object.fromEntries(deviceInfo.metadata),
      createdAt: Number(deviceInfo.created_at),
      updatedAt: Number(deviceInfo.updated_at),
      lastSeen: Number(deviceInfo.last_seen),
      deleted: deviceInfo.deleted,
    };
  }

  // Helper method to convert DeviceRecord to DeviceInfo
  private convertRecordToDeviceInfo(record: DeviceRecord): DeviceInfo {
    try {
      // Validate principal ID format
      if (!record.owner || typeof record.owner !== 'string') {
        throw new Error(`Invalid principal ID: ${record.owner} (must be a non-empty string)`);
      }
      
      // Convert string principal ID to Principal object
      const principal = Principal.fromText(record.owner);
      
      // Verify the principal is valid by converting back to text
      const principalText = principal.toText();
      if (principalText !== record.owner) {
        throw new Error(`Principal conversion mismatch: ${record.owner} -> ${principalText}`);
      }
      
      console.log('[DeviceApi] Successfully converted principal:', principalText);
      
      return {
        id: record.id,
        name: record.name,
        device_type: record.deviceType,
        owner: principal,
        status: record.status,
        capabilities: record.capabilities,
        metadata: Object.entries(record.metadata),
        created_at: BigInt(record.createdAt),
        updated_at: BigInt(record.updatedAt),
        last_seen: BigInt(record.lastSeen),
        deleted: record.deleted,
      };
    } catch (error) {
      console.error('[DeviceApi] Error converting principal:', error);
      console.error('[DeviceApi] Record owner field:', record.owner);
      console.error('[DeviceApi] Record owner type:', typeof record.owner);
      throw new Error(`Invalid principal ID: ${record.owner} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to handle canister responses
  private handleCanisterResponse<T>(result: any): ApiResponse<T> {
    if ('Ok' in result) {
      return {
        success: true,
        data: result.Ok,
      };
    } else if ('Err' in result) {
      return {
        success: false,
        error: result.Err,
      };
    }
    return {
      success: true,
      data: result,
    };
  }

  // Get all devices with pagination
  async getDevices(offset: number = 0, limit: number = 20): Promise<ApiResponse<DeviceListResponse>> {
    try {
      const actor = getActor();
      const result: BackendDeviceListResponse = await actor.get_all_devices(BigInt(offset), BigInt(limit));
      
      const response: DeviceListResponse = {
        devices: result.devices.map(device => this.convertDeviceInfoToRecord(device)),
        total: Number(result.total),
        offset: Number(result.offset),
        limit: Number(result.limit),
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      console.error('Failed to get devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get single device by ID
  async getDevice(deviceId: string): Promise<ApiResponse<DeviceRecord>> {
    try {
      const actor = getActor();
      const result = await actor.get_device_by_id(deviceId);
      
      if (result.length === 0) {
        return {
          success: false,
          error: 'Device not found',
        };
      }

      const device = this.convertDeviceInfoToRecord(result[0]);
      return {
        success: true,
        data: device,
      };
    } catch (error) {
      console.error('Failed to get device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Get devices by owner
  async getDevicesByOwner(owner: string): Promise<ApiResponse<DeviceRecord[]>> {
    try {
      const actor = getActor();
      const result = await actor.get_devices_by_owner(owner);
      
      const devices = result.map(device => this.convertDeviceInfoToRecord(device));
      return {
        success: true,
        data: devices,
      };
    } catch (error) {
      console.error('Failed to get devices by owner:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Add new device
  async submitDeviceRecord(record: DeviceRecord): Promise<ApiResponse<DeviceRecord>> {
    try {
      console.log('[DeviceApi] Submitting device record:', record);
      console.log('[DeviceApi] Principal ID to convert:', record.owner);
      
      const actor = getActor();
      const deviceInfo = this.convertRecordToDeviceInfo(record);
      console.log('[DeviceApi] Converted device info:', deviceInfo);
      
      const result = await actor.add_device(deviceInfo);
      
      return this.handleCanisterResponse<DeviceRecord>(result);
    } catch (error) {
      console.error('Failed to add device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Update device information
  async updateDevice(deviceId: string, record: DeviceRecord): Promise<ApiResponse<boolean>> {
    try {
      const actor = getActor();
      const deviceInfo = this.convertRecordToDeviceInfo(record);
      const result = await actor.update_device(deviceId, deviceInfo);
      
      return this.handleCanisterResponse<boolean>(result);
    } catch (error) {
      console.error('Failed to update device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Update device status
  async updateDeviceStatus(update: DeviceStatusUpdate): Promise<ApiResponse<boolean>> {
    try {
      const actor = getActor();
      const result = await actor.update_device_status(update.deviceId, update.status);
      
      return this.handleCanisterResponse<boolean>(result);
    } catch (error) {
      console.error('Failed to update device status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Update device last seen timestamp
  async updateDeviceLastSeen(deviceId: string): Promise<ApiResponse<boolean>> {
    try {
      const actor = getActor();
      const result = await actor.update_device_last_seen(deviceId);
      
      return this.handleCanisterResponse<boolean>(result);
    } catch (error) {
      console.error('Failed to update device last seen:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Delete device
  async deleteDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    try {
      console.log('[DeviceApi] Attempting to delete device:', deviceId);
      
      const actor = getActor();
      const result = await actor.delete_device(deviceId);
      
      console.log('[DeviceApi] Delete device result:', result);
      
      return this.handleCanisterResponse<boolean>(result);
    } catch (error) {
      console.error('[DeviceApi] Failed to delete device:', error);
      console.error('[DeviceApi] Device ID that failed:', deviceId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Search devices with filters
  async searchDevices(filter: DeviceFilter): Promise<ApiResponse<DeviceRecord[]>> {
    try {
      const actor = getActor();
      const result = await actor.search_devices(filter);
      
      const devices = result.map(device => this.convertDeviceInfoToRecord(device));
      return {
        success: true,
        data: devices,
      };
    } catch (error) {
      console.error('Failed to search devices:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }


  // Legacy methods for backward compatibility (not implemented in backend yet)
  // These methods can be implemented as needed or removed if not required

  // Disconnect device (legacy method)
  async disconnectDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    // Update device status to offline
    return this.updateDeviceStatus({
      deviceId,
      status: { Offline: null },
    });
  }

  // Get device statistics (computed from device list)
  async getDeviceStats(): Promise<ApiResponse<{
    total: number;
    connected: number;
    disconnected: number;
    error: number;
  }>> {
    try {
      const devicesResponse = await this.getDevices(0, 1000); // Get all devices
      if (!devicesResponse.success || !devicesResponse.data) {
        return {
          success: false,
          error: 'Failed to get devices for statistics',
        };
      }

      const devices = devicesResponse.data.devices;
      const stats = {
        total: devices.length,
        connected: devices.filter(d => 'Online' in d.status).length,
        disconnected: devices.filter(d => 'Offline' in d.status).length,
        error: devices.filter(d => 'Maintenance' in d.status || 'Disabled' in d.status).length,
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Failed to get device statistics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const deviceApiService = new DeviceApiService(); 
import { Actor, HttpAgent, ActorSubclass, Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { AnonymousIdentity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/aio-base-backend/aio-base-backend.did.js';
import type { 
  _SERVICE,
  PixelArtSource,
  Project,
  Version,
  ProjectId,
  VersionId,
  PixelRow
} from '../../../declarations/aio-base-backend/aio-base-backend.did.d.ts';

// Import environment configuration
import { 
  getAioBaseBackendCanisterId, 
  getHost, 
  isLocalNet, 
  logEnvironmentConfig 
} from '../../lib/environment';

// Import principal management
import { getPrincipalId } from '../../lib/principal';

// Canister configuration
const CANISTER_ID = getAioBaseBackendCanisterId();
const HOST = getHost();

// Log environment configuration
logEnvironmentConfig('PIXEL_CREATION_API');

// AuthClient instance
let authClient: AuthClient | null = null;

// Initialize AuthClient
const initAuthClient = async (): Promise<AuthClient> => {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  return authClient;
};

// Create authenticated actor using existing principal
const createActor = async (): Promise<ActorSubclass<_SERVICE>> => {
  // Use anonymous identity since we're using principalId for authentication
  // The backend will authenticate based on the caller's principal
  const identity = new AnonymousIdentity();
  
  const agent = new HttpAgent({ 
    host: HOST,
    identity
  });

  // Fetch root key in development
  if (isLocalNet()) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });
};

// Types for frontend use
export interface PixelArtData {
  title?: string;
  description?: string;
  width: number;
  height: number;
  palette: string[];
  pixels: number[][]; // 2D array for easier frontend handling
  tags?: string[];
}

export interface CreateProjectRequest {
  pixelArt: PixelArtData;
  message?: string;
}

export interface SaveVersionRequest {
  projectId: string;
  pixelArt: PixelArtData;
  message?: string;
  ifMatchVersion?: string;
}

export interface ProjectListItem {
  projectId: string;
  title: string;
  description?: string;
  owner: string;
  createdAt: bigint;
  updatedAt: bigint;
  currentVersion: {
    versionId: string;
    createdAt: bigint;
    editor: string;
    message?: string;
  };
}

// Convert frontend pixel data to backend format
const convertToBackendFormat = (pixelArt: PixelArtData): PixelArtSource => {
  // Convert 2D array to PixelRow format (array of Uint16Arrays)
  const pixelRows: PixelRow[] = pixelArt.pixels.map(row => 
    new Uint16Array(row)
  );

  return {
    width: pixelArt.width,
    height: pixelArt.height,
    palette: pixelArt.palette,
    pixels: pixelRows,
    frames: [], // No animation support in initial version
    metadata: pixelArt.title || pixelArt.description || pixelArt.tags ? [{
      title: pixelArt.title ? [pixelArt.title] : [],
      description: pixelArt.description ? [pixelArt.description] : [],
      tags: pixelArt.tags ? [pixelArt.tags] : []
    }] : []
  };
};

// Convert backend format to frontend format
const convertFromBackendFormat = (source: PixelArtSource): PixelArtData => {
  // Convert PixelRow format back to 2D array
  const pixels: number[][] = source.pixels.map(row => Array.from(row));
  
  const metadata = source.metadata && source.metadata.length > 0 ? source.metadata[0] : null;
  
  return {
    width: source.width,
    height: source.height,
    palette: source.palette,
    pixels,
    title: metadata?.title && metadata.title.length > 0 ? metadata.title[0] : undefined,
    description: metadata?.description && metadata.description.length > 0 ? metadata.description[0] : undefined,
    tags: metadata?.tags && metadata.tags.length > 0 ? metadata.tags[0] : undefined
  };
};

// API Functions
export class PixelCreationApi {
  
  /**
   * Create a new pixel art project
   */
  static async createProject(request: CreateProjectRequest): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const backendSource = convertToBackendFormat(request.pixelArt);
      
      const result = await actor.create_pixel_project(
        principalId,
        backendSource, 
        request.message ? [request.message] : []
      );
      
      if ('Ok' in result) {
        return {
          success: true,
          projectId: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to create pixel art project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Save a new version to an existing project
   */
  static async saveVersion(request: SaveVersionRequest): Promise<{ success: boolean; versionId?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const backendSource = convertToBackendFormat(request.pixelArt);
      
      const result = await actor.save_pixel_version(
        principalId,
        request.projectId,
        backendSource,
        request.message ? [request.message] : [],
        request.ifMatchVersion ? [request.ifMatchVersion] : []
      );
      
      if ('Ok' in result) {
        return {
          success: true,
          versionId: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to save pixel art version:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get a project by ID
   */
  static async getProject(projectId: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const actor = await createActor();
      const result = await actor.get_pixel_project(projectId);
      
      if (result && result.length > 0) {
        return {
          success: true,
          project: result[0]
        };
      } else {
        return {
          success: false,
          error: 'Project not found'
        };
      }
    } catch (error) {
      console.error('Failed to get pixel art project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get current version source data for a project
   */
  static async getCurrentSource(projectId: string): Promise<{ success: boolean; pixelArt?: PixelArtData; error?: string }> {
    try {
      const actor = await createActor();
      const result = await actor.get_pixel_current_source(projectId);
      
      if (result && result.length > 0) {
        const source = result[0];
        if (source) {
          const pixelArt = convertFromBackendFormat(source);
          return {
            success: true,
            pixelArt
          };
        }
      }
      
      return {
        success: false,
        error: 'Project source not found'
      };
    } catch (error) {
      console.error('Failed to get current source:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user's projects with pagination
   */
  static async getUserProjects(offset: number = 0, limit: number = 20): Promise<{ success: boolean; projects?: ProjectListItem[]; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const principal = Principal.fromText(principalId);
      const projects = await actor.list_pixel_projects_by_owner(
        principal,
        offset,
        limit
      );
      
      const projectList: ProjectListItem[] = projects.map(project => {
        const metadata = project.current_version.source.metadata && project.current_version.source.metadata.length > 0 
          ? project.current_version.source.metadata[0] 
          : null;
        
        return {
          projectId: project.project_id,
          title: (metadata?.title && metadata.title.length > 0
                 ? metadata.title[0] 
                 : 'Untitled') as string,
          description: metadata?.description && metadata.description.length > 0
                       ? metadata.description[0] 
                       : undefined,
          owner: project.owner.toString(),
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          currentVersion: {
            versionId: project.current_version.version_id,
            createdAt: project.current_version.created_at,
            editor: project.current_version.editor.toString(),
            message: project.current_version.message && project.current_version.message.length > 0 
                    ? project.current_version.message[0] 
                    : undefined
          }
        };
      });
      
      return {
        success: true,
        projects: projectList
      };
    } catch (error) {
      console.error('Failed to get user projects:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Export project for IoT devices
   */
  static async exportForDevice(projectId: string, versionId?: string): Promise<{ success: boolean; exportData?: any; error?: string }> {
    try {
      const actor = await createActor();
      const versionParam = versionId ? [versionId] : [];
      const result = await actor.export_pixel_for_device(projectId, versionId ? [versionId] : []);
      
      if ('Ok' in result) {
        const exportData = JSON.parse(result.Ok);
        return {
          success: true,
          exportData
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to export for device:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a project
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (!principalId) {
        return {
          success: false,
          error: 'No principal ID found. Please login first.'
        };
      }
      
      const actor = await createActor();
      const result = await actor.delete_pixel_project(principalId, projectId);
      
      if ('Ok' in result) {
        return {
          success: true,
          message: typeof result.Ok === 'string' ? result.Ok : 'Project deleted successfully'
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get total project count
   */
  static async getTotalProjectCount(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const actor = await createActor();
      const count = await actor.get_total_pixel_project_count();
      
      return {
        success: true,
        count: Number(count)
      };
    } catch (error) {
      console.error('Failed to get total project count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }


  /**
   * Check if user is authenticated (has a principalId)
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const principalId = getPrincipalId();
      return !!principalId;
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return false;
    }
  }

  /**
   * Login user (no longer needed since we use existing principalId)
   */
  static async login(): Promise<{ success: boolean; error?: string }> {
    try {
      const principalId = getPrincipalId();
      if (principalId) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: 'No principal ID found. Please login through the main authentication system first.' 
        };
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication check failed'
      };
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const client = await initAuthClient();
      await client.logout();
      authClient = null;
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }
}

export default PixelCreationApi;

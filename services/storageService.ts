
import { ProcessedImage, ProjectStats, AIModelId } from "../types";

const DB_NAME = "REDX_LAB_DB";
const STORE_NAME = "images";
const DB_VERSION = 1;
const STATS_KEY = "REDX_LIFETIME_STATS_V1";

export const storageService = {
  // --- INDEXED DB FOR IMAGES ---
  openDB: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  saveImage: async (image: ProcessedImage): Promise<void> => {
    try {
      const db = await storageService.openDB();
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(image);
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error("Failed to save image to DB", error);
    }
  },

  getAllImages: async (): Promise<ProcessedImage[]> => {
    try {
      const db = await storageService.openDB();
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const results = request.result as ProcessedImage[];
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to load images from DB", error);
      return [];
    }
  },

  deleteImage: async (id: string): Promise<void> => {
    const db = await storageService.openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  clearAll: async (): Promise<void> => {
    const db = await storageService.openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  },

  // --- LOCAL STORAGE FOR LIFETIME STATS ---
  
  getLifetimeStats: (): ProjectStats => {
    try {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure breakdown object exists (migration fix)
        if (!parsed.modelCounts) {
           parsed.modelCounts = {
             'gemini-2.5-flash-image': 0,
             'gemini-3-pro-image-preview': 0,
             'veo-3.1-fast-generate-preview': 0
           };
        }
        return parsed;
      }
    } catch (e) {
      console.error("Failed to read stats", e);
    }
    return {
      totalImagesGenerated: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0,
      modelCounts: {
         'gemini-2.5-flash-image': 0,
         'gemini-3-pro-image-preview': 0,
         'veo-3.1-fast-generate-preview': 0
      }
    };
  },

  // Added modelId optional param to track breakdown
  updateLifetimeStats: (increment: Partial<ProjectStats>, modelId?: AIModelId) => {
    try {
      const current = storageService.getLifetimeStats();
      
      const newModelCounts = { ...current.modelCounts };
      if (modelId && increment.totalImagesGenerated) {
         newModelCounts[modelId] = (newModelCounts[modelId] || 0) + increment.totalImagesGenerated;
      }

      const updated: ProjectStats = {
        totalImagesGenerated: current.totalImagesGenerated + (increment.totalImagesGenerated || 0),
        totalInputTokens: current.totalInputTokens + (increment.totalInputTokens || 0),
        totalOutputTokens: current.totalOutputTokens + (increment.totalOutputTokens || 0),
        totalCost: current.totalCost + (increment.totalCost || 0),
        modelCounts: newModelCounts as any
      };
      localStorage.setItem(STATS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error("Failed to update stats", e);
      return increment as ProjectStats;
    }
  },
  
  resetLifetimeStats: () => {
     localStorage.removeItem(STATS_KEY);
     return {
        totalImagesGenerated: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        modelCounts: {
            'gemini-2.5-flash-image': 0,
            'gemini-3-pro-image-preview': 0,
            'veo-3.1-fast-generate-preview': 0
        }
     };
  },

  syncStatsWithHistory: (historyTotal: ProjectStats) => {
     try {
        const current = storageService.getLifetimeStats();
        // If history has more cost than lifetime (meaning localstorage was wiped), sync up.
        // We can't accurately reconstruct modelCounts from just totalCost easily, so we leave it as is or approximate if needed.
        if (historyTotal.totalCost > current.totalCost) {
            // For safety, just take the max cost, but we can't fully sync modelCounts without iterating history types
            // Let's just trust history for the cost totals
            const merged = {
                ...current,
                totalImagesGenerated: Math.max(current.totalImagesGenerated, historyTotal.totalImagesGenerated),
                totalCost: Math.max(current.totalCost, historyTotal.totalCost),
                totalInputTokens: Math.max(current.totalInputTokens, historyTotal.totalInputTokens),
                totalOutputTokens: Math.max(current.totalOutputTokens, historyTotal.totalOutputTokens)
            };
            localStorage.setItem(STATS_KEY, JSON.stringify(merged));
            return merged;
        }
        return current;
     } catch (e) {
        return historyTotal;
     }
  }
};

import StorageService from "./storage.service";

export const fetchWithCache = async <T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  expiryMinutes: number = 5
): Promise<T> => {
  const cached =
    StorageService.getWithTimestamp<T>(
      cacheKey
    );

  const isOffline =
    !navigator.onLine;

 
  if (isOffline && cached) {

    return cached.data;
  }

  try {
    
    const response =
      await apiCall();

    StorageService.setWithTimestamp(
      cacheKey,
      response
    );

    return response;
  } catch (error) {
    console.warn(
      `[Cache] API failed: ${cacheKey}`
    );

    if (cached) {
      const expired =
        StorageService.isExpired(
          cached.timestamp,
          expiryMinutes
        );

      if (!expired) {
      
        return cached.data;
      }
    }

    throw error;
  }
};
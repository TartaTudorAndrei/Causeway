declare global {
  interface Window {
    __initGoogleMapsCallback?: () => void;
  }
}

let googleMapsPromise: Promise<any> | null = null;
let warningsSuppressed = false;

function suppressGoogleMapsDeprecationWarnings(): void {
  if (warningsSuppressed || typeof window === 'undefined') return;
  warningsSuppressed = true;

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === 'string') {
      const msg = args[0];
      if (
        msg.includes('google.maps.Marker is deprecated') ||
        msg.includes('google.maps.marker.AdvancedMarkerElement') ||
        msg.includes('google.maps.places.Autocomplete is not available to new customers') ||
        msg.includes('google.maps.places.PlaceAutocompleteElement')
      ) {
        return;
      }
    }
    originalWarn.apply(console, args);
  };
}

// Suppress on import if running in browser
suppressGoogleMapsDeprecationWarnings();

export function loadGoogleMaps(apiKey?: string): Promise<any> {
  suppressGoogleMapsDeprecationWarnings();
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const key = apiKey || (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  if (!key) {
    return Promise.reject(new Error('NO_API_KEY'));
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if maps already loaded
    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      resolve((window as any).google.maps);
      return;
    }

    const callbackName = '__initGoogleMapsCallback';

    window[callbackName] = () => {
      delete window[callbackName];
      if ((window as any).google?.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error('Google Maps SDK loaded but google.maps is undefined'));
      }
    };

    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      // Script already injected, poll for google.maps readiness
      const interval = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(interval);
          resolve((window as any).google.maps);
        }
      }, 50);

      existingScript.addEventListener('error', (e) => {
        clearInterval(interval);
        googleMapsPromise = null;
        reject(e);
      });

      setTimeout(() => {
        clearInterval(interval);
        if ((window as any).google?.maps) {
          resolve((window as any).google.maps);
        } else {
          googleMapsPromise = null;
          reject(new Error('Google Maps script load timeout'));
        }
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,marker&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(err);
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

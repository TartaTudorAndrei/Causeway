package com.charityapp.service.logistics;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GoogleMapsRoutingService {
    private static final Logger logger = LoggerFactory.getLogger(GoogleMapsRoutingService.class);

    @Value("${app.google.maps.api-key:}")
    private String googleMapsApiKey;

    private final RestTemplate restTemplate;

    // In-memory cache for route queries (originLat_originLon_destLat_destLon_mode -> result)
    private final Map<String, RouteResult> routeCache = new ConcurrentHashMap<>();

    public GoogleMapsRoutingService() {
        this.restTemplate = new RestTemplate();
    }

    public static class RouteResult {
        private final double distanceMeters;
        private final int durationMinutes;
        private final String transitMode; // WALK, DRIVE
        private final boolean isFromGoogleApi;

        public RouteResult(double distanceMeters, int durationMinutes, String transitMode, boolean isFromGoogleApi) {
            this.distanceMeters = distanceMeters;
            this.durationMinutes = durationMinutes;
            this.transitMode = transitMode;
            this.isFromGoogleApi = isFromGoogleApi;
        }

        public double getDistanceMeters() { return distanceMeters; }
        public int getDurationMinutes() { return durationMinutes; }
        public String getTransitMode() { return transitMode; }
        public boolean isFromGoogleApi() { return isFromGoogleApi; }
    }

    public RouteResult computeRoute(double originLat, double originLon, double destLat, double destLon, String preferredMode) {
        String cacheKey = String.format(Locale.US, "%.5f_%.5f_%.5f_%.5f_%s", originLat, originLon, destLat, destLon, preferredMode);
        if (routeCache.containsKey(cacheKey)) {
            return routeCache.get(cacheKey);
        }

        // 1. Try Google Maps Distance Matrix API if key is present
        if (googleMapsApiKey != null && !googleMapsApiKey.isBlank() && !googleMapsApiKey.startsWith("your-")) {
            try {
                String modeParam = "WALK".equalsIgnoreCase(preferredMode) ? "walking" : "driving";
                String url = String.format(Locale.US,
                        "https://maps.googleapis.com/maps/api/distancematrix/json?origins=%.6f,%.6f&destinations=%.6f,%.6f&mode=%s&departure_time=now&key=%s",
                        originLat, originLon, destLat, destLon, modeParam, googleMapsApiKey
                );

                @SuppressWarnings("unchecked")
                Map<String, Object> response = restTemplate.getForObject(url, Map.class);
                if (response != null && "OK".equals(response.get("status"))) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> rows = (List<Map<String, Object>>) response.get("rows");
                    if (rows != null && !rows.isEmpty()) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> elements = (List<Map<String, Object>>) rows.get(0).get("elements");
                        if (elements != null && !elements.isEmpty()) {
                            Map<String, Object> element = elements.get(0);
                            if ("OK".equals(element.get("status"))) {
                                @SuppressWarnings("unchecked")
                                Map<String, Object> distanceMap = (Map<String, Object>) element.get("distance");
                                @SuppressWarnings("unchecked")
                                Map<String, Object> durationMap = (Map<String, Object>) element.get("duration_in_traffic");
                                if (durationMap == null) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> fallbackDuration = (Map<String, Object>) element.get("duration");
                                    durationMap = fallbackDuration;
                                }

                                if (distanceMap != null && durationMap != null) {
                                    double distMeters = ((Number) distanceMap.get("value")).doubleValue();
                                    int durSeconds = ((Number) durationMap.get("value")).intValue();
                                    int durMinutes = Math.max(1, (int) Math.round(durSeconds / 60.0));

                                    RouteResult liveResult = new RouteResult(distMeters, durMinutes, preferredMode, true);
                                    routeCache.put(cacheKey, liveResult);
                                    return liveResult;
                                }
                            }
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("Google Maps Distance Matrix API call failed, falling back to spatial matrix: {}", e.getMessage());
            }
        }

        // 2. Deterministic Fallback (Haversine + Urban Speeds)
        double distanceMeters = calculateHaversineDistance(originLat, originLon, destLat, destLon);
        String mode = preferredMode != null ? preferredMode : (distanceMeters <= 1200.0 ? "WALK" : "DRIVE");
        int mins = "WALK".equalsIgnoreCase(mode)
                ? Math.max(1, (int) Math.round(distanceMeters / 75.0))
                : Math.max(2, (int) Math.round(distanceMeters / 333.0));

        RouteResult fallbackResult = new RouteResult(distanceMeters, mins, mode, false);
        routeCache.put(cacheKey, fallbackResult);
        return fallbackResult;
    }

    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }
}

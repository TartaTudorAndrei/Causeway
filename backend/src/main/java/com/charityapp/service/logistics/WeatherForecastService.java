package com.charityapp.service.logistics;

import com.charityapp.config.TenantProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class WeatherForecastService {
    private static final Logger logger = LoggerFactory.getLogger(WeatherForecastService.class);

    private final RestTemplate restTemplate;
    private final TenantProperties tenantProperties;

    // In-memory cache with 3 hours TTL
    private Map<String, DailyWeatherSummary> cachedForecast = new HashMap<>();
    private LocalDateTime lastFetchTime = null;
    private static final long CACHE_TTL_HOURS = 3;

    public WeatherForecastService() {
        this(new TenantProperties());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public WeatherForecastService(TenantProperties tenantProperties) {
        this.restTemplate = new RestTemplate();
        this.tenantProperties = tenantProperties != null ? tenantProperties : new TenantProperties();
    }

    public static class DailyWeatherSummary {
        private String date; // YYYY-MM-DD
        private double tempMax;
        private double tempMin;
        private double precipitationSum; // mm
        private double snowfallSum; // cm
        private double multiplier;
        private String conditionCode; // FREEZING, SNOW, RAIN, NORMAL
        private String conditionLabel;

        public DailyWeatherSummary() {}

        public DailyWeatherSummary(String date, double tempMax, double tempMin,
                                   double precipitationSum, double snowfallSum,
                                   double multiplier, String conditionCode, String conditionLabel) {
            this.date = date;
            this.tempMax = tempMax;
            this.tempMin = tempMin;
            this.precipitationSum = precipitationSum;
            this.snowfallSum = snowfallSum;
            this.multiplier = multiplier;
            this.conditionCode = conditionCode;
            this.conditionLabel = conditionLabel;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public double getTempMax() { return tempMax; }
        public void setTempMax(double tempMax) { this.tempMax = tempMax; }
        public double getTempMin() { return tempMin; }
        public void setTempMin(double tempMin) { this.tempMin = tempMin; }
        public double getPrecipitationSum() { return precipitationSum; }
        public void setPrecipitationSum(double precipitationSum) { this.precipitationSum = precipitationSum; }
        public double getSnowfallSum() { return snowfallSum; }
        public void setSnowfallSum(double snowfallSum) { this.snowfallSum = snowfallSum; }
        public double getMultiplier() { return multiplier; }
        public void setMultiplier(double multiplier) { this.multiplier = multiplier; }
        public String getConditionCode() { return conditionCode; }
        public void setConditionCode(String conditionCode) { this.conditionCode = conditionCode; }
        public String getConditionLabel() { return conditionLabel; }
        public void setConditionLabel(String conditionLabel) { this.conditionLabel = conditionLabel; }
    }

    public synchronized Map<String, DailyWeatherSummary> get14DayForecast() {
        LocalDateTime now = LocalDateTime.now();
        if (lastFetchTime != null && !cachedForecast.isEmpty() && lastFetchTime.plusHours(CACHE_TTL_HOURS).isAfter(now)) {
            return cachedForecast;
        }

        try {
            double lat = (tenantProperties != null && tenantProperties.getLocation() != null)
                    ? tenantProperties.getLocation().getLatitude() : 46.7712;
            double lon = (tenantProperties != null && tenantProperties.getLocation() != null)
                    ? tenantProperties.getLocation().getLongitude() : 23.6236;
            String url = String.format(java.util.Locale.US,
                    "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum&timezone=auto&forecast_days=14",
                    lat, lon);

            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("daily")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> daily = (Map<String, Object>) response.get("daily");
                @SuppressWarnings("unchecked")
                List<String> dates = (List<String>) daily.get("time");
                @SuppressWarnings("unchecked")
                List<Number> tempMaxList = (List<Number>) daily.get("temperature_2m_max");
                @SuppressWarnings("unchecked")
                List<Number> tempMinList = (List<Number>) daily.get("temperature_2m_min");
                @SuppressWarnings("unchecked")
                List<Number> precipList = (List<Number>) daily.get("precipitation_sum");
                @SuppressWarnings("unchecked")
                List<Number> snowList = (List<Number>) daily.get("snowfall_sum");

                if (dates != null) {
                    Map<String, DailyWeatherSummary> freshForecast = new HashMap<>();
                    for (int i = 0; i < dates.size(); i++) {
                        String dateStr = dates.get(i);
                        double tMax = (tempMaxList != null && i < tempMaxList.size() && tempMaxList.get(i) != null) ? tempMaxList.get(i).doubleValue() : 5.0;
                        double tMin = (tempMinList != null && i < tempMinList.size() && tempMinList.get(i) != null) ? tempMinList.get(i).doubleValue() : 0.0;
                        double precip = (precipList != null && i < precipList.size() && precipList.get(i) != null) ? precipList.get(i).doubleValue() : 0.0;
                        double snow = (snowList != null && i < snowList.size() && snowList.get(i) != null) ? snowList.get(i).doubleValue() : 0.0;

                        double multiplier = 1.0;
                        String conditionCode = "NORMAL";
                        String conditionLabel = "Temperat";

                        if (snow > 2.0) {
                            multiplier *= 1.15;
                            conditionCode = "SNOW";
                            conditionLabel = "Ninsoare";
                        }
                        if (tMax <= 2.0 || tMin <= 0.0) {
                            double freezingBoost = (tMax <= -2.0) ? 1.30 : 1.20;
                            multiplier *= freezingBoost;
                            if (!"SNOW".equals(conditionCode)) {
                                conditionCode = "FREEZING";
                                conditionLabel = "Ger / Subzero";
                            }
                        }
                        if (precip > 10.0 && snow <= 2.0) {
                            multiplier *= 0.80;
                            conditionCode = "RAIN";
                            conditionLabel = "Ploaie Torențială";
                        }

                        multiplier = Math.round(multiplier * 100.0) / 100.0;

                        freshForecast.put(dateStr, new DailyWeatherSummary(
                                dateStr,
                                Math.round(tMax * 10.0) / 10.0,
                                Math.round(tMin * 10.0) / 10.0,
                                Math.round(precip * 10.0) / 10.0,
                                Math.round(snow * 10.0) / 10.0,
                                multiplier,
                                conditionCode,
                                conditionLabel
                        ));
                    }
                    cachedForecast = freshForecast;
                    lastFetchTime = now;
                    return cachedForecast;
                }
            }
        } catch (Exception e) {
            String city = (tenantProperties != null && tenantProperties.getLocation() != null)
                    ? tenantProperties.getLocation().getCity() : "tenant location";
            logger.warn("Could not fetch Open-Meteo weather forecast for {}: {}", city, e.getMessage());
        }

        if (cachedForecast.isEmpty()) {
            Map<String, DailyWeatherSummary> fallback = new HashMap<>();
            LocalDate today = LocalDate.now();
            for (int i = 0; i < 14; i++) {
                String d = today.plusDays(i).toString();
                fallback.put(d, new DailyWeatherSummary(d, 4.0, -1.0, 0.0, 0.0, 1.0, "NORMAL", "Temperat"));
            }
            return fallback;
        }

        return cachedForecast;
    }

    public DailyWeatherSummary getWeatherForDate(String dateStr) {
        Map<String, DailyWeatherSummary> forecast = get14DayForecast();
        return forecast.getOrDefault(dateStr, new DailyWeatherSummary(dateStr, 5.0, 0.0, 0.0, 0.0, 1.0, "NORMAL", "Temperat"));
    }
}

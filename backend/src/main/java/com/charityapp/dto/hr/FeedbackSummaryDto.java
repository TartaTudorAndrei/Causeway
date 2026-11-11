package com.charityapp.dto.hr;

import java.util.List;
import java.util.Map;

public class FeedbackSummaryDto {
    private long totalSubmissions;
    private long unresolvedCount;
    private String topCategory;
    private String dominantTheme;
    private Map<String, Long> countByType;
    private Map<String, Long> countByStatus;
    private Map<String, Long> countByCategory;
    private List<FeedbackThemeDto> clusteredThemes;

    public FeedbackSummaryDto() {}

    public long getTotalSubmissions() {
        return totalSubmissions;
    }

    public void setTotalSubmissions(long totalSubmissions) {
        this.totalSubmissions = totalSubmissions;
    }

    public long getUnresolvedCount() {
        return unresolvedCount;
    }

    public void setUnresolvedCount(long unresolvedCount) {
        this.unresolvedCount = unresolvedCount;
    }

    public String getTopCategory() {
        return topCategory;
    }

    public void setTopCategory(String topCategory) {
        this.topCategory = topCategory;
    }

    public String getDominantTheme() {
        return dominantTheme;
    }

    public void setDominantTheme(String dominantTheme) {
        this.dominantTheme = dominantTheme;
    }

    public Map<String, Long> getCountByType() {
        return countByType;
    }

    public void setCountByType(Map<String, Long> countByType) {
        this.countByType = countByType;
    }

    public Map<String, Long> getCountByStatus() {
        return countByStatus;
    }

    public void setCountByStatus(Map<String, Long> countByStatus) {
        this.countByStatus = countByStatus;
    }

    public Map<String, Long> getCountByCategory() {
        return countByCategory;
    }

    public void setCountByCategory(Map<String, Long> countByCategory) {
        this.countByCategory = countByCategory;
    }

    public List<FeedbackThemeDto> getClusteredThemes() {
        return clusteredThemes;
    }

    public void setClusteredThemes(List<FeedbackThemeDto> clusteredThemes) {
        this.clusteredThemes = clusteredThemes;
    }
}

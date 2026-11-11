package com.charityapp.dto.hr;

import java.util.ArrayList;
import java.util.List;

public class FeedbackThemeDto {
    private String theme;
    private int count;
    private String sentiment; // POSITIVE, NEGATIVE, NEUTRAL
    private String summary;
    private boolean isNewCategory;
    private List<String> feedbackIds = new ArrayList<>();

    public FeedbackThemeDto() {}

    public FeedbackThemeDto(String theme, int count, String sentiment, String summary) {
        this(theme, count, sentiment, summary, false, new ArrayList<>());
    }

    public FeedbackThemeDto(String theme, int count, String sentiment, String summary, boolean isNewCategory) {
        this(theme, count, sentiment, summary, isNewCategory, new ArrayList<>());
    }

    public FeedbackThemeDto(String theme, int count, String sentiment, String summary, boolean isNewCategory, List<String> feedbackIds) {
        this.theme = theme;
        this.count = count;
        this.sentiment = sentiment;
        this.summary = summary;
        this.isNewCategory = isNewCategory;
        this.feedbackIds = feedbackIds != null ? feedbackIds : new ArrayList<>();
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public String getSentiment() {
        return sentiment;
    }

    public void setSentiment(String sentiment) {
        this.sentiment = sentiment;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public boolean isNewCategory() {
        return isNewCategory;
    }

    public void setNewCategory(boolean newCategory) {
        isNewCategory = newCategory;
    }

    public List<String> getFeedbackIds() {
        return feedbackIds;
    }

    public void setFeedbackIds(List<String> feedbackIds) {
        this.feedbackIds = feedbackIds != null ? feedbackIds : new ArrayList<>();
    }
}

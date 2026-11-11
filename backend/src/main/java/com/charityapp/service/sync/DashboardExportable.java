package com.charityapp.service.sync;

import java.util.List;

public interface DashboardExportable {
    String getTabName();
    List<String> getHeaders();
    List<List<Object>> getRows();
    
    default String getDomain() {
        return "GENERAL";
    }
    
    default boolean isOverview() {
        return false;
    }
}

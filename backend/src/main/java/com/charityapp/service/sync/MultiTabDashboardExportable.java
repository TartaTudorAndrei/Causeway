package com.charityapp.service.sync;

import java.util.List;

public interface MultiTabDashboardExportable extends DashboardExportable {
    List<DashboardExportable> getTabs();

    @Override
    default String getTabName() { return ""; }
    @Override
    default List<String> getHeaders() { return List.of(); }
    @Override
    default List<List<Object>> getRows() { return List.of(); }
}

package com.charityapp.service.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AppSettingsService {

    private static final Logger log = LoggerFactory.getLogger(AppSettingsService.class);
    private final JdbcTemplate jdbcTemplate;

    public AppSettingsService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String getSetting(String key) {
        try {
            String sql = "SELECT config_value FROM general.app_settings WHERE config_key = ?";
            List<String> res = jdbcTemplate.queryForList(sql, String.class, key);
            return res.isEmpty() ? null : res.get(0);
        } catch (Exception e) {
            return null;
        }
    }


    public void saveSetting(String key, String value) {
        try {
            String sql = "INSERT INTO general.app_settings (config_key, config_value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (config_key) DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW();";
            jdbcTemplate.update(sql, key, value);
        } catch (Exception e) {
            log.warn("Could not save setting {}: {}", key, e.getMessage());
        }
    }


}

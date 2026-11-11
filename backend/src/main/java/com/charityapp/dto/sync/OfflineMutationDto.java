package com.charityapp.dto.sync;

import java.util.Map;

public class OfflineMutationDto {
    private String id;
    private String domain;
    private String url;
    private String method;
    private Object body;
    private Long timestamp;

    public OfflineMutationDto() {
    }

    public OfflineMutationDto(String id, String domain, String url, String method, Object body, Long timestamp) {
        this.id = id;
        this.domain = domain;
        this.url = url;
        this.method = method;
        this.body = body;
        this.timestamp = timestamp;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public Object getBody() {
        return body;
    }

    public void setBody(Object body) {
        this.body = body;
    }

    public Long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Long timestamp) {
        this.timestamp = timestamp;
    }
}

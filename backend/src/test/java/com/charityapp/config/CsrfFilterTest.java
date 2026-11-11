package com.charityapp.config;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.CsrfFilter;
import com.charityapp.service.security.CsrfTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CsrfFilterTest {

    private CsrfTokenService csrfTokenService;
    private CsrfFilter csrfFilter;

    @BeforeEach
    void setUp() {
        csrfTokenService = new CsrfTokenService();
        csrfFilter = new CsrfFilter(csrfTokenService);
    }

    @Test
    @DisplayName("State-changing POST without CSRF token returns 403")
    void testPostWithoutCsrfToken_Returns403() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/users");
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        csrfFilter.doFilter(request, response, chain);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatus());
        assertTrue(response.getContentAsString().contains("CSRF"));
    }

    @Test
    @DisplayName("State-changing POST with valid CSRF cookie and matching header passes filter")
    void testPostWithValidCsrfToken_Passes() throws Exception {
        String token = csrfTokenService.generateToken();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/users");
        request.setCookies(new Cookie("XSRF-TOKEN", token));
        request.addHeader("X-XSRF-TOKEN", token);

        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = mock(MockFilterChain.class);

        csrfFilter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertNotEquals(HttpStatus.FORBIDDEN.value(), response.getStatus());
    }

    @Test
    @DisplayName("GET request is exempt from CSRF validation")
    void testGetRequest_IsExempt() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/users");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = mock(MockFilterChain.class);

        csrfFilter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("Unauthenticated POST /api/admin/login is exempt from CSRF validation")
    void testLoginPost_IsExempt() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/admin/login");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = mock(MockFilterChain.class);

        csrfFilter.doFilter(request, response, chain);

        verify(chain, times(1)).doFilter(request, response);
        assertNotEquals(HttpStatus.FORBIDDEN.value(), response.getStatus());
    }
}

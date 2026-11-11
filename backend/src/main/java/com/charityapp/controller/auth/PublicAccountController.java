package com.charityapp.controller.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.common.ActionResponseDTO;
import com.charityapp.dto.account.CustomerAccountDetailsDTO;
import com.charityapp.dto.account.CustomerProfileUpdateDTO;
import com.charityapp.dto.account.CustomerRegisterRequestDTO;
import com.charityapp.dto.finance.DonationResponse;
import com.charityapp.dto.auth.GoogleLoginRequestDTO;
import com.charityapp.dto.auth.LoginRequestDTO;
import com.charityapp.dto.auth.LoginResponseDTO;
import com.charityapp.service.auth.AdminAuthService;
import com.charityapp.service.auth.JwtService;
import com.charityapp.service.auth.PublicAccountService;
import com.charityapp.service.auth.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/public/account")
public class PublicAccountController {
    private static final Logger log = LoggerFactory.getLogger(PublicAccountController.class);

    private final PublicAccountService publicAccountService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public PublicAccountController(
            PublicAccountService publicAccountService,
            JwtService jwtService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) RefreshTokenService refreshTokenService) {
        this.publicAccountService = publicAccountService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody CustomerRegisterRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            LoginResponseDTO loginResponse = publicAccountService.registerCustomer(dto, ip, ua);
            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.status(HttpStatus.CREATED).body(loginResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Customer registration error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o problemă la crearea contului."));
        }
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            LoginResponseDTO loginResponse = publicAccountService.loginCustomer(dto, ip, ua);
            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.ok(loginResponse);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (AdminAuthService.StatusBlockedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", e.getStatus(), "message", e.getMessage()));
        }
    }

    @PostMapping("/auth/google")
    public ResponseEntity<?> loginWithGoogle(
            @Valid @RequestBody GoogleLoginRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            LoginResponseDTO loginResponse = publicAccountService.loginWithGoogle(dto.getCredential(), ip, ua);
            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.ok(loginResponse);
        } catch (AdminAuthService.StatusBlockedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("status", e.getStatus(), "message", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Google customer login error: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Autentificare Google eșuată."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<CustomerAccountDetailsDTO> getCurrentCustomer(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID userId = resolveUserId(request, authHeader);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune expirată sau lipsă autentificare.");
        }
        return ResponseEntity.ok(publicAccountService.getCustomerDetails(userId));
    }

    @GetMapping("/donations")
    public ResponseEntity<List<DonationResponse>> getCustomerDonations(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID userId = resolveUserId(request, authHeader);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune expirată sau lipsă autentificare.");
        }
        return ResponseEntity.ok(publicAccountService.getDonationsForCustomer(userId));
    }

    @PutMapping("/profile")
    public ResponseEntity<CustomerAccountDetailsDTO> updateProfile(
            @Valid @RequestBody CustomerProfileUpdateDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID userId = resolveUserId(request, authHeader);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune expirată sau lipsă autentificare.");
        }
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        return ResponseEntity.ok(publicAccountService.updateProfile(userId, dto, ip, ua));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<ActionResponseDTO> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {
        UUID userId = resolveUserId(request, authHeader);
        if (userId != null && refreshTokenService != null) {
            refreshTokenService.revokeAllForUser(userId);
        }

        ResponseCookie cookie = ResponseCookie.from("adminToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.ok(new ActionResponseDTO(true, "Deconectat cu succes."));
    }

    private UUID resolveUserId(HttpServletRequest request, String authHeader) {
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            token = extractCookieValue(request, "adminToken");
        }
        if (token == null || !jwtService.isTokenValid(token)) {
            return null;
        }
        return jwtService.extractUserId(token);
    }

    private void setAuthCookies(HttpServletRequest request, HttpServletResponse response, String accessToken, String ip, String ua) {
        UUID userId = jwtService.extractUserId(accessToken);
        String refreshToken = null;
        if (refreshTokenService != null && userId != null) {
            refreshToken = refreshTokenService.generateRefreshToken(userId, ip, ua);
        }

        String proto = request.getHeader("X-Forwarded-Proto");
        String host = request.getHeader("Host");
        boolean isHttps = request.isSecure() || "https".equalsIgnoreCase(proto)
                || (host != null && !host.contains("localhost") && !host.contains("127.0.0.1"));

        ResponseCookie accessCookie = ResponseCookie.from("adminToken", accessToken)
                .httpOnly(true)
                .secure(isHttps)
                .path("/")
                .maxAge(Duration.ofHours(jwtService.getExpirationHours()))
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());

        if (refreshToken != null && !refreshToken.isBlank()) {
            ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", refreshToken)
                    .httpOnly(true)
                    .secure(isHttps)
                    .path("/")
                    .maxAge(Duration.ofDays(7))
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
        }
    }

    private String extractCookieValue(HttpServletRequest request, String cookieName) {
        if (request != null && request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (cookieName.equals(c.getName())) {
                    return c.getValue();
                }
            }
        }
        return null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}

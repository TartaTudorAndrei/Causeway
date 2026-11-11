package com.charityapp.controller.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.auth.*;
import com.charityapp.dto.admin.*;
import com.charityapp.dto.account.*;
import com.charityapp.dto.finance.*;
import com.charityapp.dto.notification.*;
import com.charityapp.dto.common.*;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.service.auth.AdminAuthService;
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
import com.charityapp.config.RequirePermission;
import com.charityapp.model.auth.Club;
import com.charityapp.model.auth.Role;
import com.charityapp.repository.auth.ClubRepository;
import com.charityapp.repository.auth.RoleRepository;
import com.charityapp.service.auth.JwtService;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {
    private static final Logger log = LoggerFactory.getLogger(AdminAuthController.class);

    private final AdminAuthService authService;
    private final com.charityapp.service.auth.TwoFactorAuthService twoFactorAuthService;
    private final com.charityapp.service.auth.GoogleAuthService googleAuthService;
    private final JwtService jwtService;
    private final ClubRepository clubRepository;
    private final RoleRepository roleRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.charityapp.service.auth.RefreshTokenService refreshTokenService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.charityapp.service.auth.SessionManagerService sessionManagerService;

    public AdminAuthController(AdminAuthService authService,
                               com.charityapp.service.auth.TwoFactorAuthService twoFactorAuthService,
                               com.charityapp.service.auth.GoogleAuthService googleAuthService,
                               JwtService jwtService,
                               ClubRepository clubRepository,
                               RoleRepository roleRepository) {
        this.authService = authService;
        this.twoFactorAuthService = twoFactorAuthService;
        this.googleAuthService = googleAuthService;
        this.jwtService = jwtService;
        this.clubRepository = clubRepository;
        this.roleRepository = roleRepository;
    }

    @GetMapping("/clubs")
    public ResponseEntity<List<Club>> getClubs(@RequestParam(required = false) String organizationType) {
        if (organizationType != null && !organizationType.isBlank() && !"ALL".equalsIgnoreCase(organizationType)) {
            return ResponseEntity.ok(clubRepository.findByOrganizationType(organizationType));
        }
        return ResponseEntity.ok(clubRepository.findAll());
    }

    @PostMapping("/clubs")
    @RequirePermission(code = "admin:write")
    public ResponseEntity<Club> createClub(@RequestBody Club club) {
        if (club.getName() == null || club.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(clubRepository.save(club));
    }

    @GetMapping("/roles")
    public ResponseEntity<List<Role>> getRoles() {
        return ResponseEntity.ok(roleRepository.findAll());
    }

    @PostMapping("/request-access")
    public ResponseEntity<ActionResponseDTO> requestAccess(
            @Valid @RequestBody RequestAccessDTO dto,
            HttpServletRequest request) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        String origin = resolveClientOrigin(request);
        
        try {
            authService.requestAccess(dto, ip, ua, origin);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ActionResponseDTO(true, "Solicitare înregistrată. Verificați adresa de email pentru confirmare."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(new ActionResponseDTO(false, e.getMessage()));
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ActionResponseDTO(false, "Există deja un cont sau o solicitare înregistrată cu aceste date."));
        } catch (Exception e) {
            log.error("Failed to process request access for email {}: {}", dto.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o eroare la crearea contului. Vă rugăm să reîncercați."));
        }
    }

    @GetMapping("/verify-email")
    public ResponseEntity<ActionResponseDTO> verifyEmail(
            @RequestParam String token,
            HttpServletRequest request) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        String origin = resolveClientOrigin(request);
        
        try {
            AdminUser user = authService.verifyEmail(token, ip, ua, origin);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Email confirmat. Cererea se află în curs de aprobare.", user.getEmail()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                .body(new ActionResponseDTO(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to verify email token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o eroare la verificarea adresei de email. Vă rugăm să reîncercați."));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ActionResponseDTO> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequestDTO dto,
            HttpServletRequest request) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        String origin = resolveClientOrigin(request);

        try {
            authService.forgotPassword(dto.getEmail(), ip, ua, origin);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Dacă există un cont asociat adresei de email, a fost trimis un link de resetare."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to process forgot password for email {}: {}", dto.getEmail(), e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o eroare la procesarea cererii de resetare."));
        }
    }

    @GetMapping("/validate-reset-token")
    public ResponseEntity<ActionResponseDTO> validateResetToken(@RequestParam String token) {
        boolean valid = authService.validateResetToken(token);
        if (!valid) {
            return ResponseEntity.badRequest()
                .body(new ActionResponseDTO(false, "Token-ul de resetare a parolei este invalid sau a expirat."));
        }
        return ResponseEntity.ok(new ActionResponseDTO(true, "Token valid."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ActionResponseDTO> resetPassword(
            @Valid @RequestBody ResetPasswordRequestDTO dto,
            HttpServletRequest request) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            authService.resetPassword(dto.getToken(), dto.getNewPassword(), ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Parola a fost resetată cu succes."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to reset password: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o eroare la resetarea parolei. Vă rugăm să reîncercați."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        
        try {
            LoginResponseDTO loginResponse = authService.login(dto, ip, ua);
            if (loginResponse.isTwoFactorRequired()) {
                // Do not issue auth cookie yet; require 2FA completion
                return ResponseEntity.ok(loginResponse);
            }

            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.ok(loginResponse);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        } catch (AdminAuthService.StatusBlockedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("status", e.getStatus(), "message", e.getMessage()));
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
            LoginResponseDTO loginResponse = googleAuthService.authenticateGoogleUser(dto.getCredential(), ip, ua);
            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.ok(loginResponse);
        } catch (AdminAuthService.StatusBlockedException e) {
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("status", e.getStatus() != null ? e.getStatus() : "BLOCKED");
            body.put("message", e.getMessage());
            if (e.getEmail() != null) {
                body.put("email", e.getEmail());
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Google login failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Autentificare Google eșuată."));
        }
    }

    @PostMapping("/auth/google/register")
    public ResponseEntity<?> registerGoogleUser(
            @Valid @RequestBody GoogleRegisterRequestDTO dto,
            HttpServletRequest request) {
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            AdminUser user = googleAuthService.registerGoogleUser(dto, ip, ua);
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ActionResponseDTO(true, "Solicitarea a fost înregistrată cu succes și este în așteptare de aprobare.", user.getEmail()));
        } catch (AdminAuthService.StatusBlockedException e) {
            java.util.Map<String, Object> body = new java.util.HashMap<>();
            body.put("status", e.getStatus() != null ? e.getStatus() : "BLOCKED");
            body.put("message", e.getMessage());
            if (e.getEmail() != null) {
                body.put("email", e.getEmail());
            }
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to register Google user: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ActionResponseDTO(false, "A apărut o eroare la înregistrarea contului Google. Vă rugăm să reîncercați."));
        }
    }

    @PostMapping("/auth/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshTokenValue = extractCookieValue(request, "refreshToken");
        if (refreshTokenValue == null || refreshTokenValue.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Refresh token lipsă."));
        }

        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        if (refreshTokenService == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "Serviciul de refresh nu este disponibil."));
        }

        try {
            com.charityapp.service.auth.RefreshTokenService.RefreshResult result = refreshTokenService.rotateToken(refreshTokenValue, ip, ua);
            setAuthCookies(request, response, result.accessToken(), result.refreshToken());
            return ResponseEntity.ok(result.loginResponse());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Sesiunea a expirat sau este invalidă. Vă rugăm să vă reconectați."));
        }
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verify2FA(
            @Valid @RequestBody TwoFactorVerifyRequestDTO dto,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        
        try {
            AdminUser user = twoFactorAuthService.verifyLogin(dto.getSessionToken(), dto.getCode(), dto.getMethod(), ip, ua);
            LoginResponseDTO loginResponse = authService.generateSessionResponse(user, ip, ua);
            setAuthCookies(request, response, loginResponse.getToken(), ip, ua);
            return ResponseEntity.ok(loginResponse);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, e.getMessage());
        }
    }

    @PostMapping("/2fa/send-email-otp")
    public ResponseEntity<ActionResponseDTO> sendLoginEmailOtp(
            @RequestBody TwoFactorSendEmailOtpRequestDTO dto,
            HttpServletRequest request) {
        
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        
        try {
            twoFactorAuthService.sendLoginEmailOtp(dto.getSessionToken(), ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Codul de verificare a fost trimis pe email."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        }
    }

    @GetMapping("/2fa/status")
    public ResponseEntity<TwoFactorStatusResponseDTO> get2FAStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        return ResponseEntity.ok(twoFactorAuthService.getStatus(actorId));
    }

    @PostMapping("/2fa/setup/initiate")
    public ResponseEntity<TwoFactorSetupInitiateResponseDTO> initiate2FASetup(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        return ResponseEntity.ok(twoFactorAuthService.initiateSetup(actorId));
    }

    @PostMapping("/2fa/setup/resend-email")
    public ResponseEntity<ActionResponseDTO> resendSetupEmailOtp(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        twoFactorAuthService.resendSetupEmailOtp(actorId);
        return ResponseEntity.ok(new ActionResponseDTO(true, "Cod nou trimis pe email."));
    }

    @PostMapping("/2fa/setup/confirm")
    public ResponseEntity<ActionResponseDTO> confirm2FASetup(
            @Valid @RequestBody TwoFactorSetupConfirmRequestDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        try {
            twoFactorAuthService.confirmSetup(actorId, dto, ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "2FA a fost activat cu succes!"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        }
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<ActionResponseDTO> disable2FA(
            @Valid @RequestBody TwoFactorDisableRequestDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        try {
            twoFactorAuthService.disable2FA(actorId, dto, ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "2FA a fost dezactivat cu succes."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ActionResponseDTO(false, e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ActionResponseDTO> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            String rawToken = extractToken(request, authHeader);
            if (rawToken != null && !rawToken.isBlank()) {
                actorId = jwtService.extractUserId(rawToken);
            }
        }
        if (actorId != null) {
            authService.logout(actorId);
            if (refreshTokenService != null) {
                refreshTokenService.revokeAllForUser(actorId);
            }
        }
        clearAuthCookies(response);
        return ResponseEntity.ok(new ActionResponseDTO(true, "Deconectat cu succes."));
    }

    @GetMapping("/status")
    public ResponseEntity<StatusResponseDTO> getStatus(@RequestParam String email) {
        try {
            String status = authService.getStatus(email);
            return ResponseEntity.ok(new StatusResponseDTO(status));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponseDTO.UserDetailsDTO> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {
        UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau expirată.");
        }
        AdminUser user = authService.getUserById(actorId);
        if (user == null || user.getStatus() != com.charityapp.model.auth.AdminStatus.APPROVED) {
            clearAuthCookies(response);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Contul nu este activ.");
        }
        List<String> roles = user.getRoles() != null && !user.getRoles().isEmpty()
            ? user.getRoles()
            : List.of(user.getRole());
        List<String> permissions = authService.getPermissionCodesForRoles(roles);
        return ResponseEntity.ok(new LoginResponseDTO.UserDetailsDTO(
            user.getFullName(),
            user.getEmail(),
            user.getRole(),
            roles,
            user.getPhone(),
            user.getOrganizationType(),
            user.getOrganizationDetails(),
            permissions,
            user.isWhatsappNotificationsEnabled()
        ));
    }

    @PutMapping("/me/whatsapp-notifications")
    public ResponseEntity<Map<String, Object>> updateWhatsappNotificationsPreference(
            @RequestBody Map<String, Boolean> payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        UUID actorId = requireAuthenticatedUser(request, authHeader);
        boolean enabled = payload == null || !Boolean.FALSE.equals(payload.get("enabled"));
        authService.updateWhatsappNotificationsPreference(actorId, enabled);
        return ResponseEntity.ok(Map.of("success", true, "whatsappNotificationsEnabled", enabled));
    }

    private java.util.UUID requireAuthenticatedUser(HttpServletRequest request, String authHeader) {
        java.util.UUID actorId = tryValidateToken(request, authHeader);
        if (actorId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesiune invalidă sau lipsă token.");
        }
        return actorId;
    }

    @GetMapping("/users")
    @RequirePermission(code = "it:users:read", anyOf = {"admin:read", "it:read", "admin:users:view", "it:users:view", "admin:users:read"})
    public ResponseEntity<List<AdminUser>> getAllUsers(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @PostMapping("/users")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:create", "it:users:create", "it:users:manage"})
    public ResponseEntity<AdminUser> createUser(
            @Valid @RequestBody CreateAdminUserDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            AdminUser created = authService.createUser(dto, actorId, ip, ua);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, e.getMessage());
        }
    }

    @PutMapping("/users/{id}/role")
    @RequirePermission(code = "it:users:roles:manage", anyOf = {"it:users:write", "admin:write", "it:write", "roles:assign", "roles:manage"})
    public ResponseEntity<ActionResponseDTO> updateUserRole(
            @PathVariable java.util.UUID id,
            @RequestBody UpdateUserRoleDTO dto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            authService.updateUserRoles(id, dto.getRoles(), actorId, ip, ua);

            // If user updated their own roles, token_version was incremented.
            // Re-issue fresh access & refresh tokens with the new token_version so their active session is not invalidated.
            if (actorId != null && actorId.equals(id)) {
                AdminUser updatedSelf = authService.getUserById(id);
                if (updatedSelf != null) {
                    LoginResponseDTO sessionRes = authService.generateSessionResponse(updatedSelf, ip, ua);
                    setAuthCookies(request, response, sessionRes.getToken(), ip, ua);
                    return ResponseEntity.ok(new ActionResponseDTO(true, "Roluri actualizate cu succes.", sessionRes.getToken()));
                }
            }

            return ResponseEntity.ok(new ActionResponseDTO(true, "Roluri actualizate cu succes."));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping("/users/{id}/suspend")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:suspend", "it:users:suspend"})
    public ResponseEntity<ActionResponseDTO> suspendUser(
            @PathVariable java.util.UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            authService.suspendUser(id, actorId, ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Cont suspendat."));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @DeleteMapping("/users/{id}")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:delete", "it:users:delete"})
    public ResponseEntity<ActionResponseDTO> deleteUser(
            @PathVariable java.util.UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");

        try {
            authService.deleteUser(id, actorId, ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Cont utilizator șters."));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @PostMapping("/users/{id}/delete")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:delete", "it:users:delete"})
    public ResponseEntity<ActionResponseDTO> deleteUserPost(
            @PathVariable java.util.UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        return deleteUser(id, authHeader, request);
    }

    @GetMapping("/pending")
    @RequirePermission(code = "it:users:read", anyOf = {"admin:read", "it:read", "admin:users:view", "it:users:view", "admin:users:read"})
    public ResponseEntity<List<AdminUser>> getPendingApprovals(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        List<AdminUser> pending = authService.getPendingApprovals();
        return ResponseEntity.ok(pending);
    }

    @PostMapping("/approve/{id}")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:approve", "it:users:approve"})
    public ResponseEntity<ActionResponseDTO> approveUser(
            @PathVariable java.util.UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        String origin = resolveClientOrigin(request);
        
        try {
            authService.approveUser(id, actorId, ip, ua, origin);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Cont aprobat cu succes."));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping("/reject/{id}")
    @RequirePermission(code = "it:users:write", anyOf = {"admin:write", "it:write", "admin:users:reject", "it:users:reject"})
    public ResponseEntity<ActionResponseDTO> rejectUser(
            @PathVariable java.util.UUID id,
            @RequestBody(required = false) RejectUserDTO rejectDto,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            HttpServletRequest request) {
        
        java.util.UUID actorId = requireAuthenticatedUser(request, authHeader);
        String ip = getClientIp(request);
        String ua = request.getHeader("User-Agent");
        String reason = (rejectDto != null) ? rejectDto.getReason() : null;
        
        try {
            authService.rejectUser(id, reason, actorId, ip, ua);
            return ResponseEntity.ok(new ActionResponseDTO(true, "Solicitare respinsă."));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    private String resolveClientOrigin(HttpServletRequest request) {
        String customOrigin = request.getHeader("X-Origin");
        if (customOrigin != null && !customOrigin.isBlank() && !"null".equalsIgnoreCase(customOrigin.trim())) {
            return customOrigin.trim().replaceAll("/+$", "");
        }
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !"null".equalsIgnoreCase(origin.trim())) {
            return origin.trim().replaceAll("/+$", "");
        }
        String referer = request.getHeader("Referer");
        if (referer != null && !referer.isBlank()) {
            try {
                java.net.URI uri = java.net.URI.create(referer);
                if (uri.getScheme() != null && uri.getAuthority() != null) {
                    return (uri.getScheme() + "://" + uri.getAuthority()).replaceAll("/+$", "");
                }
            } catch (Exception ignored) {}
        }
        String proto = request.getHeader("X-Forwarded-Proto");
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        if (host != null && !host.isBlank()) {
            if (proto == null || proto.isBlank()) {
                proto = request.isSecure() ? "https" : "http";
            }
            return (proto + "://" + host).replaceAll("/+$", "");
        }
        return null;
    }

    private String extractToken(HttpServletRequest request, String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        if (request != null && request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("adminToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void clearAuthCookies(HttpServletResponse response) {
        if (response == null) return;
        ResponseCookie cookie = ResponseCookie.from("adminToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        ResponseCookie clearRefresh = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, clearRefresh.toString());
    }

    private String sha256(String input) {
        if (input == null) return "";
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedHash.length);
            for (byte b : encodedHash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private UUID tryValidateToken(HttpServletRequest request, String authHeader) {
        String token = extractToken(request, authHeader);
        if (token == null || token.isBlank()) {
            return null;
        }
        UUID userId = jwtService.extractUserId(token);
        if (userId == null) {
            return null;
        }
        AdminUser user = authService.getUserById(userId);
        if (user == null || user.getStatus() != com.charityapp.model.auth.AdminStatus.APPROVED) {
            return null;
        }
        Integer tokenVersion = jwtService.extractTokenVersion(token);
        if (tokenVersion != null && tokenVersion < user.getTokenVersion()) {
            return null;
        }
        if (sessionManagerService != null) {
            String tokenHash = sha256(token);
            if (!sessionManagerService.isSessionValid(tokenHash)) {
                return null;
            }
        }
        return userId;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }

    private void setAuthCookies(HttpServletRequest request, HttpServletResponse response, String accessToken, String ip, String ua) {
        UUID userId = jwtService.extractUserId(accessToken);
        String refreshToken = null;
        if (refreshTokenService != null && userId != null) {
            refreshToken = refreshTokenService.generateRefreshToken(userId, ip, ua);
        }
        setAuthCookies(request, response, accessToken, refreshToken);
    }

    private void setAuthCookies(HttpServletRequest request, HttpServletResponse response, String accessToken, String refreshToken) {
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
}

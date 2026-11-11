package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.config.AppConfigProperties;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.finance.FinanceStand;
import com.charityapp.model.general.NotificationRule;
import com.charityapp.model.hr.HrShift;
import com.charityapp.model.hr.HrShiftAssignment;
import com.charityapp.model.hr.HrStand;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.hr.HrRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WhatsAppNotificationService {
    private static final Logger log = LoggerFactory.getLogger(WhatsAppNotificationService.class);

    private final AppConfigProperties appConfigProperties;
    private final com.charityapp.config.TenantProperties tenantProperties;
    private final AdminUserRepository adminUserRepository;
    private final HrRepository hrRepository;
    private final com.charityapp.service.general.NotificationRuleService notificationRuleService;
    private final com.charityapp.repository.auth.RoleRepository roleRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${APP_FRONTEND_URL:https://charity.example.org}")
    private String frontendUrl = "https://charity.example.org";

    // Cache of shift reminder IDs sent today to prevent duplicate reminders: key = "ruleId_shiftId_memberId_date"
    private final Set<String> sentReminders = ConcurrentHashMap.newKeySet();

    public WhatsAppNotificationService(AppConfigProperties appConfigProperties,
                                       @org.springframework.context.annotation.Lazy AdminUserRepository adminUserRepository,
                                       @org.springframework.context.annotation.Lazy HrRepository hrRepository,
                                       @org.springframework.context.annotation.Lazy com.charityapp.service.general.NotificationRuleService notificationRuleService,
                                       @org.springframework.context.annotation.Lazy com.charityapp.repository.auth.RoleRepository roleRepository) {
        this(appConfigProperties, new com.charityapp.config.TenantProperties(), adminUserRepository, hrRepository, notificationRuleService, roleRepository);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public WhatsAppNotificationService(AppConfigProperties appConfigProperties,
                                       com.charityapp.config.TenantProperties tenantProperties,
                                       @org.springframework.context.annotation.Lazy AdminUserRepository adminUserRepository,
                                       @org.springframework.context.annotation.Lazy HrRepository hrRepository,
                                       @org.springframework.context.annotation.Lazy com.charityapp.service.general.NotificationRuleService notificationRuleService,
                                       @org.springframework.context.annotation.Lazy com.charityapp.repository.auth.RoleRepository roleRepository) {
        this.appConfigProperties = appConfigProperties;
        this.tenantProperties = tenantProperties != null ? tenantProperties : new com.charityapp.config.TenantProperties();
        this.adminUserRepository = adminUserRepository;
        this.hrRepository = hrRepository;
        this.notificationRuleService = notificationRuleService;
        this.roleRepository = roleRepository;
    }

    private boolean isEnabled() {
        return appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().isEnabled();
    }

    private boolean isAutoMessagesEnabled() {
        return isEnabled() && appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().isAutoMessagesEnabled();
    }

    private String getServiceUrl() {
        return (appConfigProperties != null && appConfigProperties.getWhatsapp() != null)
                ? appConfigProperties.getWhatsapp().getServiceUrl()
                : "http://localhost:3001";
    }

    private String getInternalSecret() {
        return (appConfigProperties != null && appConfigProperties.getWhatsapp() != null)
                ? appConfigProperties.getWhatsapp().getInternalSecret()
                : "app_internal_secret";
    }

    private String resolveRecipientJid(NotificationRule rule, String defaultDirectPhone, String categoryGroupJid) {
        if ("VOLUNTEER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
            "DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
            "TASK_ASSIGNEES".equalsIgnoreCase(rule.getTargetRecipientType()) ||
            "USER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType())) {
            return defaultDirectPhone;
        }
        if (rule.getCustomRecipientJid() != null && !rule.getCustomRecipientJid().isBlank()) {
            return rule.getCustomRecipientJid().trim();
        }
        if ("ADMIN_GROUP".equalsIgnoreCase(rule.getTargetRecipientType())) {
            return appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                    ? appConfigProperties.getWhatsapp().getGroup().getAdmin()
                    : null;
        }
        // Default: category group or admin fallback
        if (categoryGroupJid != null && !categoryGroupJid.isBlank()) {
            return categoryGroupJid;
        }
        return appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                ? appConfigProperties.getWhatsapp().getGroup().getAdmin()
                : null;
    }

    @Async
    public void sendMessageAsync(String recipientPhoneOrJid, String messageText) {
        if (!isEnabled() || recipientPhoneOrJid == null || recipientPhoneOrJid.isBlank() || messageText == null || messageText.isBlank()) {
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-Internal-Token", getInternalSecret());

            Map<String, String> body = Map.of(
                "to", recipientPhoneOrJid.trim(),
                "message", messageText.trim()
            );

            HttpEntity<Map<String, String>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(
                getServiceUrl() + "/send-message",
                request,
                String.class
            );

            log.info("WhatsApp sent to {} - Status: {}", recipientPhoneOrJid, response.getStatusCode());
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {}: {}", recipientPhoneOrJid, e.getMessage());
        }
    }

    public Map<String, Object> getWhatsAppStatus() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Token", getInternalSecret());
            HttpEntity<?> entity = new HttpEntity<>(headers);

            return restTemplate.exchange(
                getServiceUrl() + "/status",
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();
        } catch (Exception e) {
            log.warn("WhatsApp microservice status check failed: {}", e.getMessage());
            return Map.of("status", "DISCONNECTED", "error", e.getMessage());
        }
    }

    public Map<String, Object> getWhatsAppQr() {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Token", getInternalSecret());
            HttpEntity<?> entity = new HttpEntity<>(headers);

            return restTemplate.exchange(
                getServiceUrl() + "/qr",
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();
        } catch (Exception e) {
            log.warn("WhatsApp microservice QR request failed: {}", e.getMessage());
            return Map.of("status", "DISCONNECTED", "qr", null, "error", e.getMessage());
        }
    }

    public List<Map<String, Object>> getWhatsAppGroups() {
        if (!isEnabled()) {
            return List.of();
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Token", getInternalSecret());
            HttpEntity<?> entity = new HttpEntity<>(headers);

            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                getServiceUrl() + "/groups",
                HttpMethod.GET,
                entity,
                new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            return response.getBody() != null ? response.getBody() : List.of();
        } catch (Exception e) {
            log.warn("Failed to fetch WhatsApp groups: {}", e.getMessage());
            return List.of();
        }
    }

    public List<Map<String, String>> getAvailableRoles() {
        if (roleRepository != null) {
            try {
                List<com.charityapp.model.auth.Role> roles = roleRepository.findAll();
                if (roles != null && !roles.isEmpty()) {
                    return roles.stream()
                            .filter(r -> r.getName() != null && !r.getName().isBlank() && !"SUPER_ADMIN".equalsIgnoreCase(r.getName()))
                            .map(r -> Map.of(
                                    "id", r.getName(),
                                    "label", r.getName()
                            ))
                            .toList();
                }
            } catch (Exception e) {
                log.warn("Failed to fetch dynamic roles from database: {}", e.getMessage());
            }
        }
        return List.of(
                Map.of("id", "ADMIN", "label", "Admin"),
                Map.of("id", "VOLUNTEER", "label", "Voluntar")
        );
    }

    public List<Map<String, Object>> getIncompleteStands() {
        if (hrRepository == null) return List.of();
        try {
            List<HrStand> all = hrRepository.findAllStands();
            return all.stream()
                    .filter(s -> !"COMPLETED".equalsIgnoreCase(s.getStatus()) && !"CANCELLED".equalsIgnoreCase(s.getStatus()))
                    .map(s -> {
                        int volCount = 0;
                        if (s.getShifts() != null) {
                            for (HrShift shift : s.getShifts()) {
                                if (shift.getAssignments() != null) {
                                    volCount += shift.getAssignments().size();
                                }
                            }
                        }
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", s.getId().toString());
                        map.put("locationName", s.getLocationName() != null ? s.getLocationName() : "");
                        map.put("eventName", s.getEventName() != null ? s.getEventName() : "");
                        map.put("eventDate", s.getEventDate() != null ? s.getEventDate().toString() : "");
                        map.put("status", s.getStatus() != null ? s.getStatus() : "PLANNED");
                        map.put("volunteersCount", volCount);
                        return map;
                    })
                    .toList();
        } catch (Exception e) {
            log.warn("Failed to fetch incomplete stands for WhatsApp: {}", e.getMessage());
            return List.of();
        }
    }

    public void sendManualNotification(String targetAudience, String targetValue, String directPhone, String messageText) {
        if (messageText == null || messageText.isBlank()) return;

        String audience = (targetAudience != null && !targetAudience.isBlank()) ? targetAudience.trim().toUpperCase() : "DIRECT";
        String val = (targetValue != null && !targetValue.isBlank()) ? targetValue.trim() : directPhone;

        if ("DIRECT".equals(audience) || "DIRECT_PHONE".equals(audience)) {
            if (val != null && !val.isBlank()) {
                sendMessageAsync(val, messageText);
            }
        } else if ("WHATSAPP_GROUP".equals(audience) || "GROUP".equals(audience)) {
            if (val != null && !val.isBlank()) {
                sendMessageAsync(val, messageText);
            }
        } else if ("SPECIFIC_USER".equals(audience) || "USER_DIRECT".equals(audience)) {
            if (val != null && !val.isBlank() && adminUserRepository != null) {
                try {
                    UUID uid = UUID.fromString(val);
                    adminUserRepository.findById(uid).ifPresent(u -> {
                        if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                            sendMessageAsync(u.getPhone(), messageText);
                        }
                    });
                } catch (Exception e) {
                    log.warn("Invalid userId for WhatsApp manual send: {}", val);
                }
            }
        } else if ("ALL_USERS".equals(audience) || "ALL".equals(audience)) {
            if (adminUserRepository != null) {
                List<AdminUser> all = adminUserRepository.findAll();
                for (AdminUser u : all) {
                    if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                        sendMessageAsync(u.getPhone(), messageText);
                    }
                }
            }
        } else if ("SPECIFIC_ROLE".equals(audience) || "ROLE".equals(audience)) {
            if (val != null && !val.isBlank() && adminUserRepository != null) {
                String roleStr = val.toUpperCase();
                List<AdminUser> all = adminUserRepository.findAll();
                for (AdminUser u : all) {
                    boolean matches = u.hasRole(roleStr);
                    if (matches && u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                        sendMessageAsync(u.getPhone(), messageText);
                    }
                }
            }
        } else if ("SPECIFIC_STAND".equals(audience) || "STAND".equals(audience)) {
            if (val != null && !val.isBlank() && hrRepository != null && adminUserRepository != null) {
                try {
                    HrStand stand = hrRepository.findStandById(val);
                    if (stand != null && stand.getShifts() != null) {
                        Set<UUID> uids = new HashSet<>();
                        Set<String> emails = new HashSet<>();
                        for (HrShift shift : stand.getShifts()) {
                            if (shift.getAssignments() != null) {
                                for (HrShiftAssignment sa : shift.getAssignments()) {
                                    if (sa.getMemberId() != null) {
                                        uids.add(sa.getMemberId());
                                    }
                                    if (sa.getMemberEmail() != null && !sa.getMemberEmail().isBlank()) {
                                        emails.add(sa.getMemberEmail().trim().toLowerCase());
                                    }
                                }
                            }
                        }
                        Set<String> phonesToSend = new HashSet<>();
                        for (UUID uid : uids) {
                            adminUserRepository.findById(uid).ifPresent(u -> {
                                if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                                    phonesToSend.add(u.getPhone().trim());
                                }
                            });
                        }
                        if (!emails.isEmpty()) {
                            List<AdminUser> all = adminUserRepository.findAll();
                            for (AdminUser u : all) {
                                if (u.getEmail() != null && emails.contains(u.getEmail().trim().toLowerCase())) {
                                    if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                                        phonesToSend.add(u.getPhone().trim());
                                    }
                                }
                            }
                        }
                        for (String phone : phonesToSend) {
                            sendMessageAsync(phone, messageText);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Error finding stand members for WhatsApp manual send: {}", e.getMessage());
                }
            }
        }
    }

    // ==========================================
    // 3.0. Volunteer Welcome (Registration)
    // ==========================================
    public void sendVolunteerWelcomeNotification(AdminUser user) {
        if (!isAutoMessagesEnabled() || user == null || !user.isWhatsappNotificationsEnabled() || user.getPhone() == null || user.getPhone().isBlank()) {
            return;
        }

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "VOLUNTEER_WELCOME")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        String firstName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName().trim().split("\\s+")[0]
                : "Voluntar";
        String fullName = user.getFullName() != null ? user.getFullName().trim() : "Voluntar";

        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://charity.example.org";
        String loginUrl = base + "/login";

        Map<String, String> values = Map.of(
            "firstName", firstName,
            "fullName", fullName,
            "loginUrl", loginUrl
        );

        String orgName = (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getName()
                : "Platform";

        String defaultMsg = String.format(
            "*🎉 Bun venit - %s*\n\nBună, %s! Îți mulțumim pentru implicare și pentru înregistrarea pe platformă.\nLink acces:\n%s",
            orgName, firstName, loginUrl
        );

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            String recipient = resolveRecipientJid(rule, user.getPhone(), null);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }

    // ==========================================
    // 3.1. User Approval (Volunteer Onboarding)
    // ==========================================
    public void sendVolunteerApprovalNotification(AdminUser user) {
        if (!isAutoMessagesEnabled() || user == null || !user.isWhatsappNotificationsEnabled() || user.getPhone() == null || user.getPhone().isBlank()) {
            return;
        }

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "VOLUNTEER_APPROVAL")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        String firstName = user.getFullName() != null && !user.getFullName().isBlank()
                ? user.getFullName().trim().split("\\s+")[0]
                : "Voluntar";
        String fullName = user.getFullName() != null ? user.getFullName().trim() : "Voluntar";

        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://charity.example.org";
        String loginUrl = base + "/login";

        Map<String, String> values = Map.of(
            "firstName", firstName,
            "fullName", fullName,
            "loginUrl", loginUrl
        );

        String orgName = (tenantProperties != null && tenantProperties.getIdentity() != null)
                ? tenantProperties.getIdentity().getName()
                : "Causeway";

        String defaultMsg = String.format(
            "*🎉 Cont Aprobat - %s*\n\nBună, %s! Contul tău de voluntar a fost aprobat și activat.\nTe poți autentifica pe platformă:\n%s",
            orgName, firstName, loginUrl
        );

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            String recipient = resolveRecipientJid(rule, user.getPhone(), null);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }


    // =========================================================
    // 3.2. Stand End-of-Day (EoD) Double-Completion Alert
    // =========================================================
    public void sendStandEoDDoubleCompletionAlert(FinanceStand stand) {
        if (!isAutoMessagesEnabled() || stand == null) return;

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "FINANCE_EOD_COMPLETION")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        String standName = stand.getStandLocation() != null ? stand.getStandLocation() : "Stand";
        String dateStr = stand.getEventDate() != null ? stand.getEventDate().toString() : LocalDate.now(com.charityapp.service.general.TaskNotificationService.ZONE_RO).toString();
        String cashTotal = stand.getCashCollected() != null ? stand.getCashCollected().toPlainString() : "0.00";
        String posTotal = stand.getPosCardCollected() != null ? stand.getPosCardCollected().toPlainString() : "0.00";
        String grandTotal = stand.getTotalCollected() != null ? stand.getTotalCollected().toPlainString() : "0.00";

        Map<String, String> values = Map.of(
            "standName", standName,
            "date", dateStr,
            "cashTotal", cashTotal,
            "posTotal", posTotal,
            "grandTotal", grandTotal
        );

        String defaultMsg = String.format(
            "*📊 Încheiere Zi Stand (EoD):* %s\n*Data:* %s\n*Numerar:* %s RON\n*POS / Card:* %s RON\n*Total:* %s RON",
            standName, dateStr, cashTotal, posTotal, grandTotal
        );

        String financeGroup = appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                ? appConfigProperties.getWhatsapp().getGroup().getFinance()
                : null;

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            String recipient = resolveRecipientJid(rule, null, financeGroup);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }

    // ==========================================
    // 3.3. Logistics Low-Stock Alert
    // ==========================================
    public void sendLogisticsLowStockAlert(String itemName, int currentQuantity, int minThreshold, String unit, String locationOrStand) {
        if (!isAutoMessagesEnabled()) return;

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "LOGISTICS_LOW_STOCK")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        String unitStr = (unit != null && !unit.isBlank()) ? unit : "buc";
        String locationStr = (locationOrStand != null && !locationOrStand.isBlank()) ? locationOrStand : "Depozit / Stand";

        Map<String, String> values = Map.of(
            "itemName", itemName != null ? itemName : "Articol",
            "currentQuantity", String.valueOf(currentQuantity),
            "minThreshold", String.valueOf(minThreshold),
            "unit", unitStr,
            "location", locationStr
        );

        String defaultMsg = String.format(
            "*⚠️ Alertă Stoc Redus:* %s\n*Cantitate rămasă:* %d %s\n*Prag minim:* %d %s\n*Locație:* %s",
            (itemName != null ? itemName : "Articol"), currentQuantity, unitStr, minThreshold, unitStr, locationStr
        );

        String logisticsGroup = appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                ? appConfigProperties.getWhatsapp().getGroup().getLogistics()
                : null;

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            if (rule.getMinCapacityThreshold() != null && currentQuantity > rule.getMinCapacityThreshold()) {
                continue;
            }

            String recipient = resolveRecipientJid(rule, null, logisticsGroup);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }

    // ==========================================
    // 3.4. Logistics Stand EoD Completion Alert
    // ==========================================
    public void sendLogisticsEoDCompletionAlert(String standName, String closingPersonName, String notes, int mugsCount) {
        if (!isAutoMessagesEnabled()) return;

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "LOGISTICS_EOD_COMPLETION")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        String stand = standName != null && !standName.isBlank() ? standName : "Stand";
        String person = closingPersonName != null && !closingPersonName.isBlank() ? closingPersonName : "Responsabil";
        String noteStr = notes != null ? notes : "";
        String dateStr = LocalDate.now(com.charityapp.service.general.TaskNotificationService.ZONE_RO).toString();

        Map<String, String> values = Map.of(
            "standName", stand,
            "closingPersonName", person,
            "date", dateStr,
            "notes", noteStr,
            "mugsCount", String.valueOf(mugsCount)
        );

        String defaultMsg = String.format(
            "*📦 Raport Logistică EoD:* %s\n*Responsabil:* %s\n*Data:* %s\n*Căni rămase:* %d%s",
            stand, person, dateStr, mugsCount, (noteStr.isBlank() ? "" : "\n*Note:* " + noteStr)
        );

        String logisticsGroup = appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                ? appConfigProperties.getWhatsapp().getGroup().getLogistics()
                : null;

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            String recipient = resolveRecipientJid(rule, null, logisticsGroup);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }

    // ==========================================
    // 3.4. HR Low Volunteer Capacity Alert
    // ==========================================
    public void sendHrLowVolunteerCapacityAlert(String shiftName, String shiftDate, String startTime, String endTime,
                                              int confirmedCount, int requiredCount, String standName) {
        if (!isAutoMessagesEnabled()) return;

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "HR_VOLUNTEER_DEFICIT")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        int deficit = Math.max(0, requiredCount - confirmedCount);

        Map<String, String> values = Map.of(
            "shiftName", shiftName != null ? shiftName : "Tura Stand",
            "date", shiftDate != null ? shiftDate : LocalDate.now(com.charityapp.service.general.TaskNotificationService.ZONE_RO).toString(),
            "startTime", startTime != null ? startTime : "00:00",
            "endTime", endTime != null ? endTime : "00:00",
            "confirmedCount", String.valueOf(confirmedCount),
            "requiredCount", String.valueOf(requiredCount),
            "standName", standName != null ? standName : "Stand",
            "deficit", String.valueOf(deficit)
        );

        String defaultMsg = String.format(
            "*👥 Alertă Deficit Voluntari:* %s\n*Tură:* %s (%s, %s - %s)\n*Confirmați:* %d / %d (Lipsă: %d)",
            (standName != null ? standName : "Stand"), (shiftName != null ? shiftName : "Tură"),
            (shiftDate != null ? shiftDate : ""), (startTime != null ? startTime : ""), (endTime != null ? endTime : ""),
            confirmedCount, requiredCount, deficit
        );

        String hrGroup = appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                ? appConfigProperties.getWhatsapp().getGroup().getHr()
                : null;

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            if (rule.getMinCapacityThreshold() != null && deficit < rule.getMinCapacityThreshold()) {
                continue;
            }

            String recipient = resolveRecipientJid(rule, null, hrGroup);
            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) continue;

            String msg = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                    : defaultMsg;
            sendMessageAsync(recipient, msg);
            sentRecipients.add(recipient);
        }
    }

    // ==========================================
    // 3.5. Opt-in Task & Shift Reminders (Cron)
    // ==========================================
    @Scheduled(fixedRate = 1800000) // Every 30 minutes
    public void triggerUpcomingShiftReminders() {
        if (!isAutoMessagesEnabled() || hrRepository == null || adminUserRepository == null) {
            return;
        }

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "HR_SHIFT_REMINDER")
                : List.of();

        if (rules.isEmpty()) {
            return;
        }

        try {
            LocalDate today = LocalDate.now(com.charityapp.service.general.TaskNotificationService.ZONE_RO);
            LocalTime now = LocalTime.now(com.charityapp.service.general.TaskNotificationService.ZONE_RO);

            List<HrStand> allStands = hrRepository.findAllStands();

            int timingMinutes = rules.get(0).getTriggerTimingMinutes() > 0 ? rules.get(0).getTriggerTimingMinutes() : 120;
            LocalTime targetTime = now.plusMinutes(timingMinutes);
            LocalTime windowStart = targetTime.minusMinutes(30);
            LocalTime windowEnd = targetTime.plusMinutes(30);

            for (HrStand stand : allStands) {
                if (!today.equals(stand.getEventDate()) || stand.getShifts() == null) {
                    continue;
                }

                for (HrShift shift : stand.getShifts()) {
                    if (shift.getStartTime() == null || shift.getStartTime().isBlank()) {
                        continue;
                    }

                    try {
                        String st = shift.getStartTime().trim();
                        if (st.length() == 4 && st.charAt(1) == ':') st = "0" + st;
                        if (st.length() == 5) st += ":00";
                        LocalTime shiftStart = LocalTime.parse(st);

                        if (shiftStart.isAfter(windowStart) && shiftStart.isBefore(windowEnd)) {
                            if (shift.getAssignments() != null) {
                                for (HrShiftAssignment assignment : shift.getAssignments()) {
                                    if (!"CONFIRMED".equalsIgnoreCase(assignment.getAssignmentStatus()) &&
                                        !"ASSIGNED".equalsIgnoreCase(assignment.getAssignmentStatus())) {
                                        continue;
                                    }

                                    String reminderKey = rules.get(0).getId().toString() + "_" + shift.getId() + "_" + assignment.getMemberId() + "_" + today;
                                    if (sentReminders.contains(reminderKey)) {
                                        continue;
                                    }

                                    // Find user phone
                                    Optional<AdminUser> userOpt = adminUserRepository.findById(assignment.getMemberId());
                                    if (userOpt.isPresent()) {
                                        AdminUser user = userOpt.get();
                                        if (!user.isWhatsappNotificationsEnabled()) {
                                            continue;
                                        }
                                        String userPhone = user.getPhone();
                                        if (userPhone == null || userPhone.isBlank()) {
                                            continue;
                                        }

                                        String firstName = user.getFullName() != null ? user.getFullName().split("\\s+")[0] : "Voluntar";
                                        String fullName = user.getFullName() != null ? user.getFullName().trim() : "Voluntar";
                                        String roleTitle = assignment.getRoleName() != null ? assignment.getRoleName() : "Voluntar";
                                        String shiftTitle = shift.getShiftName() != null && !shift.getShiftName().isBlank() ? shift.getShiftName() : "Tură";

                                        String base = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.replaceAll("/+$", "") : "https://charity.example.org";
                                        String standIdStr = stand.getId() != null ? stand.getId().toString() : "";
                                        String shortId = standIdStr.contains("-") ? standIdStr.split("-")[0] : standIdStr;
                                        String standUrl = !shortId.isBlank() ? base + "/s/" + shortId : base;

                                        Map<String, String> values = Map.of(
                                            "firstName", firstName,
                                            "fullName", fullName,
                                            "shiftName", shiftTitle,
                                            "startTime", shift.getStartTime(),
                                            "endTime", shift.getEndTime() != null ? shift.getEndTime() : "",
                                            "standName", stand.getLocationName() != null ? stand.getLocationName() : "Stand",
                                            "roleName", roleTitle,
                                            "standUrl", standUrl,
                                            "date", today.toString()
                                        );

                                        String defaultReminderMsg = String.format(
                                            "*⏰ Memento Tură:* %s\nBună, %s! Tura ta la *%s* începe la ora *%s*.\n*Rol:* %s\n*Detalii stand:* %s",
                                            shiftTitle, firstName, (stand.getLocationName() != null ? stand.getLocationName() : "Stand"),
                                            shift.getStartTime(), roleTitle, standUrl
                                        );

                                        for (NotificationRule rule : rules) {
                                            String recipient = resolveRecipientJid(rule, userPhone, null);
                                            if (recipient != null && !recipient.isBlank()) {
                                                String msg = notificationRuleService != null
                                                        ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultReminderMsg)
                                                        : defaultReminderMsg;
                                                sendMessageAsync(recipient, msg);
                                                sentReminders.add(reminderKey);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (Exception parseEx) {
                        log.debug("Skipping shift time parsing for shift {}: {}", shift.getId(), parseEx.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error in triggerUpcomingShiftReminders: {}", e.getMessage());
        }
    }

    // ==========================================
    // 3.6. Task Notifications & Priority Reminders
    // ==========================================
    public void sendTaskAssignedNotification(com.charityapp.model.general.GeneralTask task) {
        sendTaskNotification(task, null, false, 0, 0);
    }

    public void sendTaskNotification(com.charityapp.model.general.GeneralTask task,
                                     String directPhone,
                                     boolean isReminder,
                                     int reminderIndex,
                                     int totalReminders) {
        if (!isAutoMessagesEnabled() || task == null) {
            log.info("sendTaskNotification skipped: isAutoMessagesEnabled={}, taskIsNull={}", isAutoMessagesEnabled(), (task == null));
            return;
        }

        List<NotificationRule> rules = new ArrayList<>();
        if (notificationRuleService != null) {
            List<NotificationRule> chanRules = notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("WHATSAPP", "TASK_ASSIGNED");
            if (chanRules != null && !chanRules.isEmpty()) {
                rules.addAll(chanRules);
            }
        }

        if (rules.isEmpty()) {
            return;
        }

        String title = task.getTitle() != null ? task.getTitle() : "Sarcină";
        String priority = task.getPriority() != null ? task.getPriority() : "medie";
        String deadline;
        if (task.getStartDate() != null && !task.getStartDate().isBlank() && task.getDueDate() != null && !task.getDueDate().isBlank()) {
            if (task.getStartDate().trim().equals(task.getDueDate().trim())) {
                deadline = task.getDueDate().trim();
            } else {
                deadline = task.getStartDate().trim() + " - " + task.getDueDate().trim();
            }
        } else if (task.getDueDate() != null && !task.getDueDate().isBlank()) {
            deadline = task.getDueDate().trim();
        } else {
            deadline = "Fără termen";
        }
        String description = task.getDescription() != null ? task.getDescription() : "";
        String assignee = task.getAssignee() != null ? task.getAssignee() : "Neasignat";
        String department = task.getDepartment() != null ? task.getDepartment() : "General";

        Map<String, String> values = Map.of(
            "title", title,
            "priority", priority,
            "deadline", deadline,
            "description", description,
            "assignee", assignee,
            "department", department,
            "reminderIndex", String.valueOf(reminderIndex),
            "totalReminders", String.valueOf(totalReminders)
        );

        String defaultMsg;
        if (isReminder) {
            defaultMsg = String.format(
                "*⏰ Memento Sarcină (%d/%d):* %s\n*Prioritate:* %s\n*Termen:* %s\n*Asignat:* %s\n*Departament:* %s%s",
                reminderIndex, totalReminders, title, priority, deadline, assignee, department,
                (description.isBlank() ? "" : "\n\n" + description)
            );
        } else {
            defaultMsg = String.format(
                "*📋 Sarcină Nouă:* %s\n*Prioritate:* %s\n*Termen:* %s\n*Asignat:* %s\n*Departament:* %s%s",
                title, priority, deadline, assignee, department,
                (description.isBlank() ? "" : "\n\n" + description)
            );
        }

        // Direct phone target if provided: send directly
        if (directPhone != null && !directPhone.isBlank()) {
            String cleanPhone = directPhone.trim();
            for (NotificationRule rule : rules) {
                boolean isDirect = "VOLUNTEER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                                   "DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                                   "TASK_ASSIGNEES".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                                   "USER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType());
                if (isDirect) {
                    String msg = notificationRuleService != null
                            ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                            : defaultMsg;
                    sendMessageAsync(cleanPhone, msg);
                    break;
                }
            }
            return;
        }

        // Otherwise resolve all assigned phones or group target
        Set<String> recipientPhones = new HashSet<>();
        if (adminUserRepository != null) {
            // Check assigneeIds first
            if (task.getAssigneeIds() != null && !task.getAssigneeIds().isBlank()) {
                String[] idTokens = task.getAssigneeIds().replace("[", "").replace("]", "").replace("\"", "").split(",");
                for (String token : idTokens) {
                    String trimmed = token.trim();
                    if (!trimmed.isEmpty()) {
                        try {
                            UUID uid = UUID.fromString(trimmed);
                            adminUserRepository.findById(uid).ifPresent(u -> {
                                if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                                    recipientPhones.add(u.getPhone().trim());
                                }
                            });
                        } catch (Exception ignored) {}
                    }
                }
            }

            // Fallback: look up by assignee name matching
            if (recipientPhones.isEmpty() && task.getAssignee() != null && !task.getAssignee().isBlank()) {
                String[] nameTokens = task.getAssignee().split(",");
                for (String name : nameTokens) {
                    String trimmedName = name.trim();
                    if (!trimmedName.isEmpty() && !trimmedName.equalsIgnoreCase("Unassigned") && !trimmedName.equalsIgnoreCase("Neasignat")) {
                        adminUserRepository.findByFullName(trimmedName).ifPresentOrElse(
                            u -> {
                                if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                                    recipientPhones.add(u.getPhone().trim());
                                }
                            },
                            () -> {
                                try {
                                    adminUserRepository.findAll().stream()
                                        .filter(u -> u.getFullName() != null && u.getFullName().trim().equalsIgnoreCase(trimmedName))
                                        .findFirst()
                                        .ifPresent(u -> {
                                            if (u.isWhatsappNotificationsEnabled() && u.getPhone() != null && !u.getPhone().isBlank()) {
                                                recipientPhones.add(u.getPhone().trim());
                                            }
                                        });
                                } catch (Exception ignored) {}
                            }
                        );
                    }
                }
            }
        }

        Set<String> sentRecipients = new HashSet<>();
        for (NotificationRule rule : rules) {
            boolean isDirect = "VOLUNTEER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                               "DIRECT".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                               "TASK_ASSIGNEES".equalsIgnoreCase(rule.getTargetRecipientType()) ||
                               "USER_DIRECT".equalsIgnoreCase(rule.getTargetRecipientType());
            if (isDirect) {
                for (String phone : recipientPhones) {
                    String recipient = resolveRecipientJid(rule, phone, null);
                    if (recipient != null && !recipient.isBlank() && !sentRecipients.contains(recipient)) {
                        String msg = notificationRuleService != null
                                ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                                : defaultMsg;
                        sendMessageAsync(recipient, msg);
                        sentRecipients.add(recipient);
                    }
                }
            } else {
                String recipient = resolveRecipientJid(rule, null, null);
                if (recipient != null && !recipient.isBlank() && !sentRecipients.contains(recipient)) {
                    String msg = notificationRuleService != null
                            ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultMsg)
                            : defaultMsg;
                    sendMessageAsync(recipient, msg);
                    sentRecipients.add(recipient);
                }
            }
        }
    }

    // ==========================================
    // 7. Group Member Join Trigger
    // ==========================================
    public void handleGroupParticipantJoined(String groupJid, String groupSubject, String participantJid) {
        if (!isAutoMessagesEnabled() || groupJid == null || groupJid.isBlank() || participantJid == null || participantJid.isBlank()) {
            return;
        }

        List<NotificationRule> rules = notificationRuleService != null
                ? notificationRuleService.findAllActiveByRuleType("GROUP_MEMBER_JOIN")
                : List.of();

        // Strict adherence to Rule 4: zero default notifications if no active rule configured
        if (rules.isEmpty()) {
            return;
        }

        // Clean participant phone: remove '@s.whatsapp.net', '+', whitespace
        String cleanPhone = participantJid.split("@")[0].replaceAll("[^0-9]", "");

        // Try to identify user in database by phone
        String resolvedFullName = null;
        String resolvedFirstName = null;
        if (adminUserRepository != null && !cleanPhone.isBlank()) {
            try {
                Optional<AdminUser> match = adminUserRepository.findAll().stream()
                        .filter(u -> u.getPhone() != null && u.getPhone().replaceAll("[^0-9]", "").endsWith(cleanPhone.length() >= 9 ? cleanPhone.substring(cleanPhone.length() - 9) : cleanPhone))
                        .findFirst();
                if (match.isPresent()) {
                    resolvedFullName = match.get().getFullName();
                    if (resolvedFullName != null && !resolvedFullName.isBlank()) {
                        resolvedFirstName = resolvedFullName.trim().split("\\s+")[0];
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to lookup user by phone {}: {}", cleanPhone, e.getMessage());
            }
        }

        String finalFullName = resolvedFullName != null && !resolvedFullName.isBlank() ? resolvedFullName.trim() : (cleanPhone.isBlank() ? "Membru Nou" : cleanPhone);
        String finalFirstName = resolvedFirstName != null && !resolvedFirstName.isBlank() ? resolvedFirstName.trim() : finalFullName;
        String finalGroupName = (groupSubject != null && !groupSubject.isBlank()) ? groupSubject.trim() : "Grup WhatsApp";
        String dateStr = LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"));
        String timeStr = LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));

        Map<String, String> values = Map.of(
                "groupName", finalGroupName,
                "participantPhone", cleanPhone,
                "userName", finalFullName,
                "firstName", finalFirstName,
                "fullName", finalFullName,
                "date", dateStr,
                "time", timeStr
        );

        Set<String> sentRecipients = new HashSet<>();

        for (NotificationRule rule : rules) {
            // Source group filtering: if rule specifies a source group, it must match event groupJid
            if (rule.getSourceGroupJid() != null && !rule.getSourceGroupJid().isBlank() && !"ALL".equalsIgnoreCase(rule.getSourceGroupJid().trim())) {
                if (!rule.getSourceGroupJid().trim().equalsIgnoreCase(groupJid.trim())) {
                    continue;
                }
            }

            // Target recipient resolution
            String recipient = null;
            String targetType = rule.getTargetRecipientType() != null ? rule.getTargetRecipientType().trim().toUpperCase() : "TRIGGER_GROUP";

            if ("TRIGGER_GROUP".equals(targetType) || "GROUP".equals(targetType)) {
                recipient = groupJid;
            } else if ("JOINED_USER_DIRECT".equals(targetType) || "VOLUNTEER_DIRECT".equals(targetType) || "DIRECT".equals(targetType) || "USER_DIRECT".equals(targetType)) {
                recipient = participantJid;
            } else if ("COORDINATOR_GROUP".equals(targetType)) {
                recipient = resolveRecipientJid(rule, null, null);
            } else if ("ADMIN_GROUP".equals(targetType)) {
                recipient = appConfigProperties != null && appConfigProperties.getWhatsapp() != null && appConfigProperties.getWhatsapp().getGroup() != null
                        ? appConfigProperties.getWhatsapp().getGroup().getAdmin()
                        : null;
            } else {
                recipient = resolveRecipientJid(rule, participantJid, null);
            }

            if (recipient == null || recipient.isBlank() || sentRecipients.contains(recipient)) {
                continue;
            }

            // Deduplication / Cooldown check: key = "ruleId_groupJid_participantPhone"
            String dedupeKey = rule.getId() + "_" + groupJid + "_" + cleanPhone;
            if (sentReminders.contains(dedupeKey)) {
                continue;
            }

            if (notificationRuleService != null) {
                Optional<String> rendered = notificationRuleService.renderRandomTemplate(rule, values);
                if (rendered.isPresent()) {
                    sendMessageAsync(recipient, rendered.get());
                    sentRecipients.add(recipient);
                    sentReminders.add(dedupeKey);
                }
            }
        }
    }
}

package com.charityapp.service.notification;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.notification.TriggerMetadataDTO;
import com.charityapp.model.auth.AdminRole;
import com.charityapp.model.auth.AdminUser;
import com.charityapp.model.notification.UserPwaSubscription;
import com.charityapp.model.hr.HrShift;
import com.charityapp.model.hr.HrShiftAssignment;
import com.charityapp.model.hr.HrStand;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.notification.UserPwaSubscriptionRepository;
import com.charityapp.repository.hr.HrRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PwaNotificationService {

    private static final Logger log = LoggerFactory.getLogger(PwaNotificationService.class);

    @Value("${app.vapid.public-key:BN8a2kOQh8e4v_mock_vapid_public_key_for_notifications}")
    private String vapidPublicKey;

    @Value("${app.vapid.private-key:}")
    private String vapidPrivateKey;

    @Value("${app.vapid.subject:mailto:admin@example.org}")
    private String vapidSubject;

    private final UserPwaSubscriptionRepository subscriptionRepository;
    private final AdminUserRepository adminUserRepository;
    private final HrRepository hrRepository;
    private final com.charityapp.repository.auth.RoleRepository roleRepository;
    
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.general.NotificationRuleService notificationRuleService;

    // Fallback in-memory map for subscriptions without DB id or transient devices
    private final Map<String, Map<String, Object>> inMemorySubscriptions = new ConcurrentHashMap<>();

    public PwaNotificationService(UserPwaSubscriptionRepository subscriptionRepository,
                                  AdminUserRepository adminUserRepository,
                                  HrRepository hrRepository,
                                  @org.springframework.context.annotation.Lazy com.charityapp.repository.auth.RoleRepository roleRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.adminUserRepository = adminUserRepository;
        this.hrRepository = hrRepository;
        this.roleRepository = roleRepository;
        // Register BouncyCastle JCE provider once at construction time (required by web-push lib)
        org.bouncycastle.jce.provider.BouncyCastleProvider bcProvider =
                new org.bouncycastle.jce.provider.BouncyCastleProvider();
        if (java.security.Security.getProvider(bcProvider.getName()) == null) {
            java.security.Security.addProvider(bcProvider);
        }
    }

    public Map<String, Object> getStatus() {
        int dbCount = 0;
        try {
            dbCount = subscriptionRepository.countActiveSubscriptions();
        } catch (Exception e) {
            log.warn("Could not query DB subscriber count: {}", e.getMessage());
        }
        int activeCount = Math.max(dbCount, inMemorySubscriptions.size());

        return Map.of(
                "status", "ACTIVE",
                "activeSubscribersCount", activeCount,
                "vapidPublicKey", vapidPublicKey != null ? vapidPublicKey : ""
        );
    }

    public void registerSubscription(UUID userId, Map<String, Object> subscription, String userAgent) {
        if (subscription == null || !subscription.containsKey("endpoint")) return;

        String endpoint = String.valueOf(subscription.get("endpoint"));
        if (endpoint == null || endpoint.isBlank()) return;

        inMemorySubscriptions.put(endpoint, subscription);

        String p256dh = null;
        String auth = null;
        Object keysObj = subscription.get("keys");
        if (keysObj instanceof Map<?, ?> keysMap) {
            if (keysMap.get("p256dh") != null) p256dh = String.valueOf(keysMap.get("p256dh"));
            if (keysMap.get("auth") != null) auth = String.valueOf(keysMap.get("auth"));
        }

        if (userId != null) {
            try {
                UserPwaSubscription sub = new UserPwaSubscription(userId, endpoint, p256dh, auth, userAgent);
                subscriptionRepository.save(sub);
                log.info("PWA subscription registered in DB for userId={}: endpoint={}", userId, endpoint);
            } catch (Exception e) {
                log.warn("Failed to persist PWA subscription to DB: {}", e.getMessage());
            }
        } else {
            log.info("PWA subscription registered in memory: endpoint={}", endpoint);
        }
    }

    public void unregisterSubscription(String endpoint) {
        if (endpoint != null) {
            inMemorySubscriptions.remove(endpoint);
            try {
                subscriptionRepository.deleteByEndpoint(endpoint);
            } catch (Exception e) {
                log.warn("Failed to delete PWA subscription from DB: {}", e.getMessage());
            }
            log.info("PWA subscription unregistered: {}", endpoint);
        }
    }

    public List<TriggerMetadataDTO> getTriggerCatalog() {
        return List.of(
                new TriggerMetadataDTO(
                        "PWA_SHIFT_REMINDER",
                        "HR",
                        "Reminder Automat Tură Voluntar",
                        "Trimite notificare push voluntarilor programați înainte de începerea turei.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenumele voluntarului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Numele complet al voluntarului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{shiftName}", "Numele turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{startTime}", "Ora de început a turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{endTime}", "Ora de final a turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Locația sau standul turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{roleName}", "Rolul atribuit"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data turei")
                        ),
                        true,
                        false,
                        "SPECIFIC_USER",
                        List.of("SPECIFIC_USER", "SPECIFIC_STAND"),
                        List.of(),
                        120,
                        0,
                        120
                ),
                new TriggerMetadataDTO(
                        "PWA_VOLUNTEER_DEFICIT",
                        "HR",
                        "Alertă Deficit Voluntari Stand",
                        "Alertează coordonatorii când o tură viitoare are deficit de voluntari.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{shiftName}", "Numele turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{startTime}", "Ora de început"),
                                new TriggerMetadataDTO.PlaceholderInfo("{endTime}", "Ora de final"),
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Nume stand"),
                                new TriggerMetadataDTO.PlaceholderInfo("{deficit}", "Număr voluntari lipsă")
                        ),
                        true,
                        true,
                        "SPECIFIC_ROLE",
                        List.of("SPECIFIC_ROLE", "SPECIFIC_STAND", "ALL_USERS"),
                        List.of(),
                        1440,
                        1,
                        60
                ),
                new TriggerMetadataDTO(
                        "PWA_VOLUNTEER_APPROVAL",
                        "HR",
                        "Notificare Aprobare Cont Voluntar",
                        "Notificare trimisă când contul este validat și activat.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenume voluntar"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Nume complet"),
                                new TriggerMetadataDTO.PlaceholderInfo("{loginUrl}", "Link autentificare")
                        ),
                        false,
                        false,
                        "SPECIFIC_USER",
                        List.of("SPECIFIC_USER"),
                        List.of(),
                        0,
                        0,
                        0
                ),
                new TriggerMetadataDTO(
                        "PWA_VOLUNTEER_WELCOME",
                        "HR",
                        "Mesaj de Bun Venit Voluntar",
                        "Push notification informativ de bun venit expediat după înregistrare.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenume utilizator"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Nume complet"),
                                new TriggerMetadataDTO.PlaceholderInfo("{loginUrl}", "Link platformă")
                        ),
                        false,
                        false,
                        "SPECIFIC_USER",
                        List.of("SPECIFIC_USER"),
                        List.of(),
                        0,
                        0,
                        0
                ),
                new TriggerMetadataDTO(
                        "PWA_LOGISTICS_LOW_STOCK",
                        "LOGISTICS",
                        "Alertă Stoc Redus Logistică",
                        "Alertează coordonatorii când stocul scade sub pragul minim.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{itemName}", "Nume articol"),
                                new TriggerMetadataDTO.PlaceholderInfo("{currentQuantity}", "Cantitate rămasă"),
                                new TriggerMetadataDTO.PlaceholderInfo("{minThreshold}", "Prag minim"),
                                new TriggerMetadataDTO.PlaceholderInfo("{location}", "Locație / Stand")
                        ),
                        false,
                        true,
                        "SPECIFIC_ROLE",
                        List.of("SPECIFIC_ROLE", "SPECIFIC_STAND"),
                        List.of(),
                        0,
                        1,
                        60
                ),
                new TriggerMetadataDTO(
                        "PWA_LOGISTICS_EOD",
                        "LOGISTICS",
                        "Notificare Formular EoD Logistică Stand",
                        "Alertează coordonatorii logistici la transmiterea raportului zilnic de inventar căni.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Nume stand"),
                                new TriggerMetadataDTO.PlaceholderInfo("{closingPersonName}", "Persoană predare"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data raportării"),
                                new TriggerMetadataDTO.PlaceholderInfo("{notes}", "Note încheiere"),
                                new TriggerMetadataDTO.PlaceholderInfo("{mugsCount}", "Total căni rămase")
                        ),
                        false,
                        false,
                        "SPECIFIC_ROLE",
                        List.of("SPECIFIC_ROLE", "SPECIFIC_STAND"),
                        List.of(),
                        0,
                        0,
                        30
                ),
                new TriggerMetadataDTO(
                        "PWA_FINANCE_EOD",
                        "FINANCE",
                        "Notificare Formular EoD Încasări",
                        "Alertează la transmiterea raportului zilnic de încasări.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Nume stand"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data raportării"),
                                new TriggerMetadataDTO.PlaceholderInfo("{grandTotal}", "Total colectat (RON)")
                        ),
                        false,
                        false,
                        "SPECIFIC_ROLE",
                        List.of("SPECIFIC_ROLE", "SPECIFIC_STAND"),
                        List.of(),
                        0,
                        0,
                        30
                ),
                new TriggerMetadataDTO(
                        "PWA_DONATION_ALERT",
                        "FINANCE",
                        "Alertă Donație / Sponsorizare Mare",
                        "Notifică administratorii la înregistrarea unei donații sau sponsorizări mari.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{donorName}", "Nume donator / Companie"),
                                new TriggerMetadataDTO.PlaceholderInfo("{amount}", "Valoare"),
                                new TriggerMetadataDTO.PlaceholderInfo("{currency}", "Monedă"),
                                new TriggerMetadataDTO.PlaceholderInfo("{campaignName}", "Campanie"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data donației")
                        ),
                        false,
                        true,
                        "SPECIFIC_ROLE",
                        List.of("SPECIFIC_ROLE"),
                        List.of(),
                        0,
                        500,
                        10
                ),
                new TriggerMetadataDTO(
                        "PWA_ANNOUNCEMENT_BROADCAST",
                        "GENERAL",
                        "Anunț Urgent / Broadcast Campanie",
                        "Transmite notificări de urgență sau anunțuri generale.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{announcementTitle}", "Titlu anunț"),
                                new TriggerMetadataDTO.PlaceholderInfo("{messageText}", "Conținut mesaj")
                        ),
                        false,
                        false,
                        "ALL_USERS",
                        List.of("ALL_USERS", "SPECIFIC_ROLE", "SPECIFIC_STAND", "SPECIFIC_USER"),
                        List.of(),
                        0,
                        0,
                        15
                ),
                new TriggerMetadataDTO(
                        "PWA_TASK_ASSIGNED",
                        "GENERAL",
                        "Notificări Sarcini",
                        "Trimite notificări push PWA și memento-uri programate în funcție de prioritate pentru sarcini.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{title}", "Titlu sarcină"),
                                new TriggerMetadataDTO.PlaceholderInfo("{priority}", "Prioritate"),
                                new TriggerMetadataDTO.PlaceholderInfo("{deadline}", "Termen limită"),
                                new TriggerMetadataDTO.PlaceholderInfo("{description}", "Descriere sarcină"),
                                new TriggerMetadataDTO.PlaceholderInfo("{assignee}", "Persoană asignată"),
                                new TriggerMetadataDTO.PlaceholderInfo("{department}", "Departament"),
                                new TriggerMetadataDTO.PlaceholderInfo("{reminderIndex}", "Număr memento curent"),
                                new TriggerMetadataDTO.PlaceholderInfo("{totalReminders}", "Total memento-uri programate")
                        ),
                        false,
                        false,
                        "TASK_ASSIGNEES",
                        List.of("TASK_ASSIGNEES", "ALL_USERS", "SPECIFIC_ROLE"),
                        List.of(),
                        0,
                        0,
                        0
                )
        );
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
                log.warn("Failed to fetch dynamic roles for PWA from database: {}", e.getMessage());
            }
        }
        return List.of(
                Map.of("id", "ADMIN", "label", "Admin"),
                Map.of("id", "VOLUNTEER", "label", "Voluntar")
        );
    }

    public List<Map<String, Object>> getIncompleteStands() {
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
            log.warn("Failed to fetch incomplete stands: {}", e.getMessage());
            return List.of();
        }
    }

    public void sendPushAsync(String title, String body, String actionUrl, String targetAudience) {
        sendPushAsync(title, body, actionUrl, targetAudience, null);
    }

    public void sendPushAsync(String title, String body, String actionUrl, String targetAudience, String targetValue) {
        log.info("Dispatched async PWA push notification: audience={}, targetValue={}, title={}, body={}, url={}",
                targetAudience, targetValue, title, body, actionUrl);

        List<UserPwaSubscription> targetSubscriptions = new ArrayList<>();

        try {
            if ("SPECIFIC_USER".equalsIgnoreCase(targetAudience) || "USER_DIRECT".equalsIgnoreCase(targetAudience)) {
                if (targetValue != null && !targetValue.isBlank()) {
                    try {
                        UUID uid = UUID.fromString(targetValue.trim());
                        targetSubscriptions.addAll(subscriptionRepository.findByUserId(uid));
                    } catch (Exception e) {
                        log.warn("Invalid userId for push: {}", targetValue);
                    }
                }
            } else if ("SPECIFIC_ROLE".equalsIgnoreCase(targetAudience) || "ROLE".equalsIgnoreCase(targetAudience)) {
                if (targetValue != null && !targetValue.isBlank()) {
                    String roleStr = targetValue.trim().toUpperCase();
                    List<AdminUser> all = adminUserRepository.findAll();
                    List<UUID> uids = all.stream()
                            .filter(u -> {
                                if (u.getRole() != null && u.getRole().equalsIgnoreCase(roleStr)) return true;
                                if (u.getRoles() != null) {
                                    return u.getRoles().stream().anyMatch(r -> r.equalsIgnoreCase(roleStr));
                                }
                                return false;
                            })
                            .map(AdminUser::getId)
                            .toList();
                    if (!uids.isEmpty()) {
                        targetSubscriptions.addAll(subscriptionRepository.findByUserIds(uids));
                    }
                }
            } else if ("SPECIFIC_STAND".equalsIgnoreCase(targetAudience) || "STAND".equalsIgnoreCase(targetAudience)) {
                if (targetValue != null && !targetValue.isBlank()) {
                    try {
                        HrStand stand = hrRepository.findStandById(targetValue.trim());
                        if (stand != null && !"COMPLETED".equalsIgnoreCase(stand.getStatus()) && !"CANCELLED".equalsIgnoreCase(stand.getStatus())) {
                            Set<UUID> uids = new HashSet<>();
                            Set<String> emails = new HashSet<>();
                            if (stand.getShifts() != null) {
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
                            }
                            if (!emails.isEmpty()) {
                                List<AdminUser> all = adminUserRepository.findAll();
                                for (AdminUser u : all) {
                                    if (u.getEmail() != null && emails.contains(u.getEmail().trim().toLowerCase())) {
                                        uids.add(u.getId());
                                    }
                                }
                            }
                            if (!uids.isEmpty()) {
                                targetSubscriptions.addAll(subscriptionRepository.findByUserIds(new ArrayList<>(uids)));
                            }
                        }
                    } catch (Exception e) {
                        log.warn("Error finding stand members for push: {}", e.getMessage());
                    }
                }
            } else if ("ALL_USERS".equalsIgnoreCase(targetAudience) || "ALL".equalsIgnoreCase(targetAudience)) {
                targetSubscriptions.addAll(subscriptionRepository.findAll());
            } else if ("VOLUNTEERS".equalsIgnoreCase(targetAudience) || "VOLUNTEER_DIRECT".equalsIgnoreCase(targetAudience)) {
                List<AdminUser> all = adminUserRepository.findAll();
                List<UUID> uids = all.stream()
                        .filter(u -> u.hasRole("VOLUNTEER"))
                        .map(AdminUser::getId)
                        .toList();
                targetSubscriptions.addAll(subscriptionRepository.findByUserIds(uids));
            } else if ("COORDINATORS".equalsIgnoreCase(targetAudience)) {
                List<AdminUser> all = adminUserRepository.findAll();
                List<UUID> uids = all.stream()
                        .filter(u -> !"VOLUNTEER".equalsIgnoreCase(u.getRole()))
                        .map(AdminUser::getId)
                        .toList();
                targetSubscriptions.addAll(subscriptionRepository.findByUserIds(uids));
            } else if ("ADMINS".equalsIgnoreCase(targetAudience)) {
                List<AdminUser> all = adminUserRepository.findAll();
                List<UUID> uids = all.stream()
                        .filter(u -> u.hasRole("ADMIN") || u.hasRole("SUPER_ADMIN"))
                        .map(AdminUser::getId)
                        .toList();
                targetSubscriptions.addAll(subscriptionRepository.findByUserIds(uids));
            }
        } catch (Exception e) {
            log.warn("Error resolving target subscriptions for audience {} value {}: {}", targetAudience, targetValue, e.getMessage());
        }

        if (targetSubscriptions.isEmpty()) {
            log.info("No subscriptions found for audience={} targetValue={}. Push skipped.", targetAudience, targetValue);
            return;
        }

        String jsonPayload = buildJsonPayload(title, body, actionUrl);
        for (UserPwaSubscription sub : targetSubscriptions) {
            deliverViaWebPush(sub, jsonPayload);
        }
    }

    /**
     * Delivers a push notification using RFC 8291 (AES-GCM content encryption)
     * + RFC 8292 (VAPID) via nl.martijndwars:web-push.
     *
     * Previously this used a raw HTTP POST to the push endpoint URL without any
     * encryption or VAPID Authorization header. Browser push services (FCM, Mozilla)
     * always reject such requests (400/401), so USER_DIRECT and all server-sent
     * audiences silently failed while CURRENT_DEVICE worked because it bypassed
     * the backend entirely (frontend calls reg.showNotification() directly).
     */
    private void deliverViaWebPush(UserPwaSubscription sub, String jsonPayload) {
        if (sub == null || sub.getEndpoint() == null || sub.getEndpoint().isBlank()) return;

        // Subscriptions without encryption keys cannot receive encrypted server push payloads.
        if (sub.getP256dh() == null || sub.getAuth() == null) {
            log.debug("Skipping push for endpoint without encryption keys: {}", sub.getEndpoint());
            return;
        }

        if (vapidPrivateKey == null || vapidPrivateKey.isBlank()) {
            log.warn("VAPID private key not configured (app.vapid.private-key). Cannot deliver encrypted push to: {}", sub.getEndpoint());
            return;
        }

        try {
            nl.martijndwars.webpush.PushService pushService = new nl.martijndwars.webpush.PushService();
            pushService.setPublicKey(vapidPublicKey);
            pushService.setPrivateKey(vapidPrivateKey);
            pushService.setSubject(vapidSubject != null && !vapidSubject.isBlank() ? vapidSubject : "mailto:admin@example.org");

            nl.martijndwars.webpush.Notification notification =
                    new nl.martijndwars.webpush.Notification(
                            sub.getEndpoint(),
                            sub.getP256dh(),
                            sub.getAuth(),
                            jsonPayload.getBytes(java.nio.charset.StandardCharsets.UTF_8)
                    );

            org.apache.http.HttpResponse response = pushService.send(notification);
            int statusCode = response.getStatusLine().getStatusCode();

            if (statusCode == 404 || statusCode == 410 || statusCode == 401 || statusCode == 403) {
                log.info("Push subscription invalid or expired ({}). Cleaning up endpoint.", statusCode);
                subscriptionRepository.deleteByEndpoint(sub.getEndpoint());
            } else if (statusCode >= 400) {
                log.warn("Push service returned {} for endpoint: {}", statusCode, sub.getEndpoint());
            } else {
                log.debug("Push delivered ({}) to endpoint: {}", statusCode, sub.getEndpoint());
            }
        } catch (Exception e) {
            log.warn("Push delivery error for endpoint {}: {}", sub.getEndpoint(), e.getMessage(), e);
        }
    }

    private String buildJsonPayload(String title, String body, String actionUrl) {
        return "{\"title\":\"" + escapeJson(title) + "\",\"body\":\"" + escapeJson(body) + "\",\"url\":\"" + escapeJson(actionUrl) + "\"}";
    }

    private String escapeJson(String raw) {
        if (raw == null) return "";
        return raw.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r");
    }

    private String interpolate(String template, Map<String, String> values) {
        if (template == null || template.isBlank() || values == null) return template != null ? template : "";
        String result = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace("{" + entry.getKey() + "}", entry.getValue() != null ? entry.getValue() : "");
        }
        return result.trim();
    }

    public void sendTaskPushNotification(com.charityapp.model.general.GeneralTask task) {
        sendTaskPushNotification(task, null, false, 0, 0);
    }

    public void sendTaskPushNotification(com.charityapp.model.general.GeneralTask task,
                                         String targetUserId,
                                         boolean isReminder,
                                         int reminderIndex,
                                         int totalReminders) {
        if (task == null) return;

        List<com.charityapp.model.general.NotificationRule> rules = new ArrayList<>();
        if (notificationRuleService != null) {
            List<com.charityapp.model.general.NotificationRule> pwaRules =
                    notificationRuleService.findByChannelAndRuleTypeAndActiveTrue("PWA", "PWA_TASK_ASSIGNED");
            if (pwaRules != null) rules.addAll(pwaRules);
        }

        if (rules.isEmpty()) {
            return;
        }

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
        String priority = task.getPriority() != null ? task.getPriority() : "medie";
        String desc = task.getDescription() != null && !task.getDescription().isBlank() ? task.getDescription() : "";
        String taskTitle = task.getTitle() != null ? task.getTitle() : "Task";
        String assignee = task.getAssignee() != null ? task.getAssignee() : "";
        String department = task.getDepartment() != null ? task.getDepartment() : "";

        Map<String, String> values = Map.of(
            "title", taskTitle,
            "deadline", deadline,
            "priority", priority,
            "description", desc,
            "assignee", assignee,
            "department", department,
            "reminderIndex", String.valueOf(reminderIndex),
            "totalReminders", String.valueOf(totalReminders)
        );

        String defaultActionUrl = "/dashboard/general?subtab=tasks";
        String defaultTitle = isReminder
                ? String.format("Memento sarcină (%d/%d): %s", reminderIndex, totalReminders, taskTitle)
                : ("Sarcină nouă: " + taskTitle);
        String defaultBody = "Prioritate: " + priority + " | Termen: " + deadline + (desc.isBlank() ? "" : ("\n" + desc));

        // If direct userId is supplied
        if (targetUserId != null && !targetUserId.isBlank()) {
            String cleanUid = targetUserId.trim();
            for (com.charityapp.model.general.NotificationRule rule : rules) {
                String title = rule.getTitleTemplate() != null && !rule.getTitleTemplate().isBlank()
                        ? interpolate(rule.getTitleTemplate(), values)
                        : defaultTitle;
                String body = notificationRuleService != null
                        ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultBody)
                        : defaultBody;
                String effectiveUrl = rule.getActionUrl() != null && !rule.getActionUrl().isBlank()
                        ? rule.getActionUrl().trim()
                        : defaultActionUrl;
                sendPushAsync(title, body, effectiveUrl, "USER_DIRECT", cleanUid);
            }
            return;
        }

        for (com.charityapp.model.general.NotificationRule rule : rules) {
            String title = rule.getTitleTemplate() != null && !rule.getTitleTemplate().isBlank()
                    ? interpolate(rule.getTitleTemplate(), values)
                    : defaultTitle;
            String body = notificationRuleService != null
                    ? notificationRuleService.renderRandomTemplate(rule, values).orElse(defaultBody)
                    : defaultBody;
            String effectiveUrl = rule.getActionUrl() != null && !rule.getActionUrl().isBlank()
                    ? rule.getActionUrl().trim()
                    : defaultActionUrl;

            String recipientType = rule.getTargetRecipientType() != null ? rule.getTargetRecipientType().trim().toUpperCase() : "USER_DIRECT";

            if ("ALL_USERS".equalsIgnoreCase(recipientType)) {
                sendPushAsync(title, body, effectiveUrl, "ALL_USERS", null);
            } else if ("SPECIFIC_ROLE".equalsIgnoreCase(recipientType) || "ROLE".equalsIgnoreCase(recipientType)) {
                String targetRole = rule.getCustomRecipientJid();
                if (targetRole != null && !targetRole.isBlank()) {
                    sendPushAsync(title, body, effectiveUrl, "SPECIFIC_ROLE", targetRole);
                }
            } else if ("SPECIFIC_STAND".equalsIgnoreCase(recipientType) || "STAND".equalsIgnoreCase(recipientType)) {
                String targetStand = rule.getCustomRecipientJid();
                if (targetStand != null && !targetStand.isBlank()) {
                    sendPushAsync(title, body, effectiveUrl, "SPECIFIC_STAND", targetStand);
                }
            } else if ("SPECIFIC_USER".equalsIgnoreCase(recipientType)) {
                String targetUser = rule.getCustomRecipientJid();
                if (targetUser != null && !targetUser.isBlank()) {
                    sendPushAsync(title, body, effectiveUrl, "SPECIFIC_USER", targetUser);
                }
            } else {
                // USER_DIRECT or TASK_ASSIGNEES - send to assigned users
                String assigneeIds = task.getAssigneeIds();
                if (assigneeIds != null && !assigneeIds.isBlank()) {
                    for (String rawId : assigneeIds.split(",")) {
                        String uid = rawId.trim();
                        if (!uid.isEmpty()) {
                            sendPushAsync(title, body, effectiveUrl, "USER_DIRECT", uid);
                        }
                    }
                }
            }
        }
    }
}

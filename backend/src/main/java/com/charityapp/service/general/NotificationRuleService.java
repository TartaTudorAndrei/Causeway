package com.charityapp.service.general;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.charityapp.dto.notification.NotificationRuleDTO;
import com.charityapp.dto.notification.TriggerMetadataDTO;
import com.charityapp.model.general.NotificationRule;
import com.charityapp.repository.general.NotificationRuleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class NotificationRuleService {

    private static final Logger log = LoggerFactory.getLogger(NotificationRuleService.class);

    private final NotificationRuleRepository ruleRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public NotificationRuleService(NotificationRuleRepository ruleRepository) {
        this.ruleRepository = ruleRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationRuleDTO> getAllRules(String category) {
        return getAllRules(null, category);
    }

    @Transactional(readOnly = true)
    public List<NotificationRuleDTO> getAllRules(String channel, String category) {
        String effectiveChannel = (channel != null && !channel.isBlank() && !"ALL".equalsIgnoreCase(channel))
                ? channel.trim().toUpperCase()
                : null;
        List<NotificationRule> entities;

        if (effectiveChannel != null) {
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                String catUpper = category.toUpperCase().trim();
                if ("HR".equals(catUpper)) {
                    List<NotificationRule> hrRules = ruleRepository.findByChannelAndCategory(effectiveChannel, "HR");
                    List<NotificationRule> volRules = ruleRepository.findByChannelAndCategory(effectiveChannel, "VOLUNTEER");
                    entities = new ArrayList<>(hrRules);
                    entities.addAll(volRules);
                } else {
                    entities = ruleRepository.findByChannelAndCategory(effectiveChannel, catUpper);
                }
            } else {
                entities = ruleRepository.findByChannel(effectiveChannel);
            }
        } else {
            if (category != null && !category.isBlank() && !"ALL".equalsIgnoreCase(category)) {
                String catUpper = category.toUpperCase().trim();
                if ("HR".equals(catUpper)) {
                    List<NotificationRule> hrRules = ruleRepository.findByCategory("HR");
                    List<NotificationRule> volRules = ruleRepository.findByCategory("VOLUNTEER");
                    entities = new ArrayList<>(hrRules);
                    entities.addAll(volRules);
                } else {
                    entities = ruleRepository.findByCategory(catUpper);
                }
            } else {
                entities = ruleRepository.findAll();
            }
        }

        return entities.stream()
                .sorted(Comparator.comparing(NotificationRule::getCategory).thenComparing(NotificationRule::getName))
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> findAllActiveByRuleType(String ruleType) {
        if (ruleType == null || ruleType.isBlank()) {
            return List.of();
        }
        return ruleRepository.findByRuleTypeAndActiveTrue(ruleType.trim());
    }

    @Transactional(readOnly = true)
    public List<NotificationRule> findByChannelAndRuleTypeAndActiveTrue(String channel, String ruleType) {
        if (ruleType == null || ruleType.isBlank()) {
            return List.of();
        }
        if (channel == null || channel.isBlank()) {
            return ruleRepository.findByRuleTypeAndActiveTrue(ruleType.trim());
        }
        return ruleRepository.findByChannelAndRuleTypeAndActiveTrue(channel.trim().toUpperCase(), ruleType.trim());
    }

    @Transactional(readOnly = true)
    public Optional<NotificationRule> findActiveByRuleType(String ruleType) {
        if (ruleType == null || ruleType.isBlank()) {
            return Optional.empty();
        }
        return ruleRepository.findByRuleTypeAndActiveTrue(ruleType.trim()).stream().findFirst();
    }

    @Transactional
    public NotificationRuleDTO createRule(NotificationRuleDTO dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Datele regulii de notificare sunt obligatorii.");
        }
        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new IllegalArgumentException("Numele regulii este obligatoriu.");
        }
        if (dto.getRuleType() == null || dto.getRuleType().isBlank()) {
            throw new IllegalArgumentException("Tipul evenimentului declanșator (ruleType) este obligatoriu.");
        }
        if (dto.getCategory() == null || dto.getCategory().isBlank()) {
            throw new IllegalArgumentException("Categoria regulii este obligatorie.");
        }

        NotificationRule rule = new NotificationRule();
        rule.setId(dto.getId() != null ? dto.getId() : UUID.randomUUID());

        String chan = dto.getChannel();
        if (chan == null || chan.isBlank()) {
            chan = dto.getRuleType() != null && dto.getRuleType().toUpperCase().startsWith("PWA_") ? "PWA" : "WHATSAPP";
        }
        rule.setChannel(chan.trim().toUpperCase());

        rule.setName(dto.getName().trim());
        rule.setRuleType(dto.getRuleType().trim().toUpperCase());
        rule.setCategory(dto.getCategory().trim().toUpperCase());
        rule.setActive(dto.isActive());
        rule.setTriggerTimingMinutes(Math.max(0, dto.getTriggerTimingMinutes()));
        rule.setMinCapacityThreshold(dto.getMinCapacityThreshold() != null ? Math.max(0, dto.getMinCapacityThreshold()) : 0);
        rule.setTargetRecipientType(dto.getTargetRecipientType() != null && !dto.getTargetRecipientType().isBlank()
                ? dto.getTargetRecipientType().trim()
                : "COORDINATOR_GROUP");

        String recipient = dto.getCustomRecipient() != null && !dto.getCustomRecipient().isBlank()
                ? dto.getCustomRecipient().trim()
                : (dto.getCustomRecipientJid() != null && !dto.getCustomRecipientJid().isBlank() ? dto.getCustomRecipientJid().trim() : null);
        rule.setCustomRecipientJid(recipient);

        rule.setSourceGroupJid(dto.getSourceGroupJid() != null && !dto.getSourceGroupJid().isBlank() ? dto.getSourceGroupJid().trim() : null);

        rule.setTitleTemplate(dto.getTitleTemplate() != null ? dto.getTitleTemplate().trim() : null);
        rule.setActionUrl(dto.getActionUrl() != null ? dto.getActionUrl().trim() : null);

        List<String> validTemplates = dto.getTemplates() != null
                ? dto.getTemplates().stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList()
                : List.of();

        try {
            rule.setTemplates(objectMapper.writeValueAsString(validTemplates));
        } catch (Exception e) {
            log.error("Failed to serialize templates: {}", e.getMessage());
            rule.setTemplates("[]");
        }

        rule.setCooldownMinutes(Math.max(0, dto.getCooldownMinutes()));
        rule.setCreatedAt(OffsetDateTime.now());
        rule.setUpdatedAt(OffsetDateTime.now());

        NotificationRule saved = ruleRepository.save(rule);
        return toDTO(saved);
    }

    @Transactional
    public NotificationRuleDTO updateRule(UUID id, NotificationRuleDTO dto) {
        NotificationRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regula de notificare nu a fost găsită: " + id));

        if (dto.getChannel() != null && !dto.getChannel().isBlank()) {
            rule.setChannel(dto.getChannel().trim().toUpperCase());
        }
        if (dto.getName() != null && !dto.getName().isBlank()) {
            rule.setName(dto.getName().trim());
        }
        if (dto.getRuleType() != null && !dto.getRuleType().isBlank()) {
            rule.setRuleType(dto.getRuleType().trim().toUpperCase());
        }
        if (dto.getCategory() != null && !dto.getCategory().isBlank()) {
            rule.setCategory(dto.getCategory().trim().toUpperCase());
        }
        rule.setActive(dto.isActive());
        rule.setTriggerTimingMinutes(Math.max(0, dto.getTriggerTimingMinutes()));
        rule.setMinCapacityThreshold(dto.getMinCapacityThreshold() != null ? Math.max(0, dto.getMinCapacityThreshold()) : 0);

        if (dto.getTargetRecipientType() != null && !dto.getTargetRecipientType().isBlank()) {
            rule.setTargetRecipientType(dto.getTargetRecipientType().trim());
        }

        if (dto.getCustomRecipient() != null || dto.getCustomRecipientJid() != null) {
            String recipient = dto.getCustomRecipient() != null && !dto.getCustomRecipient().isBlank()
                    ? dto.getCustomRecipient().trim()
                    : (dto.getCustomRecipientJid() != null && !dto.getCustomRecipientJid().isBlank() ? dto.getCustomRecipientJid().trim() : null);
            rule.setCustomRecipientJid(recipient);
        }

        if (dto.getSourceGroupJid() != null) {
            rule.setSourceGroupJid(dto.getSourceGroupJid().isBlank() ? null : dto.getSourceGroupJid().trim());
        }

        if (dto.getTitleTemplate() != null) {
            rule.setTitleTemplate(dto.getTitleTemplate().trim());
        }
        if (dto.getActionUrl() != null) {
            rule.setActionUrl(dto.getActionUrl().trim());
        }

        if (dto.getTemplates() != null && !dto.getTemplates().isEmpty()) {
            try {
                List<String> validTemplates = dto.getTemplates().stream()
                        .filter(Objects::nonNull)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .toList();
                if (!validTemplates.isEmpty()) {
                    rule.setTemplates(objectMapper.writeValueAsString(validTemplates));
                }
            } catch (Exception e) {
                log.error("Failed to serialize notification templates: {}", e.getMessage());
            }
        }

        if (dto.getCooldownMinutes() >= 0) {
            rule.setCooldownMinutes(dto.getCooldownMinutes());
        }

        rule.setUpdatedAt(OffsetDateTime.now());
        NotificationRule saved = ruleRepository.save(rule);
        return toDTO(saved);
    }

    @Transactional
    public void deleteRule(UUID id) {
        if (!ruleRepository.existsById(id)) {
            throw new IllegalArgumentException("Regula de notificare nu a fost găsită: " + id);
        }
        ruleRepository.deleteById(id);
    }

    @Transactional
    public NotificationRuleDTO toggleActive(UUID id, boolean active) {
        NotificationRule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Regula de notificare nu a fost găsită: " + id));

        rule.setActive(active);
        rule.setUpdatedAt(OffsetDateTime.now());
        return toDTO(ruleRepository.save(rule));
    }

    public List<TriggerMetadataDTO> getTriggerCatalog() {
        return List.of(
                // HR Triggers
                new TriggerMetadataDTO(
                        "HR_SHIFT_REMINDER",
                        "HR",
                        "Reminder Automat Tură Voluntar",
                        "Trimite reminder automat voluntarilor programați pe o tură cu un anumit interval înainte de start.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenumele voluntarului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Numele complet al voluntarului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{shiftName}", "Numele/descrierea turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{startTime}", "Ora de început a turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{endTime}", "Ora de final a turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Locația sau standul turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{roleName}", "Rolul atribuit"),
                                new TriggerMetadataDTO.PlaceholderInfo("{standUrl}", "Link-ul public al standului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data calendaristică a turei")
                        ),
                        true,
                        false,
                        "VOLUNTEER_DIRECT",
                        List.of("DIRECT"),
                        List.of(),
                        120,
                        0,
                        120
                ),
                new TriggerMetadataDTO(
                        "HR_VOLUNTEER_DEFICIT",
                        "HR",
                        "Alertă Deficit Voluntari Stand",
                        "Alertează echipa și coordonatorii când o tură viitoare are un deficit de voluntari peste pragul setat.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{shiftName}", "Numele turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data turei"),
                                new TriggerMetadataDTO.PlaceholderInfo("{startTime}", "Ora de început"),
                                new TriggerMetadataDTO.PlaceholderInfo("{endTime}", "Ora de final"),
                                new TriggerMetadataDTO.PlaceholderInfo("{confirmedCount}", "Număr voluntari confirmați"),
                                new TriggerMetadataDTO.PlaceholderInfo("{requiredCount}", "Număr voluntari necesari"),
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Nume stand / Locație"),
                                new TriggerMetadataDTO.PlaceholderInfo("{deficit}", "Număr de voluntari lipsă")
                        ),
                        true,
                        true,
                        "COORDINATOR_GROUP",
                        List.of("GROUP"),
                        List.of(),
                        1440,
                        1,
                        60
                ),

                // Volunteer Triggers (Merged under HR)
                new TriggerMetadataDTO(
                        "VOLUNTEER_APPROVAL",
                        "HR",
                        "Notificare Aprobare Cont Voluntar",
                        "Trimisă automat când contul de voluntar al unui utilizator este validat și aprobat de admin.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenumele utilizatorului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Numele complet"),
                                new TriggerMetadataDTO.PlaceholderInfo("{loginUrl}", "Link-ul de autentificare în platformă")
                        ),
                        false,
                        false,
                        "VOLUNTEER_DIRECT",
                        List.of("DIRECT"),
                        List.of(),
                        0,
                        0,
                        0
                ),
                new TriggerMetadataDTO(
                        "VOLUNTEER_WELCOME",
                        "HR",
                        "Mesaj de Bun Venit Voluntar",
                        "Mesaj informativ de bun venit expediat după înregistrarea pe platformă.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenumele utilizatorului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{fullName}", "Numele complet"),
                                new TriggerMetadataDTO.PlaceholderInfo("{loginUrl}", "Link platformă")
                        ),
                        false,
                        false,
                        "VOLUNTEER_DIRECT",
                        List.of("DIRECT"),
                        List.of(),
                        0,
                        0,
                        0
                ),

                // Logistics Triggers
                new TriggerMetadataDTO(
                        "LOGISTICS_LOW_STOCK",
                        "LOGISTICS",
                        "Alertă Stoc Redus Logistică",
                        "Notifică responsabilii când stocul unui articol atinge sau scade sub pragul de alertă minim.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{itemName}", "Numele articolului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{currentQuantity}", "Cantitatea curentă rămasă"),
                                new TriggerMetadataDTO.PlaceholderInfo("{minThreshold}", "Pragul minim configurat"),
                                new TriggerMetadataDTO.PlaceholderInfo("{unit}", "Unitatea de măsură (ex: buc, kg)"),
                                new TriggerMetadataDTO.PlaceholderInfo("{location}", "Depozitul sau standul")
                        ),
                        false,
                        true,
                        "COORDINATOR_GROUP",
                        List.of("GROUP"),
                        List.of(),
                        0,
                        1,
                        60
                ),
                new TriggerMetadataDTO(
                        "LOGISTICS_EOD_COMPLETION",
                        "LOGISTICS",
                        "Notificare Formular EoD Logistică Stand",
                        "Alertează coordonatorii logistici la transmiterea formularului zilnic de încheiere zi și inventar căni.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Numele standului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{closingPersonName}", "Numele persoanei responsabile de încheiere"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data raportării"),
                                new TriggerMetadataDTO.PlaceholderInfo("{notes}", "Note și observații"),
                                new TriggerMetadataDTO.PlaceholderInfo("{mugsCount}", "Numărul total de căni rămase")
                        ),
                        false,
                        false,
                        "COORDINATOR_GROUP",
                        List.of("GROUP"),
                        List.of(),
                        0,
                        0,
                        30
                ),

                // Finance Triggers
                new TriggerMetadataDTO(
                        "FINANCE_EOD_COMPLETION",
                        "FINANCE",
                        "Notificare Formular EoD Încasări",
                        "Alertează coordonatorii la finalizarea cu succes a formularului de încheiere zi (EoD) pentru un stand.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{standName}", "Numele standului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data raportării"),
                                new TriggerMetadataDTO.PlaceholderInfo("{cashTotal}", "Total numerar colectat (RON)"),
                                new TriggerMetadataDTO.PlaceholderInfo("{posTotal}", "Total POS colectat (RON)"),
                                new TriggerMetadataDTO.PlaceholderInfo("{grandTotal}", "Total general colectat (RON)")
                        ),
                        false,
                        false,
                        "COORDINATOR_GROUP",
                        List.of("GROUP"),
                        List.of(),
                        0,
                        0,
                        30
                ),

                // General / Task Triggers
                new TriggerMetadataDTO(
                        "TASK_ASSIGNED",
                        "GENERAL",
                        "Notificări Sarcini",
                        "Trimite notificări pe WhatsApp la crearea sarcinii și memento-uri programate în funcție de prioritate către membrii asignați.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{title}", "Titlul sarcinii"),
                                new TriggerMetadataDTO.PlaceholderInfo("{priority}", "Prioritatea sarcinii (Scăzută / Medie / Ridicată)"),
                                new TriggerMetadataDTO.PlaceholderInfo("{deadline}", "Termenul limită / Data scadenței"),
                                new TriggerMetadataDTO.PlaceholderInfo("{description}", "Descrierea sarcinii"),
                                new TriggerMetadataDTO.PlaceholderInfo("{assignee}", "Numele persoanei asignate"),
                                new TriggerMetadataDTO.PlaceholderInfo("{department}", "Departamentul sarcinii"),
                                new TriggerMetadataDTO.PlaceholderInfo("{reminderIndex}", "Număr memento curent"),
                                new TriggerMetadataDTO.PlaceholderInfo("{totalReminders}", "Total memento-uri programate")
                        ),
                        false,
                        false,
                        "TASK_ASSIGNEES",
                        List.of("TASK_ASSIGNEES", "GROUP"),
                        List.of(),
                        0,
                        0,
                        0
                ),

                // Group Join Trigger
                new TriggerMetadataDTO(
                        "GROUP_MEMBER_JOIN",
                        "GENERAL",
                        "Membru Nou Înscris în Grup",
                        "Trimite automat un mesaj de întâmpinare când un membru nou intră într-un grup WhatsApp specificat.",
                        List.of(
                                new TriggerMetadataDTO.PlaceholderInfo("{groupName}", "Numele grupului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{participantPhone}", "Numărul de telefon al membrului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{userName}", "Numele complet al utilizatorului (dacă există)"),
                                new TriggerMetadataDTO.PlaceholderInfo("{firstName}", "Prenumele utilizatorului"),
                                new TriggerMetadataDTO.PlaceholderInfo("{date}", "Data alăturării"),
                                new TriggerMetadataDTO.PlaceholderInfo("{time}", "Ora alăturării")
                        ),
                        false,
                        false,
                        true,
                        "TRIGGER_GROUP",
                        List.of("TRIGGER_GROUP", "JOINED_USER_DIRECT", "COORDINATOR_GROUP", "SPECIFIC_PHONE"),
                        List.of(
                                "Bun venit în grup, {userName}! Ne bucurăm să te avem alături în {groupName}! 🎉",
                                "Salut {firstName}! Bine ai venit în comunitate ({groupName}). Dacă ai întrebări, suntem aici să te ajutăm! ✨"
                        ),
                        0,
                        0,
                        0
                )
        );
    }

    /**
     * Pick a random template from the active rule and interpolate variables {key}.
     */
    public Optional<String> renderRandomTemplate(NotificationRule rule, Map<String, String> values) {
        if (rule == null || !rule.isActive()) {
            return Optional.empty();
        }

        List<String> templatesList = parseTemplates(rule.getTemplates());
        if (templatesList.isEmpty()) {
            return Optional.empty();
        }

        // Pick uniformly at random to prevent message fingerprinting
        int randomIndex = ThreadLocalRandom.current().nextInt(templatesList.size());
        String selectedTemplate = templatesList.get(randomIndex);

        // Replace placeholders {key}
        if (values != null) {
            for (Map.Entry<String, String> entry : values.entrySet()) {
                String placeholder = "{" + entry.getKey() + "}";
                String val = entry.getValue() != null ? entry.getValue() : "";
                selectedTemplate = selectedTemplate.replace(placeholder, val);
            }
        }

        return Optional.of(selectedTemplate.trim());
    }

    public List<String> parseTemplates(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            log.warn("Failed to parse templates JSON, fallback to single string: {}", e.getMessage());
            return List.of(json);
        }
    }

    public NotificationRuleDTO toDTO(NotificationRule rule) {
        NotificationRuleDTO dto = new NotificationRuleDTO();
        dto.setId(rule.getId());
        dto.setChannel(rule.getChannel());
        dto.setRuleType(rule.getRuleType());
        dto.setName(rule.getName());
        dto.setCategory(rule.getCategory());
        dto.setActive(rule.isActive());
        dto.setTriggerTimingMinutes(rule.getTriggerTimingMinutes());
        dto.setMinCapacityThreshold(rule.getMinCapacityThreshold());
        dto.setTargetRecipientType(rule.getTargetRecipientType());
        dto.setCustomRecipientJid(rule.getCustomRecipientJid());
        dto.setCustomRecipient(rule.getCustomRecipientJid());
        dto.setSourceGroupJid(rule.getSourceGroupJid());
        dto.setTitleTemplate(rule.getTitleTemplate());
        dto.setActionUrl(rule.getActionUrl());
        dto.setTemplates(parseTemplates(rule.getTemplates()));
        dto.setCooldownMinutes(rule.getCooldownMinutes());
        dto.setCreatedAt(rule.getCreatedAt());
        dto.setUpdatedAt(rule.getUpdatedAt());
        return dto;
    }
}

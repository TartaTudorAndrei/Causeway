package com.charityapp.service.general;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.event.DashboardDataChangedEvent;
import com.charityapp.model.general.GeneralDepartment;
import com.charityapp.model.general.GeneralEvent;
import com.charityapp.model.general.GeneralLocation;
import com.charityapp.model.general.GeneralTask;
import com.charityapp.repository.general.GeneralRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class GeneralService {

    private static final Logger log = LoggerFactory.getLogger(GeneralService.class);

    private final GeneralRepository generalRepository;
    private final ApplicationEventPublisher eventPublisher;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private TaskNotificationService taskNotificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.notification.WhatsAppNotificationService whatsAppNotificationService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private com.charityapp.service.notification.PwaNotificationService pwaNotificationService;

    public GeneralService(GeneralRepository generalRepository, ApplicationEventPublisher eventPublisher) {
        this.generalRepository = generalRepository;
        this.eventPublisher = eventPublisher;
    }

    // Departments
    public List<GeneralDepartment> getAllDepartments() {
        return generalRepository.findAllDepartments();
    }

    public GeneralDepartment createDepartment(GeneralDepartment department) {
        if (department.getId() == null || department.getId().isBlank()) {
            department.setId(department.getName().toLowerCase().replaceAll("[^a-z0-9]+", "_").replaceAll("(^_|_$)", ""));
        }
        GeneralDepartment saved = generalRepository.saveDepartment(department);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "createDepartment"));
        return saved;
    }

    public GeneralDepartment updateDepartment(String id, GeneralDepartment department) {
        department.setId(id);
        generalRepository.updateDepartment(id, department);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "updateDepartment"));
        return department;
    }

    public void deleteDepartment(String id) {
        generalRepository.deleteDepartment(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "deleteDepartment"));
    }

    // Events
    public List<GeneralEvent> getAllEvents() {
        return generalRepository.findAllEvents();
    }

    public GeneralEvent getEventById(UUID id) {
        return generalRepository.findEventById(id).orElse(null);
    }

    public GeneralEvent createEvent(GeneralEvent event) {
        if (event.getId() == null) {
            event.setId(UUID.randomUUID());
        }
        GeneralEvent saved = generalRepository.saveEvent(event);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "createEvent"));
        return saved;
    }

    public GeneralEvent updateEvent(UUID id, GeneralEvent event) {
        event.setId(id);
        generalRepository.updateEvent(event);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "updateEvent"));
        return event;
    }

    public void deleteEvent(UUID id) {
        generalRepository.deleteEvent(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "deleteEvent"));
    }

    // Tasks
    public List<GeneralTask> getAllTasks() {
        return generalRepository.findAllTasks();
    }

    public GeneralTask getTaskById(UUID id) {
        return generalRepository.findTaskById(id).orElse(null);
    }

    public GeneralTask createTask(GeneralTask task) {
        if (task.getId() == null) {
            task.setId(UUID.randomUUID());
        }
        GeneralTask saved = generalRepository.saveTask(task);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "createTask"));

        if (taskNotificationService != null) {
            try {
                taskNotificationService.onTaskCreated(saved);
            } catch (Exception e) {
                log.error("Failed to execute onTaskCreated for task {}: {}", saved.getId(), e.getMessage(), e);
            }
        } else {
            if (whatsAppNotificationService != null) {
                try {
                    whatsAppNotificationService.sendTaskAssignedNotification(saved);
                } catch (Exception e) {
                    log.error("Failed to send WhatsApp task notification for task {}: {}", saved.getId(), e.getMessage(), e);
                }
            }
            if (pwaNotificationService != null) {
                try {
                    pwaNotificationService.sendTaskPushNotification(saved);
                } catch (Exception e) {
                    log.error("Failed to send PWA push notification for task {}: {}", saved.getId(), e.getMessage(), e);
                }
            }
        }

        return saved;
    }

    public GeneralTask updateTask(UUID id, GeneralTask task) {
        task.setId(id);
        generalRepository.updateTask(task);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "updateTask"));

        if (taskNotificationService != null) {
            try {
                taskNotificationService.onTaskUpdated(task);
            } catch (Exception e) {
                log.error("Failed to execute onTaskUpdated for task {}: {}", id, e.getMessage(), e);
            }
        }

        return task;
    }

    public void deleteTask(UUID id) {
        if (taskNotificationService != null) {
            try {
                taskNotificationService.onTaskDeleted(id);
            } catch (Exception e) {
                log.error("Failed to clean up task notification logs for task {}: {}", id, e.getMessage(), e);
            }
        }
        generalRepository.deleteTask(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "deleteTask"));
    }

    // Locations
    public List<GeneralLocation> getAllLocations() {
        return generalRepository.findAllLocations();
    }

    public GeneralLocation getLocationById(UUID id) {
        return generalRepository.findLocationById(id).orElse(null);
    }

    public GeneralLocation createLocation(GeneralLocation location) {
        if (location.getId() == null) {
            location.setId(UUID.randomUUID());
        }
        GeneralLocation saved = generalRepository.saveLocation(location);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "createLocation"));
        return saved;
    }

    public GeneralLocation updateLocation(UUID id, GeneralLocation location) {
        location.setId(id);
        generalRepository.updateLocation(location);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "updateLocation"));
        return location;
    }

    public void deleteLocation(UUID id) {
        GeneralLocation loc = generalRepository.findLocationById(id)
                .orElseThrow(() -> new IllegalArgumentException("Locația nu a fost găsită."));

        List<String> usageReasons = generalRepository.getLocationUsageReasons(id, loc.getName());
        if (!usageReasons.isEmpty()) {
            throw new IllegalStateException("Nu se poate șterge locația '" + loc.getName() + "': " + String.join(", ", usageReasons) + ".");
        }

        generalRepository.deleteLocation(id);
        eventPublisher.publishEvent(new DashboardDataChangedEvent("General", "deleteLocation"));
    }

    public List<com.charityapp.model.general.DashboardSectionInfo> getAllSectionInfo() {
        return generalRepository.getAllSectionInfo();
    }

    public com.charityapp.model.general.DashboardSectionInfo getSectionInfoByKey(String sectionKey) {
        return generalRepository.getSectionInfoByKey(sectionKey)
                .orElseGet(() -> new com.charityapp.model.general.DashboardSectionInfo(sectionKey, sectionKey, "# " + sectionKey, null, null, null));
    }

    public com.charityapp.model.general.DashboardSectionInfo upsertSectionInfo(String sectionKey, String title, String contentMarkdown, String googleDocUrl, String updatedBy) {
        return generalRepository.upsertSectionInfo(sectionKey, title, contentMarkdown, googleDocUrl, updatedBy);
    }
}

package com.charityapp.service.project;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.dto.project.CreateProjectRequest;
import com.charityapp.dto.project.ProjectPresetDefinition;
import com.charityapp.dto.project.ProjectResponse;
import com.charityapp.dto.project.UpdateProjectModulesRequest;
import com.charityapp.dto.project.UpdateProjectRequest;
import com.charityapp.model.project.ModuleNavigationTab;
import com.charityapp.model.project.Project;
import com.charityapp.model.project.ProjectEnabledModule;
import com.charityapp.model.project.ProjectModuleDescriptor;
import com.charityapp.repository.auth.AdminUserRepository;
import com.charityapp.repository.project.ProjectEnabledModuleRepository;
import com.charityapp.repository.project.ProjectRepository;
import com.charityapp.service.security.SecurityEvaluator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectEnabledModuleRepository moduleRepository;
    private final ProjectModuleRegistry moduleRegistry;
    private final TopologicalDependencyResolver dependencyResolver;
    private AdminUserRepository adminUserRepository;
    private SecurityEvaluator securityEvaluator;

    private static final List<ProjectPresetDefinition> PRESETS = List.of(
        new ProjectPresetDefinition(
            "CUSTOM",
            "presets.custom.name",
            "presets.custom.desc",
            Collections.emptyList()
        )
    );

    public ProjectService(ProjectRepository projectRepository,
                          ProjectEnabledModuleRepository moduleRepository,
                          ProjectModuleRegistry moduleRegistry,
                          TopologicalDependencyResolver dependencyResolver) {
        this.projectRepository = projectRepository;
        this.moduleRepository = moduleRepository;
        this.moduleRegistry = moduleRegistry;
        this.dependencyResolver = dependencyResolver;
    }

    @Autowired(required = false)
    public void setAdminUserRepository(AdminUserRepository adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    @Autowired(required = false)
    public void setSecurityEvaluator(SecurityEvaluator securityEvaluator) {
        this.securityEvaluator = securityEvaluator;
    }

    public List<ProjectPresetDefinition> getPresets() {
        return PRESETS;
    }

    public List<ProjectModuleDescriptor> getModuleRegistry() {
        return moduleRegistry.getAllDescriptors();
    }

    public List<ProjectResponse> listProjects(UUID entityId) {
        List<Project> projects = entityId != null
            ? projectRepository.findByEntityId(entityId)
            : projectRepository.findAll();

        return projects.stream()
            .map(this::buildProjectResponse)
            .collect(Collectors.toList());
    }

    public ProjectResponse getProject(UUID id) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proiectul nu a fost găsit."));
        return buildProjectResponse(project);
    }

    public ProjectResponse getProjectBySlug(String slug) {
        Project project = projectRepository.findBySlug(slug)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proiectul nu a fost găsit."));
        return buildProjectResponse(project);
    }

    public boolean isModuleEnabled(UUID projectId, String moduleId) {
        return moduleRepository.isModuleActive(projectId, moduleId);
    }

    @Transactional
    public ProjectResponse createProject(CreateProjectRequest req, UUID createdBy) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Numele proiectului este obligatoriu.");
        }
        if (req.getEntityId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Identificatorul clubului (entityId) este obligatoriu.");
        }

        String slug = req.getSlug() != null && !req.getSlug().isBlank()
            ? slugify(req.getSlug())
            : slugify(req.getName());

        if (projectRepository.existsBySlug(slug)) {
            slug = slug + "-" + UUID.randomUUID().toString().substring(0, 6);
        }

        if (Boolean.TRUE.equals(req.getInheritHubConfig())) {
            if (createdBy != null && securityEvaluator != null) {
                boolean canInherit = securityEvaluator.hasPermission(createdBy, "projects:config:inherit", com.charityapp.model.auth.ScopeType.GLOBAL, null);
                if (!canInherit) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Nu aveți permisiunea de a moșteni configurația Hub-ului.");
                }
            }
        }

        String presetKey = req.getTemplatePreset() != null ? req.getTemplatePreset().toUpperCase() : "CUSTOM";
        Set<String> requestedModules = new LinkedHashSet<>();

        if (!"CUSTOM".equals(presetKey)) {
            PRESETS.stream()
                .filter(p -> p.getKey().equalsIgnoreCase(presetKey))
                .findFirst()
                .ifPresent(p -> requestedModules.addAll(p.getDefaultModuleIds()));
        }

        if (req.getCustomModuleIds() != null) {
            requestedModules.addAll(req.getCustomModuleIds());
        }

        Set<String> resolvedModules;
        try {
            resolvedModules = dependencyResolver.resolve(requestedModules);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        Project project = new Project(
            UUID.randomUUID(),
            req.getEntityId(),
            req.getName().trim(),
            slug,
            req.getDescription(),
            presetKey,
            "ACTIVE",
            createdBy
        );

        projectRepository.save(project);

        Map<String, String> configs = req.getModuleConfigs() != null ? req.getModuleConfigs() : Collections.emptyMap();
        for (String moduleId : resolvedModules) {
            String configJson = configs.getOrDefault(moduleId, "{}");
            ProjectEnabledModule pem = new ProjectEnabledModule(
                UUID.randomUUID(),
                project.getId(),
                moduleId,
                true,
                configJson,
                createdBy
            );
            moduleRepository.save(pem);
        }

        return buildProjectResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(UUID id, UpdateProjectRequest req) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proiectul nu a fost găsit."));

        if (req.getName() != null && !req.getName().isBlank()) {
            project.setName(req.getName().trim());
        }
        if (req.getDescription() != null) {
            project.setDescription(req.getDescription());
        }
        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            project.setStatus(req.getStatus().trim().toUpperCase());
        }

        projectRepository.update(project);
        return buildProjectResponse(project);
    }

    @Transactional
    public ProjectResponse updateProjectModules(UUID projectId, UpdateProjectModulesRequest req, UUID updatedBy) {
        Project project = projectRepository.findById(projectId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proiectul nu a fost găsit."));

        List<ProjectEnabledModule> currentModules = moduleRepository.findByProjectId(projectId);
        Set<String> currentlyActive = currentModules.stream()
            .filter(ProjectEnabledModule::isActive)
            .map(ProjectEnabledModule::getModuleId)
            .collect(Collectors.toSet());

        Set<String> targetRequested = new LinkedHashSet<>(req.getModuleIds() != null ? req.getModuleIds() : Collections.emptyList());

        // Validate removals if cascadeDisable is false
        if (!req.isCascadeDisable()) {
            for (String active : currentlyActive) {
                if (!targetRequested.contains(active)) {
                    Set<String> dependents = dependencyResolver.findDependents(currentlyActive, active);
                    // Filter dependents that are still planned to be in target
                    Set<String> conflictingDependents = dependents.stream()
                        .filter(targetRequested::contains)
                        .collect(Collectors.toSet());
                    if (!conflictingDependents.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Dezactivarea modulului '" + active + "' afectează modulele dependente active: " + String.join(", ", conflictingDependents));
                    }
                }
            }
        }

        Set<String> resolvedModules;
        try {
            resolvedModules = dependencyResolver.resolve(targetRequested);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        Map<String, String> configs = req.getModuleConfigs() != null ? req.getModuleConfigs() : Collections.emptyMap();

        // 1. Deactivate modules no longer in resolved set (preserve data by setting is_active = false)
        for (ProjectEnabledModule existing : currentModules) {
            if (!resolvedModules.contains(existing.getModuleId()) && existing.isActive()) {
                moduleRepository.deactivate(projectId, existing.getModuleId());
            }
        }

        // 2. Activate or upsert modules in resolved set
        for (String moduleId : resolvedModules) {
            String configJson = configs.get(moduleId);
            Optional<ProjectEnabledModule> existingOpt = currentModules.stream()
                .filter(m -> m.getModuleId().equals(moduleId))
                .findFirst();

            if (existingOpt.isPresent()) {
                ProjectEnabledModule m = existingOpt.get();
                m.setActive(true);
                if (configJson != null) {
                    m.setConfigJson(configJson);
                }
                m.setEnabledBy(updatedBy);
                moduleRepository.save(m);
            } else {
                ProjectEnabledModule m = new ProjectEnabledModule(
                    UUID.randomUUID(),
                    projectId,
                    moduleId,
                    true,
                    configJson != null ? configJson : "{}",
                    updatedBy
                );
                moduleRepository.save(m);
            }
        }

        return buildProjectResponse(project);
    }

    @Transactional
    public void deleteProject(UUID id) {
        deleteProject(id, null);
    }

    @Transactional
    public void deleteProject(UUID id, UUID actorId) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Proiectul nu a fost găsit."));

        if (actorId != null && project.getCreatedBy() != null) {
            boolean isCreator = project.getCreatedBy().equals(actorId);
            boolean isSuper = securityEvaluator != null && securityEvaluator.hasPermission(actorId, "admin:all", com.charityapp.model.auth.ScopeType.GLOBAL, null);
            if (!isCreator && !isSuper) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Doar utilizatorul care a creat proiectul îl poate șterge.");
            }
        }

        moduleRepository.deleteByProjectId(id);
        projectRepository.delete(id);
    }

    private ProjectResponse buildProjectResponse(Project project) {
        List<ProjectEnabledModule> activeModules = moduleRepository.findActiveByProjectId(project.getId());

        List<ModuleNavigationTab> tabs = activeModules.stream()
            .map(m -> moduleRegistry.getDescriptor(m.getModuleId()).orElse(null))
            .filter(Objects::nonNull)
            .flatMap(desc -> desc.getNavigationTabs().stream())
            .sorted(Comparator.comparingInt(ModuleNavigationTab::getOrder))
            .collect(Collectors.toList());

        String createdByName = null;
        if (project.getCreatedBy() != null && adminUserRepository != null) {
            createdByName = adminUserRepository.findById(project.getCreatedBy())
                .map(u -> (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getEmail())
                .orElse(null);
        }

        return ProjectResponse.from(project, activeModules, tabs, createdByName);
    }

    private String slugify(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        String slug = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        slug = slug.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-")
            .replaceAll("-+", "-")
            .replaceAll("^-|-$", "");
        return slug.isBlank() ? "project" : slug;
    }
}

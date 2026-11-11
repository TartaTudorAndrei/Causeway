package com.charityapp.service.project;

import com.charityapp.dto.project.CreateProjectRequest;
import com.charityapp.dto.project.ProjectResponse;
import com.charityapp.dto.project.UpdateProjectModulesRequest;
import com.charityapp.dto.project.UpdateProjectRequest;
import com.charityapp.model.project.Project;
import com.charityapp.model.project.ProjectEnabledModule;
import com.charityapp.repository.project.ProjectEnabledModuleRepository;
import com.charityapp.repository.project.ProjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProjectServiceTest {

    private ProjectRepository projectRepository;
    private ProjectEnabledModuleRepository moduleRepository;
    private ProjectModuleRegistry moduleRegistry;
    private TopologicalDependencyResolver dependencyResolver;
    private ProjectService projectService;

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        moduleRepository = mock(ProjectEnabledModuleRepository.class);
        moduleRegistry = new ProjectModuleRegistry();
        dependencyResolver = new TopologicalDependencyResolver(moduleRegistry);
        projectService = new ProjectService(projectRepository, moduleRepository, moduleRegistry, dependencyResolver);
    }

    @Test
    @DisplayName("Create project with custom modules auto-enables modules")
    void testCreateWithPreset() {
        UUID entityId = UUID.randomUUID();
        UUID adminId = UUID.randomUUID();

        CreateProjectRequest req = new CreateProjectRequest();
        req.setEntityId(entityId);
        req.setName("Bancă de Alimente");
        req.setTemplatePreset("CUSTOM");
        req.setCustomModuleIds(List.of(
            "mod.logistics.inventory",
            "mod.logistics.history",
            "mod.hr.stands",
            "mod.hr.feedback"
        ));

        when(projectRepository.existsBySlug(any())).thenReturn(false);
        when(projectRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(moduleRepository.findActiveByProjectId(any())).thenReturn(Collections.emptyList());

        ProjectResponse response = projectService.createProject(req, adminId);

        assertNotNull(response);
        assertEquals("banca-de-alimente", response.getSlug());
        assertEquals("CUSTOM", response.getTemplatePreset());

        // Verify module saves
        ArgumentCaptor<ProjectEnabledModule> captor = ArgumentCaptor.forClass(ProjectEnabledModule.class);
        verify(moduleRepository, times(4)).save(captor.capture());

        List<String> savedModuleIds = captor.getAllValues().stream()
            .map(ProjectEnabledModule::getModuleId)
            .toList();

        assertTrue(savedModuleIds.contains("mod.logistics.inventory"));
        assertTrue(savedModuleIds.contains("mod.logistics.history"));
        assertTrue(savedModuleIds.contains("mod.hr.stands"));
        assertTrue(savedModuleIds.contains("mod.hr.feedback"));
    }

    @Test
    @DisplayName("Create project with custom modules resolves forward cascade")
    void testCreateWithCustomModules() {
        UUID entityId = UUID.randomUUID();
        CreateProjectRequest req = new CreateProjectRequest();
        req.setEntityId(entityId);
        req.setName("Campanie Ajutor");
        req.setTemplatePreset("CUSTOM");
        req.setCustomModuleIds(List.of("mod.logistics.history")); // Requires mod.logistics.inventory

        when(projectRepository.existsBySlug(any())).thenReturn(false);
        when(projectRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.createProject(req, null);

        ArgumentCaptor<ProjectEnabledModule> captor = ArgumentCaptor.forClass(ProjectEnabledModule.class);
        verify(moduleRepository, times(2)).save(captor.capture());

        List<String> savedModuleIds = captor.getAllValues().stream()
            .map(ProjectEnabledModule::getModuleId)
            .toList();

        assertTrue(savedModuleIds.contains("mod.logistics.inventory"));
        assertTrue(savedModuleIds.contains("mod.logistics.history"));
    }

    @Test
    @DisplayName("Update project details updates name and status")
    void testUpdateProject() {
        UUID projectId = UUID.randomUUID();
        Project existing = new Project(projectId, UUID.randomUUID(), "Old Name", "old-slug", "Desc", "CUSTOM", "ACTIVE", null);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existing));
        when(moduleRepository.findActiveByProjectId(projectId)).thenReturn(Collections.emptyList());

        UpdateProjectRequest updateReq = new UpdateProjectRequest();
        updateReq.setName("New Project Name");
        updateReq.setStatus("ARCHIVED");

        ProjectResponse response = projectService.updateProject(projectId, updateReq);
        assertEquals("New Project Name", response.getName());
        assertEquals("ARCHIVED", response.getStatus());
        verify(projectRepository).update(any());
    }

    @Test
    @DisplayName("Update project modules with cascade deactivates inactive modules")
    void testUpdateProjectModules() {
        UUID projectId = UUID.randomUUID();
        Project existing = new Project(projectId, UUID.randomUUID(), "Test Project", "test-project", "Desc", "CUSTOM", "ACTIVE", null);

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(existing));

        List<ProjectEnabledModule> currentModules = new ArrayList<>();
        currentModules.add(new ProjectEnabledModule(UUID.randomUUID(), projectId, "mod.general.tasks", true, "{}", null));
        currentModules.add(new ProjectEnabledModule(UUID.randomUUID(), projectId, "mod.general.calendar", true, "{}", null));

        when(moduleRepository.findByProjectId(projectId)).thenReturn(currentModules);
        when(moduleRepository.findActiveByProjectId(projectId)).thenReturn(Collections.emptyList());

        UpdateProjectModulesRequest updateReq = new UpdateProjectModulesRequest();
        updateReq.setModuleIds(List.of("mod.finance.expenses")); // Removing tasks and calendar
        updateReq.setCascadeDisable(true);

        projectService.updateProjectModules(projectId, updateReq, null);

        verify(moduleRepository).deactivate(projectId, "mod.general.tasks");
        verify(moduleRepository).deactivate(projectId, "mod.general.calendar");
        verify(moduleRepository).save(any());
    }
}

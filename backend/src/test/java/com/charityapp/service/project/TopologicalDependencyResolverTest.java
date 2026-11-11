package com.charityapp.service.project;

import com.charityapp.model.project.ModuleCategory;
import com.charityapp.model.project.ProjectModuleDescriptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TopologicalDependencyResolverTest {

    private ProjectModuleRegistry registry;
    private TopologicalDependencyResolver resolver;

    @BeforeEach
    void setUp() {
        registry = new ProjectModuleRegistry();
        resolver = new TopologicalDependencyResolver(registry);
    }

    @Test
    @DisplayName("Forward Cascade: Requesting feedback automatically pulls in HR stands prerequisite")
    void testForwardCascade() {
        Set<String> requested = Set.of("mod.hr.feedback");
        Set<String> resolved = resolver.resolve(requested);

        assertTrue(resolved.contains("mod.hr.feedback"));
        assertTrue(resolved.contains("mod.hr.stands"), "Should auto-include prerequisite mod.hr.stands");
    }

    @Test
    @DisplayName("Forward Cascade: Requesting predictor pulls in logistics inventory")
    void testLogisticsCascade() {
        Set<String> requested = Set.of("mod.logistics.predictor");
        Set<String> resolved = resolver.resolve(requested);

        assertTrue(resolved.contains("mod.logistics.predictor"));
        assertTrue(resolved.contains("mod.logistics.inventory"), "Should auto-include prerequisite mod.logistics.inventory");
    }

    @Test
    @DisplayName("Conflict Detection: Throws when conflicting modules are requested")
    void testConflictDetection() {
        registry.registerModule(new ProjectModuleDescriptor(
            "mod.custom.a", "mod.custom.a.name", ModuleCategory.GENERAL,
            Collections.emptyList(), List.of("mod.custom.b"), Collections.emptyList(), Collections.emptyList(),
            Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(), false
        ));
        registry.registerModule(new ProjectModuleDescriptor(
            "mod.custom.b", "mod.custom.b.name", ModuleCategory.GENERAL,
            Collections.emptyList(), List.of("mod.custom.a"), Collections.emptyList(), Collections.emptyList(),
            Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(), false
        ));

        Set<String> requested = Set.of("mod.custom.a", "mod.custom.b");
        assertThrows(IllegalArgumentException.class, () -> resolver.resolve(requested));
    }

    @Test
    @DisplayName("Reverse Cascade: Disabling stands fails when feedback is active without cascade flag")
    void testReverseCascadeSafeguard() {
        Set<String> active = Set.of("mod.hr.stands", "mod.hr.feedback");
        
        Set<String> dependents = resolver.findDependents(active, "mod.hr.stands");
        assertTrue(dependents.contains("mod.hr.feedback"));

        assertThrows(IllegalStateException.class, () -> 
            resolver.resolveDisable(active, "mod.hr.stands", false)
        );

        // With cascade=true, it should succeed and drop both
        Set<String> afterCascade = resolver.resolveDisable(active, "mod.hr.stands", true);
        assertFalse(afterCascade.contains("mod.hr.stands"));
        assertFalse(afterCascade.contains("mod.hr.feedback"));
    }

    @Test
    @DisplayName("Cycle Detection: Throws when circular dependency is registered")
    void testCycleDetection() {
        ProjectModuleRegistry cycleRegistry = new ProjectModuleRegistry();
        cycleRegistry.registerModule(new ProjectModuleDescriptor(
            "mod.cycle.x", "mod.cycle.x", ModuleCategory.GENERAL,
            List.of("mod.cycle.y"), Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
            Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(), false
        ));
        cycleRegistry.registerModule(new ProjectModuleDescriptor(
            "mod.cycle.y", "mod.cycle.y", ModuleCategory.GENERAL,
            List.of("mod.cycle.x"), Collections.emptyList(), Collections.emptyList(), Collections.emptyList(),
            Collections.emptyList(), Collections.emptyList(), Collections.emptyMap(), false
        ));

        assertThrows(IllegalStateException.class, () -> new TopologicalDependencyResolver(cycleRegistry));
    }
}

package com.charityapp.service.project;

import com.charityapp.model.project.ProjectModuleDescriptor;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
public class TopologicalDependencyResolver {

    private final ProjectModuleRegistry registry;

    public TopologicalDependencyResolver(ProjectModuleRegistry registry) {
        this.registry = registry;
        validateRegistryAcyclic();
    }

    /**
     * Resolves all dependencies for a requested set of module IDs.
     * Automatically pulls in prerequisites (Forward Cascade),
     * auto-activates composite bridge modules if their requirements are met,
     * and verifies there are no conflicts.
     */
    public Set<String> resolve(Set<String> requestedModuleIds) {
        if (requestedModuleIds == null || requestedModuleIds.isEmpty()) {
            return Collections.emptySet();
        }

        Set<String> resolved = new LinkedHashSet<>();
        Deque<String> queue = new ArrayDeque<>(requestedModuleIds);

        while (!queue.isEmpty()) {
            String current = queue.poll();
            if (resolved.contains(current)) {
                continue;
            }

            Optional<ProjectModuleDescriptor> descOpt = registry.getDescriptor(current);
            if (descOpt.isEmpty()) {
                throw new IllegalArgumentException("Modul necunoscut: " + current);
            }

            ProjectModuleDescriptor descriptor = descOpt.get();
            resolved.add(current);

            // Forward cascade: add all required dependencies to queue
            if (descriptor.getDependencies() != null) {
                for (String dep : descriptor.getDependencies()) {
                    if (!resolved.contains(dep)) {
                        queue.add(dep);
                    }
                }
            }
        }

        // Auto-activate composite / bridge modules whose dependencies are completely satisfied
        boolean addedBridge;
        do {
            addedBridge = false;
            for (ProjectModuleDescriptor descriptor : registry.getAllDescriptors()) {
                if (descriptor.isBridge() && !resolved.contains(descriptor.getId())) {
                    if (descriptor.getDependencies() != null && !descriptor.getDependencies().isEmpty()) {
                        if (resolved.containsAll(descriptor.getDependencies())) {
                            resolved.add(descriptor.getId());
                            addedBridge = true;
                        }
                    }
                }
            }
        } while (addedBridge);

        // Validate conflicts
        for (String modId : resolved) {
            ProjectModuleDescriptor desc = registry.getDescriptor(modId).orElse(null);
            if (desc != null && desc.getConflictsWith() != null) {
                for (String conflictId : desc.getConflictsWith()) {
                    if (resolved.contains(conflictId)) {
                        throw new IllegalArgumentException("Conflict detectat între modulele: " + modId + " și " + conflictId);
                    }
                }
            }
        }

        return resolved;
    }

    /**
     * Finds active modules that directly or transitively depend on moduleToDisable.
     */
    public Set<String> findDependents(Set<String> activeModules, String moduleToDisable) {
        if (activeModules == null || activeModules.isEmpty() || !activeModules.contains(moduleToDisable)) {
            return Collections.emptySet();
        }

        Set<String> dependents = new LinkedHashSet<>();
        Deque<String> toCheck = new ArrayDeque<>();
        toCheck.add(moduleToDisable);

        while (!toCheck.isEmpty()) {
            String current = toCheck.poll();
            for (String activeModId : activeModules) {
                if (activeModId.equals(moduleToDisable) || dependents.contains(activeModId)) {
                    continue;
                }
                ProjectModuleDescriptor desc = registry.getDescriptor(activeModId).orElse(null);
                if (desc != null && desc.getDependencies() != null && desc.getDependencies().contains(current)) {
                    dependents.add(activeModId);
                    toCheck.add(activeModId);
                }
            }
        }

        return dependents;
    }

    /**
     * Disables a module. If cascade is true, also disables all dependent modules.
     * Otherwise throws an error if dependents exist.
     */
    public Set<String> resolveDisable(Set<String> activeModules, String moduleToDisable, boolean cascade) {
        if (activeModules == null || !activeModules.contains(moduleToDisable)) {
            return activeModules != null ? new LinkedHashSet<>(activeModules) : Collections.emptySet();
        }

        Set<String> dependents = findDependents(activeModules, moduleToDisable);
        if (!dependents.isEmpty() && !cascade) {
            throw new IllegalStateException("Nu se poate dezactiva modulul '" + moduleToDisable + 
                "'. Următoarele module active depind de el: " + String.join(", ", dependents));
        }

        Set<String> newActive = new LinkedHashSet<>(activeModules);
        newActive.remove(moduleToDisable);
        newActive.removeAll(dependents);

        // Also check if any bridge modules lost their required dependencies
        List<String> bridgesToRemove = new ArrayList<>();
        for (String activeModId : newActive) {
            ProjectModuleDescriptor desc = registry.getDescriptor(activeModId).orElse(null);
            if (desc != null && desc.isBridge()) {
                if (desc.getDependencies() != null && !newActive.containsAll(desc.getDependencies())) {
                    bridgesToRemove.add(activeModId);
                }
            }
        }
        newActive.removeAll(bridgesToRemove);

        return newActive;
    }

    /**
     * Verifies that the global module dependency graph has no cycles.
     */
    public void validateRegistryAcyclic() {
        Set<String> visited = new HashSet<>();
        Set<String> recursionStack = new HashSet<>();

        for (ProjectModuleDescriptor descriptor : registry.getAllDescriptors()) {
            if (!visited.contains(descriptor.getId())) {
                checkCycleDfs(descriptor.getId(), visited, recursionStack);
            }
        }
    }

    private void checkCycleDfs(String moduleId, Set<String> visited, Set<String> recursionStack) {
        visited.add(moduleId);
        recursionStack.add(moduleId);

        ProjectModuleDescriptor desc = registry.getDescriptor(moduleId).orElse(null);
        if (desc != null && desc.getDependencies() != null) {
            for (String dep : desc.getDependencies()) {
                if (!visited.contains(dep)) {
                    checkCycleDfs(dep, visited, recursionStack);
                } else if (recursionStack.contains(dep)) {
                    throw new IllegalStateException("Dependență circulară detectată în module: " + moduleId + " -> " + dep);
                }
            }
        }

        recursionStack.remove(moduleId);
    }
}

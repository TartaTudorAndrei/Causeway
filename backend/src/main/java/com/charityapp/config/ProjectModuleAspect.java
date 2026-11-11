package com.charityapp.config;

import com.charityapp.service.project.ProjectService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Aspect
@Component
public class ProjectModuleAspect {

    private final ProjectService projectService;

    public ProjectModuleAspect(ProjectService projectService) {
        this.projectService = projectService;
    }

    @Before("@annotation(requireProjectModule)")
    public void checkProjectModule(JoinPoint joinPoint, RequireProjectModule requireProjectModule) {
        String moduleId = requireProjectModule.value();
        if (moduleId == null || moduleId.isBlank()) {
            moduleId = requireProjectModule.moduleId();
        }

        if (moduleId == null || moduleId.isBlank()) {
            return;
        }

        String paramName = requireProjectModule.projectIdParam();
        UUID projectId = extractProjectId(joinPoint, paramName);

        if (projectId != null) {
            boolean enabled = projectService.isModuleEnabled(projectId, moduleId);
            if (!enabled) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Modulul '" + moduleId + "' nu este activat pentru proiectul specificat."
                );
            }
        }
    }

    private UUID extractProjectId(JoinPoint joinPoint, String paramName) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String[] parameterNames = signature.getParameterNames();
        Object[] args = joinPoint.getArgs();

        if (parameterNames != null) {
            for (int i = 0; i < parameterNames.length; i++) {
                if (parameterNames[i].equalsIgnoreCase(paramName) || parameterNames[i].equalsIgnoreCase("id") || parameterNames[i].equalsIgnoreCase("projectId")) {
                    Object arg = args[i];
                    if (arg instanceof UUID) {
                        return (UUID) arg;
                    } else if (arg instanceof String) {
                        try {
                            return UUID.fromString((String) arg);
                        } catch (IllegalArgumentException ignored) {
                        }
                    }
                }
            }
        }
        return null;
    }
}

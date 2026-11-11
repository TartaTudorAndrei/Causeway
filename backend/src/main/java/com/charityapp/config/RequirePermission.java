package com.charityapp.config;

import com.charityapp.model.auth.ScopeType;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermission {
    String code() default "";
    String[] anyOf() default {};
    ScopeType scopeType() default ScopeType.GLOBAL;
    String scopeIdParam() default ""; // Name of path variable or request parameter containing the scope ID (UUID)
}

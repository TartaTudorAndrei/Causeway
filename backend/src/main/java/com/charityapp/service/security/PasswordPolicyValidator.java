package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

@Component
public class PasswordPolicyValidator {

    public static final int MIN_LENGTH = 12;
    public static final int MAX_LENGTH = 128;

    private static final Pattern HAS_UPPERCASE = Pattern.compile("[A-Z]");
    private static final Pattern HAS_LOWERCASE = Pattern.compile("[a-z]");
    private static final Pattern HAS_DIGIT = Pattern.compile("[0-9]");
    private static final Pattern HAS_SPECIAL = Pattern.compile("[^a-zA-Z0-9]");

    /**
     * Validates password complexity. Throws IllegalArgumentException with
     * a user-facing message in Romanian if validation fails.
     */
    public void validate(String password) {
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Parola este obligatorie.");
        }

        List<String> violations = new ArrayList<>();

        if (password.length() < MIN_LENGTH) {
            violations.add("minim " + MIN_LENGTH + " caractere");
        }
        if (password.length() > MAX_LENGTH) {
            violations.add("maxim " + MAX_LENGTH + " caractere");
        }
        if (!HAS_UPPERCASE.matcher(password).find()) {
            violations.add("cel puțin o literă mare");
        }
        if (!HAS_LOWERCASE.matcher(password).find()) {
            violations.add("cel puțin o literă mică");
        }
        if (!HAS_DIGIT.matcher(password).find()) {
            violations.add("cel puțin o cifră");
        }
        if (!HAS_SPECIAL.matcher(password).find()) {
            violations.add("cel puțin un caracter special");
        }

        if (!violations.isEmpty()) {
            throw new IllegalArgumentException(
                "Parola nu îndeplinește cerințele de securitate: " + String.join(", ", violations) + "."
            );
        }
    }
}

package com.charityapp.service.security;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public class EmailExistenceValidator {
    private static final Logger log = LoggerFactory.getLogger(EmailExistenceValidator.class);

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,15}$"
    );

    // List of known temporary/throwaway email domains to reject
    private static final Set<String> DISPOSABLE_DOMAINS = Set.of(
        "mailinator.com", "tempmail.com", "guerrillamail.com", "10minutemail.com",
        "throwawaymail.com", "sharklasers.com", "getairmail.com", "yopmail.com",
        "trashmail.com", "dispostable.com", "maildrop.cc", "fakemailgenerator.com",
        "temp-mail.org", "nada.ltd", "burnermail.io", "crazymailing.com"
    );

    public void validateEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Adresa de email este obligatorie.");
        }

        String trimmedEmail = email.trim();

        if (!EMAIL_PATTERN.matcher(trimmedEmail).matches()) {
            throw new IllegalArgumentException("Formatul adresei de email este invalid.");
        }

        String[] parts = trimmedEmail.split("@");
        if (parts.length != 2) {
            throw new IllegalArgumentException("Formatul adresei de email este invalid.");
        }

        String domain = parts[1].toLowerCase().trim();

        if (DISPOSABLE_DOMAINS.contains(domain)) {
            throw new IllegalArgumentException("Adresele de email temporare sau anonime nu sunt permise.");
        }

        if (!hasValidMailServer(domain)) {
            throw new IllegalArgumentException("Domeniul adresei de email (" + domain + ") nu există sau nu poate primi mesaje.");
        }
    }

    public boolean hasValidMailServer(String domain) {
        if (domain == null || domain.isBlank()) {
            return false;
        }

        if (!domain.contains(".") || domain.startsWith(".") || domain.endsWith(".")) {
            return false;
        }

        try {
            // Fast hostname resolution check with no blocking JNDI overhead
            InetAddress[] addresses = InetAddress.getAllByName(domain);
            return addresses != null && addresses.length > 0;
        } catch (java.net.UnknownHostException e) {
            return false;
        } catch (Exception e) {
            log.warn("Host lookup warning for domain {}: {}, allowing email", domain, e.getMessage());
            return true;
        }
    }
}

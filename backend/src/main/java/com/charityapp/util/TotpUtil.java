package com.charityapp.util;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;

public final class TotpUtil {
    private static final String BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    private static final int TIME_STEP_SECONDS = 30;
    private static final int DIGITS = 6;
    private static final SecureRandom RANDOM = new SecureRandom();

    private TotpUtil() {}

    public static String generateSecret() {
        byte[] buffer = new byte[20]; // 160 bits
        RANDOM.nextBytes(buffer);
        return encodeBase32(buffer);
    }

    public static String generateCode(String base32Secret, long timeSeconds) {
        byte[] key = decodeBase32(base32Secret);
        long counter = timeSeconds / TIME_STEP_SECONDS;
        return generateCodeForCounter(key, counter);
    }

    public static boolean verifyCode(String base32Secret, String code) {
        return verifyCode(base32Secret, code, System.currentTimeMillis() / 1000L);
    }

    public static boolean verifyCode(String base32Secret, String code, long currentTimeSeconds) {
        if (base32Secret == null || code == null) return false;
        String cleanCode = code.trim().replaceAll("\\s+", "");
        if (cleanCode.length() != DIGITS || !cleanCode.matches("\\d+")) return false;

        byte[] key;
        try {
            key = decodeBase32(base32Secret);
        } catch (Exception e) {
            return false;
        }

        long currentCounter = currentTimeSeconds / TIME_STEP_SECONDS;

        // Allow 1 step before and 1 step after for clock skew tolerance (+/- 30s)
        for (int i = -1; i <= 1; i++) {
            String candidate = generateCodeForCounter(key, currentCounter + i);
            if (candidate.equals(cleanCode)) {
                return true;
            }
        }
        return false;
    }

    public static String getOtpAuthUrl(String accountName, String base32Secret, String issuer) {
        try {
            String encodedIssuer = URLEncoder.encode(issuer, StandardCharsets.UTF_8).replace("+", "%20");
            String encodedAccount = URLEncoder.encode(accountName, StandardCharsets.UTF_8).replace("+", "%20");
            return String.format(
                "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
                encodedIssuer, encodedAccount, base32Secret, encodedIssuer, DIGITS, TIME_STEP_SECONDS
            );
        } catch (Exception e) {
            return "otpauth://totp/" + issuer + ":" + accountName + "?secret=" + base32Secret + "&issuer=" + issuer;
        }
    }

    private static String generateCodeForCounter(byte[] key, long counter) {
        try {
            byte[] counterBytes = ByteBuffer.allocate(8).putLong(counter).array();
            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(key, "RAW"));
            byte[] hash = mac.doFinal(counterBytes);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % 1_000_000;
            return String.format("%06d", otp);
        } catch (Exception e) {
            throw new RuntimeException("Error computing TOTP", e);
        }
    }

    public static String encodeBase32(byte[] data) {
        StringBuilder result = new StringBuilder();
        int buffer = 0;
        int bufferLength = 0;
        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bufferLength += 8;
            while (bufferLength >= 5) {
                int index = (buffer >> (bufferLength - 5)) & 0x1F;
                result.append(BASE32_CHARS.charAt(index));
                bufferLength -= 5;
            }
        }
        if (bufferLength > 0) {
            int index = (buffer << (5 - bufferLength)) & 0x1F;
            result.append(BASE32_CHARS.charAt(index));
        }
        return result.toString();
    }

    public static byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase().replaceAll("[^A-Z2-7]", "");
        byte[] bytes = new byte[clean.length() * 5 / 8];
        int buffer = 0;
        int bufferLength = 0;
        int byteIndex = 0;

        for (int i = 0; i < clean.length(); i++) {
            char c = clean.charAt(i);
            int val = BASE32_CHARS.indexOf(c);
            if (val < 0) continue;

            buffer = (buffer << 5) | val;
            bufferLength += 5;

            if (bufferLength >= 8) {
                bytes[byteIndex++] = (byte) ((buffer >> (bufferLength - 8)) & 0xFF);
                bufferLength -= 8;
            }
        }

        if (byteIndex < bytes.length) {
            return Arrays.copyOf(bytes, byteIndex);
        }
        return bytes;
    }
}

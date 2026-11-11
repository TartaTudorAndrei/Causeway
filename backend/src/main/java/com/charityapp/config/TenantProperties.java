package com.charityapp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.tenant")
public class TenantProperties {

    private final Identity identity = new Identity();
    private final Theme theme = new Theme();
    private final Location location = new Location();
    private final Legal legal = new Legal();
    private final Affiliations affiliations = new Affiliations();
    private final Terminology terminology = new Terminology();
    private final Integrations integrations = new Integrations();
    private final Features features = new Features();

    public Identity getIdentity() { return identity; }
    public Theme getTheme() { return theme; }
    public Location getLocation() { return location; }
    public Legal getLegal() { return legal; }
    public Affiliations getAffiliations() { return affiliations; }
    public Terminology getTerminology() { return terminology; }
    public Integrations getIntegrations() { return integrations; }
    public Features getFeatures() { return features; }

    // Convenience delegates
    public String getId() { return identity.getId(); }
    public void setId(String id) { identity.setId(id); }
    public String getName() { return identity.getName(); }
    public void setName(String name) { identity.setName(name); }
    public String getShorthand() { return identity.getShorthand(); }
    public void setShorthand(String shorthand) { identity.setShorthand(shorthand); }
    public String getCity() { return location.getCity(); }
    public void setCity(String city) { location.setCity(city); }

    public static class Identity {
        private String id = "causeway";
        private String name = "Causeway";
        private String shorthand = "CAUSEWAY";
        private String tagline = "General project tagline";
        private String description = "this is a general description for you project, it's used in various places";
        private String missionStatement = "This is a general mission statement for your project, bringing the community together to support meaningful causes.";

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getShorthand() { return shorthand; }
        public void setShorthand(String shorthand) { this.shorthand = shorthand; }
        public String getTagline() { return tagline; }
        public void setTagline(String tagline) { this.tagline = tagline; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getMissionStatement() { return missionStatement; }
        public void setMissionStatement(String missionStatement) { this.missionStatement = missionStatement; }
    }

    public static class Theme {
        private final BrandColors brandColors = new BrandColors();
        private final Assets assets = new Assets();
        private final Styling styling = new Styling();

        public BrandColors getBrandColors() { return brandColors; }
        public Assets getAssets() { return assets; }
        public Styling getStyling() { return styling; }

        public static class BrandColors {
            private String primary = "#0b3323";
            private String secondary = "#59101c";
            private String accent = "#c3984e";
            private String cream = "#f6efe2";
            private String creamDark = "#ebdcb9";
            private String red = "#a32222";
            private String charcoal = "#1e1e1e";

            public String getPrimary() { return primary; }
            public void setPrimary(String primary) { this.primary = primary; }
            public String getSecondary() { return secondary; }
            public void setSecondary(String secondary) { this.secondary = secondary; }
            public String getAccent() { return accent; }
            public void setAccent(String accent) { this.accent = accent; }
            public String getCream() { return cream; }
            public void setCream(String cream) { this.cream = cream; }
            public String getCreamDark() { return creamDark; }
            public void setCreamDark(String creamDark) { this.creamDark = creamDark; }
            public String getRed() { return red; }
            public void setRed(String red) { this.red = red; }
            public String getCharcoal() { return charcoal; }
            public void setCharcoal(String charcoal) { this.charcoal = charcoal; }
        }

        public static class Assets {
            private String logoUrl = "/assets/logo.png";
            private String logoLightUrl = "/assets/logo-light.png";
            private String logoDarkUrl = "/assets/logo-dark.png";
            private String faviconUrl = "/favicon.png";
            private String appleTouchIconUrl = "/icons/apple-touch-icon.png";
            private String pwaIcon192 = "/icons/pwa-192x192.png";
            private String pwaIcon512 = "/icons/pwa-512x512.png";
            private String heroBackgroundImage = "";

            public String getLogoUrl() { return logoUrl; }
            public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }
            public String getLogoLightUrl() { return logoLightUrl; }
            public void setLogoLightUrl(String logoLightUrl) { this.logoLightUrl = logoLightUrl; }
            public String getLogoDarkUrl() { return logoDarkUrl; }
            public void setLogoDarkUrl(String logoDarkUrl) { this.logoDarkUrl = logoDarkUrl; }
            public String getFaviconUrl() { return faviconUrl; }
            public void setFaviconUrl(String faviconUrl) { this.faviconUrl = faviconUrl; }
            public String getAppleTouchIconUrl() { return appleTouchIconUrl; }
            public void setAppleTouchIconUrl(String appleTouchIconUrl) { this.appleTouchIconUrl = appleTouchIconUrl; }
            public String getPwaIcon192() { return pwaIcon192; }
            public void setPwaIcon192(String pwaIcon192) { this.pwaIcon192 = pwaIcon192; }
            public String getPwaIcon512() { return pwaIcon512; }
            public void setPwaIcon512(String pwaIcon512) { this.pwaIcon512 = pwaIcon512; }
            public String getHeroBackgroundImage() { return heroBackgroundImage; }
            public void setHeroBackgroundImage(String heroBackgroundImage) { this.heroBackgroundImage = heroBackgroundImage; }
        }

        public static class Styling {
            private String patternStyle = "argyle";
            private String borderRadius = "rounded-2xl";

            public String getPatternStyle() { return patternStyle; }
            public void setPatternStyle(String patternStyle) { this.patternStyle = patternStyle; }
            public String getBorderRadius() { return borderRadius; }
            public void setBorderRadius(String borderRadius) { this.borderRadius = borderRadius; }
        }
    }

    public static class Location {
        private String city = "general city";
        private String county = "general county";
        private String country = "General Country";
        private String timezone = "Europe/Bucharest";
        private double latitude = 46.7712;
        private double longitude = 23.6236;
        private boolean weatherEnabled = true;

        public String getCity() { return city; }
        public void setCity(String city) { this.city = city; }
        public String getCounty() { return county; }
        public void setCounty(String county) { this.county = county; }
        public String getCountry() { return country; }
        public void setCountry(String country) { this.country = country; }
        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }
        public double getLatitude() { return latitude; }
        public void setLatitude(double latitude) { this.latitude = latitude; }
        public double getLongitude() { return longitude; }
        public void setLongitude(double longitude) { this.longitude = longitude; }
        public boolean isWeatherEnabled() { return weatherEnabled; }
        public void setWeatherEnabled(boolean weatherEnabled) { this.weatherEnabled = weatherEnabled; }
    }

    public static class Legal {
        private String entityName = "General Non-Profit Organization";
        private String taxId = "RO12345678";
        private String registrationNumber = "J12/1234/2020";
        private String headquartersAddress = "General Address, general city";
        private String iban = "RO00AAAA0000000000000000";
        private String bankName = "General Bank";
        private String representativeName = "General Representative";
        private String representativeRole = "Director";

        public String getEntityName() { return entityName; }
        public void setEntityName(String entityName) { this.entityName = entityName; }
        public String getTaxId() { return taxId; }
        public void setTaxId(String taxId) { this.taxId = taxId; }
        public String getRegistrationNumber() { return registrationNumber; }
        public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
        public String getHeadquartersAddress() { return headquartersAddress; }
        public void setHeadquartersAddress(String headquartersAddress) { this.headquartersAddress = headquartersAddress; }
        public String getIban() { return iban; }
        public void setIban(String iban) { this.iban = iban; }
        public String getBankName() { return bankName; }
        public void setBankName(String bankName) { this.bankName = bankName; }
        public String getRepresentativeName() { return representativeName; }
        public void setRepresentativeName(String representativeName) { this.representativeName = representativeName; }
        public String getRepresentativeRole() { return representativeRole; }
        public void setRepresentativeRole(String representativeRole) { this.representativeRole = representativeRole; }
    }

    public static class Affiliations {
        private String categoryLabel = "Club";
        private List<String> categories = new ArrayList<>(List.of("Interact", "Rotaract", "Rotary", "Other"));

        public String getCategoryLabel() { return categoryLabel; }
        public void setCategoryLabel(String categoryLabel) { this.categoryLabel = categoryLabel; }
        public List<String> getCategories() { return categories; }
        public void setCategories(List<String> categories) { this.categories = categories; }
    }

    public static class Terminology {
        private String merchandiseItemSingular = "Articol";
        private String merchandiseItemPlural = "Articole";
        private String campaignSeasonName = "Campania 2026";
        private String standLabelSingular = "Stand";
        private String standLabelPlural = "Standuri";

        public String getMerchandiseItemSingular() { return merchandiseItemSingular; }
        public void setMerchandiseItemSingular(String merchandiseItemSingular) { this.merchandiseItemSingular = merchandiseItemSingular; }
        public String getMerchandiseItemPlural() { return merchandiseItemPlural; }
        public void setMerchandiseItemPlural(String merchandiseItemPlural) { this.merchandiseItemPlural = merchandiseItemPlural; }
        public String getCampaignSeasonName() { return campaignSeasonName; }
        public void setCampaignSeasonName(String campaignSeasonName) { this.campaignSeasonName = campaignSeasonName; }
        public String getStandLabelSingular() { return standLabelSingular; }
        public void setStandLabelSingular(String standLabelSingular) { this.standLabelSingular = standLabelSingular; }
        public String getStandLabelPlural() { return standLabelPlural; }
        public void setStandLabelPlural(String standLabelPlural) { this.standLabelPlural = standLabelPlural; }
    }

    public static class Integrations {
        private String pickupCodePrefix = "APP-";
        private String stripeStatementDescriptor = "CAUSEWAY DONATION";
        private String stripeProductName = "Causeway Donation";
        private String stripeDescription = "Causeway donation";
        private String totpIssuer = "Causeway";
        private String emailSenderName = "Causeway";
        private String emailSenderAddress = "contact@example.org";
        private String whatsAppClientName = "Causeway";
        private String googleDriveFolderName = "Causeway Workspace";
        private String googleSheetsPrefix = "CAUSEWAY";
        private String googleSheetsMasterTitle = "Causeway_Dashboard";
        private String contactEmail = "contact@example.org";
        private String contactPhone = "+40 700 000 000";
        private final SocialLinks socialLinks = new SocialLinks();

        public String getPickupCodePrefix() { return pickupCodePrefix; }
        public void setPickupCodePrefix(String pickupCodePrefix) { this.pickupCodePrefix = pickupCodePrefix; }
        public String getStripeStatementDescriptor() { return stripeStatementDescriptor; }
        public void setStripeStatementDescriptor(String stripeStatementDescriptor) { this.stripeStatementDescriptor = stripeStatementDescriptor; }
        public String getStripeProductName() { return stripeProductName; }
        public void setStripeProductName(String stripeProductName) { this.stripeProductName = stripeProductName; }
        public String getStripeDescription() { return stripeDescription; }
        public void setStripeDescription(String stripeDescription) { this.stripeDescription = stripeDescription; }
        public String getTotpIssuer() { return totpIssuer; }
        public void setTotpIssuer(String totpIssuer) { this.totpIssuer = totpIssuer; }
        public String getEmailSenderName() { return emailSenderName; }
        public void setEmailSenderName(String emailSenderName) { this.emailSenderName = emailSenderName; }
        public String getEmailSenderAddress() { return emailSenderAddress; }
        public void setEmailSenderAddress(String emailSenderAddress) { this.emailSenderAddress = emailSenderAddress; }
        public String getWhatsAppClientName() { return whatsAppClientName; }
        public void setWhatsAppClientName(String whatsAppClientName) { this.whatsAppClientName = whatsAppClientName; }
        public String getGoogleDriveFolderName() { return googleDriveFolderName; }
        public void setGoogleDriveFolderName(String googleDriveFolderName) { this.googleDriveFolderName = googleDriveFolderName; }
        public String getGoogleSheetsPrefix() { return googleSheetsPrefix; }
        public void setGoogleSheetsPrefix(String googleSheetsPrefix) { this.googleSheetsPrefix = googleSheetsPrefix; }
        public String getGoogleSheetsMasterTitle() { return googleSheetsMasterTitle; }
        public void setGoogleSheetsMasterTitle(String googleSheetsMasterTitle) { this.googleSheetsMasterTitle = googleSheetsMasterTitle; }
        public String getContactEmail() { return contactEmail; }
        public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }
        public String getContactPhone() { return contactPhone; }
        public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
        public SocialLinks getSocialLinks() { return socialLinks; }

        public static class SocialLinks {
            private String facebook = "https://facebook.com";
            private String instagram = "https://instagram.com";
            private String linkedin = "";
            private String website = "https://example.org";

            public String getFacebook() { return facebook; }
            public void setFacebook(String facebook) { this.facebook = facebook; }
            public String getInstagram() { return instagram; }
            public void setInstagram(String instagram) { this.instagram = instagram; }
            public String getLinkedin() { return linkedin; }
            public void setLinkedin(String linkedin) { this.linkedin = linkedin; }
            public String getWebsite() { return website; }
            public void setWebsite(String website) { this.website = website; }
        }
    }

    public static class Features {
        private boolean publicLandingPages = true;
        private boolean weatherForecasting = true;
        private boolean standVolunteerSignup = true;
        private boolean onlineDonations = true;
        private boolean emailStudio = true;

        public boolean isPublicLandingPages() { return publicLandingPages; }
        public void setPublicLandingPages(boolean publicLandingPages) { this.publicLandingPages = publicLandingPages; }
        public boolean isWeatherForecasting() { return weatherForecasting; }
        public void setWeatherForecasting(boolean weatherForecasting) { this.weatherForecasting = weatherForecasting; }
        public boolean isStandVolunteerSignup() { return standVolunteerSignup; }
        public void setStandVolunteerSignup(boolean standVolunteerSignup) { this.standVolunteerSignup = standVolunteerSignup; }
        public boolean isOnlineDonations() { return onlineDonations; }
        public void setOnlineDonations(boolean onlineDonations) { this.onlineDonations = onlineDonations; }
        public boolean isEmailStudio() { return emailStudio; }
        public void setEmailStudio(boolean emailStudio) { this.emailStudio = emailStudio; }
    }
}

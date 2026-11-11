package com.charityapp.dto.finance;

import com.charityapp.model.finance.Donation;

public class DonationResponse {
    private Donation donation;
    private boolean pickupStatus;

    public DonationResponse(Donation donation, boolean pickupStatus) {
        this.donation = donation;
        this.pickupStatus = pickupStatus;
    }

    public Donation getDonation() {
        return donation;
    }

    public void setDonation(Donation donation) {
        this.donation = donation;
    }

    public boolean isPickupStatus() {
        return pickupStatus;
    }

    public void setPickupStatus(boolean pickupStatus) {
        this.pickupStatus = pickupStatus;
    }
}

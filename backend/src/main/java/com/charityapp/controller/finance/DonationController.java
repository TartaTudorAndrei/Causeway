package com.charityapp.controller.finance;

import com.charityapp.config.RequirePermission;
import com.charityapp.dto.finance.DonationResponse;
import com.charityapp.repository.finance.DonationPickupRepository;
import com.charityapp.repository.finance.DonationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/donations")
public class DonationController {

    private final DonationRepository donationRepository;
    private final DonationPickupRepository donationPickupRepository;

    public DonationController(DonationRepository donationRepository,
            DonationPickupRepository donationPickupRepository) {
        this.donationRepository = donationRepository;
        this.donationPickupRepository = donationPickupRepository;
    }

    @GetMapping
    @RequirePermission(code = "donations:read")
    public ResponseEntity<List<DonationResponse>> getAllDonations() {
        return ResponseEntity.ok(donationRepository.findAllWithPickupStatus());
    }

    @PutMapping("/{id}/pickup")
    @RequirePermission(code = "donations:write")
    public ResponseEntity<Void> updatePickupStatus(@PathVariable Long id, @RequestBody boolean status) {
        donationPickupRepository.setPickupStatus(id, status);
        return ResponseEntity.ok().build();
    }
}

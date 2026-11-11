package com.charityapp.controller.fundraising;

import com.charityapp.config.RequirePermission;
import com.charityapp.model.fundraising.FundraisingSponsor;
import com.charityapp.service.fundraising.FundraisingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/fundraising")
public class FundraisingController {

    private final FundraisingService fundraisingService;

    public FundraisingController(FundraisingService fundraisingService) {
        this.fundraisingService = fundraisingService;
    }

    @GetMapping("/sponsors")
    @RequirePermission(code = "fundraising:sponsors:read", anyOf = {"fundraising:sponsor:read", "fundraising:leads:view", "fundraising:finished:view", "fundraising:read"})
    public ResponseEntity<List<FundraisingSponsor>> getAllSponsors() {
        return ResponseEntity.ok(fundraisingService.getAllSponsors());
    }

    @GetMapping("/sponsors/{id}")
    @RequirePermission(code = "fundraising:sponsors:read", anyOf = {"fundraising:sponsor:read", "fundraising:leads:view", "fundraising:finished:view", "fundraising:read"})
    public ResponseEntity<FundraisingSponsor> getSponsorById(@PathVariable UUID id) {
        FundraisingSponsor sponsor = fundraisingService.getSponsorById(id);
        if (sponsor == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(sponsor);
    }

    @PostMapping("/sponsors")
    @RequirePermission(code = "fundraising:sponsors:write", anyOf = {"fundraising:sponsor:write", "fundraising:leads:write", "fundraising:write"})
    public ResponseEntity<FundraisingSponsor> createSponsor(@RequestBody FundraisingSponsor sponsor) {
        return ResponseEntity.ok(fundraisingService.createSponsor(sponsor));
    }

    @PutMapping("/sponsors/{id}")
    @RequirePermission(code = "fundraising:sponsors:write", anyOf = {"fundraising:sponsor:write", "fundraising:leads:write", "fundraising:write"})
    public ResponseEntity<FundraisingSponsor> updateSponsor(@PathVariable UUID id, @RequestBody FundraisingSponsor sponsor) {
        FundraisingSponsor updated = fundraisingService.updateSponsor(id, sponsor);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/sponsors/{id}")
    @RequirePermission(code = "fundraising:sponsors:delete", anyOf = {"fundraising:sponsors:write", "fundraising:sponsor:write", "fundraising:write"})
    public ResponseEntity<Void> deleteSponsor(@PathVariable UUID id) {
        fundraisingService.deleteSponsor(id);
        return ResponseEntity.noContent().build();
    }
}

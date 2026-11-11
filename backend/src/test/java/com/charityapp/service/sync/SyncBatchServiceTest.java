package com.charityapp.service.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.charityapp.dto.logistics.StockAdjustmentRequest;
import com.charityapp.dto.sync.OfflineMutationDto;
import com.charityapp.dto.sync.SyncBatchRequest;
import com.charityapp.dto.sync.SyncBatchResponse;
import com.charityapp.model.sync.IdempotencyKey;
import com.charityapp.repository.finance.DonationPickupRepository;
import com.charityapp.repository.sync.IdempotencyKeyRepository;
import com.charityapp.service.finance.FinanceService;
import com.charityapp.service.hr.HrService;
import com.charityapp.service.logistics.LogisticsService;
import com.charityapp.service.sync.SyncBatchService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class SyncBatchServiceTest {

    private IdempotencyKeyRepository idempotencyKeyRepository;
    private LogisticsService logisticsService;
    private FinanceService financeService;
    private HrService hrService;
    private DonationPickupRepository donationPickupRepository;
    private ObjectMapper objectMapper;

    private SyncBatchService syncBatchService;

    @BeforeEach
    public void setUp() {
        idempotencyKeyRepository = Mockito.mock(IdempotencyKeyRepository.class);
        logisticsService = Mockito.mock(LogisticsService.class);
        financeService = Mockito.mock(FinanceService.class);
        hrService = Mockito.mock(HrService.class);
        donationPickupRepository = Mockito.mock(DonationPickupRepository.class);
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

        syncBatchService = new SyncBatchService(
                idempotencyKeyRepository,
                logisticsService,
                financeService,
                hrService,
                donationPickupRepository,
                objectMapper
        );
    }

    @Test
    public void testProcessBatch_AlreadyProcessedIdempotencyKey() {
        String mutationId = "key-already-done";
        when(idempotencyKeyRepository.findByKey(mutationId)).thenReturn(
                Optional.of(new IdempotencyKey(mutationId, "/api/admin/finances/expenses", 200, "{}"))
        );

        OfflineMutationDto mutation = new OfflineMutationDto(
                mutationId,
                "finance",
                "/api/admin/finances/expenses",
                "POST",
                Map.of("name", "Test Expense", "amount", 100),
                System.currentTimeMillis()
        );

        SyncBatchResponse response = syncBatchService.processBatch(new SyncBatchRequest(List.of(mutation)));

        assertNotNull(response);
        assertEquals(1, response.getProcessed().size());
        assertEquals(mutationId, response.getProcessed().get(0));
        verifyNoInteractions(financeService);
    }

    @Test
    public void testProcessBatch_ExecutesLogisticsAdjustment() {
        String mutationId = "adj-key-1";
        when(idempotencyKeyRepository.findByKey(mutationId)).thenReturn(Optional.empty());

        UUID itemId = UUID.randomUUID();
        UUID locId = UUID.randomUUID();

        OfflineMutationDto mutation = new OfflineMutationDto(
                mutationId,
                "logistics",
                "/api/admin/logistics/adjustments",
                "POST",
                Map.of("itemId", itemId.toString(), "locationId", locId.toString(), "newQuantity", 45, "reason", "COUNT"),
                System.currentTimeMillis()
        );

        SyncBatchResponse response = syncBatchService.processBatch(new SyncBatchRequest(List.of(mutation)));

        assertNotNull(response);
        assertEquals(1, response.getProcessed().size());
        assertEquals(mutationId, response.getProcessed().get(0));
        verify(logisticsService).adjustStock(any(StockAdjustmentRequest.class));
        verify(idempotencyKeyRepository).save(any(IdempotencyKey.class));
    }
}

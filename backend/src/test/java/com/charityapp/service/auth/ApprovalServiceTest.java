package com.charityapp.service.auth;
import com.charityapp.service.auth.*;
import com.charityapp.service.security.*;
import com.charityapp.service.notification.*;
import com.charityapp.service.google.*;
import com.charityapp.service.finance.*;
import com.charityapp.service.general.*;
import com.charityapp.service.logistics.*;

import com.charityapp.model.auth.Approval;
import com.charityapp.model.auth.ApprovalRequest;
import com.charityapp.model.auth.ApprovalStatus;
import com.charityapp.repository.auth.ApprovalRepository;
import com.charityapp.repository.auth.ApprovalRequestRepository;
import com.charityapp.service.auth.ApprovalHandler;
import com.charityapp.service.auth.ApprovalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ApprovalServiceTest {
    private ApprovalRequestRepository requestRepository;
    private ApprovalRepository approvalRepository;
    private ApprovalHandler dummyHandler;
    private ApprovalService approvalService;

    private UUID requesterId;
    private UUID approverId;
    private UUID requestId;

    @BeforeEach
    void setUp() {
        requestRepository = mock(ApprovalRequestRepository.class);
        approvalRepository = mock(ApprovalRepository.class);
        dummyHandler = mock(ApprovalHandler.class);
        
        when(dummyHandler.getActionType()).thenReturn("TEST_ACTION");

        approvalService = new ApprovalService(requestRepository, approvalRepository, List.of(dummyHandler));

        requesterId = UUID.randomUUID();
        approverId = UUID.randomUUID();
        requestId = UUID.randomUUID();
    }

    @Test
    void testSubmitRequest() {
        String payload = "{\"amount\": 100}";
        ApprovalRequest expected = new ApprovalRequest(requesterId, "TEST_ACTION", payload, "finance:approve");
        when(requestRepository.save(any(ApprovalRequest.class))).thenReturn(expected);

        ApprovalRequest result = approvalService.submitRequest(requesterId, "TEST_ACTION", payload, "finance:approve");

        assertNotNull(result);
        assertEquals(requesterId, result.getRequesterId());
        assertEquals("TEST_ACTION", result.getActionType());
        assertEquals(payload, result.getPayload());
    }

    @Test
    void testApproveRequestCallsHandler() {
        String payload = "{\"amount\": 100}";
        ApprovalRequest pendingRequest = new ApprovalRequest(requesterId, "TEST_ACTION", payload, "finance:approve");
        pendingRequest.setId(requestId);

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));

        approvalService.reviewRequest(requestId, approverId, ApprovalStatus.APPROVED, "Looks good");

        // Verify status updated in repo
        ArgumentCaptor<ApprovalRequest> requestCaptor = ArgumentCaptor.forClass(ApprovalRequest.class);
        verify(requestRepository).save(requestCaptor.capture());
        assertEquals(ApprovalStatus.APPROVED, requestCaptor.getValue().getStatus());

        // Verify approval saved
        verify(approvalRepository).save(any(Approval.class));

        // Verify handler was called
        verify(dummyHandler).apply(requesterId, payload);
    }

    @Test
    void testRejectRequestDoesNotCallHandler() {
        String payload = "{\"amount\": 100}";
        ApprovalRequest pendingRequest = new ApprovalRequest(requesterId, "TEST_ACTION", payload, "finance:approve");
        pendingRequest.setId(requestId);

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));

        approvalService.reviewRequest(requestId, approverId, ApprovalStatus.REJECTED, "Too expensive");

        // Verify status updated to REJECTED
        ArgumentCaptor<ApprovalRequest> requestCaptor = ArgumentCaptor.forClass(ApprovalRequest.class);
        verify(requestRepository).save(requestCaptor.capture());
        assertEquals(ApprovalStatus.REJECTED, requestCaptor.getValue().getStatus());

        // Verify handler was NOT called
        verify(dummyHandler, never()).apply(any(UUID.class), anyString());
    }

    @Test
    void testCannotReviewAlreadyProcessedRequest() {
        ApprovalRequest approvedRequest = new ApprovalRequest(requesterId, "TEST_ACTION", "payload", "finance:approve");
        approvedRequest.setId(requestId);
        approvedRequest.setStatus(ApprovalStatus.APPROVED);

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(approvedRequest));

        assertThrows(IllegalStateException.class, () -> {
            approvalService.reviewRequest(requestId, approverId, ApprovalStatus.APPROVED, "approved again");
        });
    }

    @Test
    void testMissingHandlerThrowsException() {
        ApprovalRequest unknownRequest = new ApprovalRequest(requesterId, "UNKNOWN_ACTION", "payload", "finance:approve");
        unknownRequest.setId(requestId);

        when(requestRepository.findById(requestId)).thenReturn(Optional.of(unknownRequest));

        assertThrows(IllegalArgumentException.class, () -> {
            approvalService.reviewRequest(requestId, approverId, ApprovalStatus.APPROVED, "approve unknown");
        });
    }
}

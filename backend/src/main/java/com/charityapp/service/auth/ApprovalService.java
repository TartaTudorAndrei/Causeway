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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ApprovalService {
    private final ApprovalRequestRepository requestRepository;
    private final ApprovalRepository approvalRepository;
    private final Map<String, ApprovalHandler> handlerMap;

    public ApprovalService(ApprovalRequestRepository requestRepository,
                           ApprovalRepository approvalRepository,
                           List<ApprovalHandler> handlers) {
        this.requestRepository = requestRepository;
        this.approvalRepository = approvalRepository;
        // Group handlers by their supported action type
        this.handlerMap = handlers.stream()
                .collect(Collectors.toMap(ApprovalHandler::getActionType, h -> h));
    }

    @Transactional
    public ApprovalRequest submitRequest(UUID requesterId, String actionType, String payloadJson, String requiredPermission) {
        ApprovalRequest request = new ApprovalRequest(requesterId, actionType, payloadJson, requiredPermission);
        return requestRepository.save(request);
    }

    @Transactional
    public Approval reviewRequest(UUID requestId, UUID approverId, ApprovalStatus decision, String comments) {
        ApprovalRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Solicitarea de aprobare nu a fost găsită."));

        if (request.getStatus() != ApprovalStatus.PENDING) {
            throw new IllegalStateException("Această solicitare a fost deja procesată (status: " + request.getStatus() + ").");
        }

        // 1. Save approval record
        Approval approval = new Approval(requestId, approverId, decision, comments);
        approvalRepository.save(approval);

        // 2. Update request status
        request.setStatus(decision);
        requestRepository.save(request);

        // 3. Apply changes if approved
        if (decision == ApprovalStatus.APPROVED) {
            ApprovalHandler handler = handlerMap.get(request.getActionType());
            if (handler == null) {
                throw new IllegalArgumentException("Nu există un handler înregistrat pentru acțiunea: " + request.getActionType());
            }
            handler.apply(request.getRequesterId(), request.getPayload());
        }

        return approval;
    }

    public List<ApprovalRequest> getPendingRequests() {
        return requestRepository.findByStatus(ApprovalStatus.PENDING);
    }

    public Optional<ApprovalRequest> getRequestById(UUID id) {
        return requestRepository.findById(id);
    }

    public List<Approval> getApprovalsForRequest(UUID requestId) {
        return approvalRepository.findByRequestId(requestId);
    }
}

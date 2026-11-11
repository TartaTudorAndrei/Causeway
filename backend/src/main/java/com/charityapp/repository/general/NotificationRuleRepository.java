package com.charityapp.repository.general;

import com.charityapp.model.general.NotificationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NotificationRuleRepository extends JpaRepository<NotificationRule, UUID> {
    List<NotificationRule> findByChannel(String channel);
    List<NotificationRule> findByChannelAndCategory(String channel, String category);
    List<NotificationRule> findByCategory(String category);
    Optional<NotificationRule> findByRuleType(String ruleType);
    List<NotificationRule> findAllByRuleType(String ruleType);
    List<NotificationRule> findByRuleTypeAndActiveTrue(String ruleType);
    List<NotificationRule> findByChannelAndRuleTypeAndActiveTrue(String channel, String ruleType);
    List<NotificationRule> findByActiveTrue();
}

package com.triagex.triage;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class TriageRulesTest {
  @Test void ordinaryNoFlagsDoesNotClaimClinicalCertainty(){
    var decision=TriageRules.evaluate("Routine question",98d,78,37d,2);
    assertEquals("NORMAL",decision.recommended());
  }
  @Test void reportedRedFlagRequestsClinicianReview(){
    var decision=TriageRules.evaluate("Chest pain",null,null,null,null);
    assertEquals("CRITICAL",decision.recommended());
    assertFalse(decision.flags().isEmpty());
  }
  @Test void increasedPainIsReviewReminder(){
    assertEquals("URGENT",TriageRules.evaluate("Pain",97d,82,37d,9).recommended());
  }
}

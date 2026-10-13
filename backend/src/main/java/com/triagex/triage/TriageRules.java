package com.triagex.triage;

import java.util.ArrayList;
import java.util.List;

/**
 * Educational DEMONSTRATION FLAGS ONLY. Not a medical triage scale.
 * A qualified professional MUST review and confirm any priority.
 */
public final class TriageRules {
  private TriageRules() {}
  public record Decision(String recommended, List<String> flags) {}
  public static Decision evaluate(String reported, Double spo2, Integer heartRate, Double temperature, Integer pain) {
    String s = reported == null ? "" : reported.toLowerCase();
    List<String> flags = new ArrayList<>();
    boolean serious=false, review=false;
    if(spo2!=null && spo2<90) { flags.add("Recorded oxygen saturation below 90%; urgent clinician review flag (prototype rule)"); serious=true; }
    if(s.contains("chest pain") || s.contains("chest discomfort")) {flags.add("Chest discomfort reported; prompt clinical evaluation flag"); serious=true;}
    if(s.contains("breathing difficulty") || s.contains("difficulty breathing")) {flags.add("Breathing difficulty reported; prompt clinical evaluation flag"); serious=true;}
    if(pain!=null && pain>=8) {flags.add("High reported pain score; review flag"); review=true;}
    if(temperature!=null && temperature>=39) {flags.add("Elevated recorded temperature; review flag");review=true;}
    if(heartRate!=null && (heartRate<45 || heartRate>130)) {flags.add("Heart-rate observation outside prototype review range");review=true;}
    if(spo2==null || heartRate==null) flags.add("Some vital signs are missing; professional assessment required");
    return new Decision(serious?"CRITICAL":review?"URGENT":"NORMAL",List.copyOf(flags));
  }
}

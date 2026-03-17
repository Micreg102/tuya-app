//package com.tuya.open.spring.boot.sample.service;
//
//import com.tuya.connector.open.messaging.event.BaseTuyaMessage;
//import com.tuya.connector.open.messaging.event.StatusReportMessage;
//import com.tuya.connector.open.messaging.event.UnknownMessage;
//import com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord;
//import com.tuya.open.spring.boot.sample.repository.TemperatureRepository;
//import jakarta.annotation.PostConstruct;
//import lombok.extern.slf4j.Slf4j;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.event.EventListener;
//import org.springframework.stereotype.Service;
//
//import java.time.LocalDateTime;
//import java.util.List;
//import java.util.Map;
//
//@Slf4j
//@Service
//public class TuyaHistoryService {
//
//    @Autowired
//    private TemperatureRepository temperatureRepository;
//
//    @PostConstruct
//    public void init() {
//        System.out.println("#############################################");
//        System.out.println("TUYA HISTORY SERVICE WYSTARTOWAŁ POPRAWNIE!");
//        System.out.println("#############################################");
//    }
//
//    // Używamy JEDNEJ metody dla wszystkich wiadomości Tuya
//    @EventListener
//    public void onTuyaEvent(BaseTuyaMessage event) {
//        // Ten log pokaże się przy KAŻDEJ zmianie temperatury, jeśli dispatcher działa
//        System.out.println(">>> WYKRYTO EVENT TUYA: Typ=" + event.type() + ", Urządzenie=" + event.getDevId());
//
//        if (event instanceof StatusReportMessage) {
//            handleStatusReport((StatusReportMessage) event);
//        } else if (event instanceof UnknownMessage) {
//            // Jeśli to UnknownMessage, sprawdźmy co ma w środku bizData
//            log.warn("### Odebrano UnknownMessage! bizCode chmury to prawdopodobnie: {}", event.type());
//            handleUnknown((UnknownMessage) event);
//        }
//    }
//
//    private void handleStatusReport(StatusReportMessage event) {
//        String devId = event.getDevId();
//        Double temp = null;
//        Double hum = null;
//
//        for (StatusReportMessage.Item item : event.getStatus()) {
//            String code = item.getCode();
//            Object value = item.getValue();
//
//            log.info("Analiza kodu: {} = {}", code, value);
//
//            // Sprawdzamy kody zawierające "temp" lub "hum"
//            if (code.toLowerCase().contains("temp")) {
//                temp = parseDouble(value) / 10.0;
//            } else if (code.toLowerCase().contains("hum")) {
//                hum = parseDouble(value);
//            }
//        }
//
//        if (temp != null) {
//            saveRecord(devId, temp, hum);
//        }
//    }
//
//    // Dodatkowa obsługa, jeśli bizCode to nie "statusReport"
//    private void handleUnknown(UnknownMessage event) {
//        // Tuya czasem wysyła dane w bizData zamiast w statusie
//        Map<String, Object> bizData = event.getBizData();
//        if (bizData != null && bizData.containsKey("temp_current")) {
//            Double temp = parseDouble(bizData.get("temp_current")) / 10.0;
//            saveRecord(event.getDevId(), temp, null);
//        }
//    }
//
//    private void saveRecord(String devId, Double temp, Double hum) {
//        TemperatureRecord record = TemperatureRecord.builder()
//                .deviceId(devId)
//                .temperature(temp)
//                .humidity(hum)
//                .timestamp(LocalDateTime.now())
//                .build();
//
//        temperatureRepository.save(record);
//        System.out.println(">>> SUKCES: Zapisano " + temp + "°C dla " + devId + " do MongoDB");
//    }
//
//    private Double parseDouble(Object value) {
//        try {
//            return Double.parseDouble(value.toString());
//        } catch (Exception e) {
//            return 0.0;
//        }
//    }
//}
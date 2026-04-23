package com.tuya.open.spring.boot.sample.service;

import com.tuya.connector.open.messaging.event.BaseTuyaMessage;
import com.tuya.connector.open.messaging.event.StatusReportMessage;
import com.tuya.connector.open.messaging.event.UnknownMessage;
import com.tuya.open.spring.boot.sample.ability.messaging.msg.DevicePropertyMessage;
import com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord;
import com.tuya.open.spring.boot.sample.repository.TemperatureRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;

@Slf4j
@Service
public class TuyaWebSocketBridge {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private TemperatureRepository temperatureRepository;

    @EventListener
    public void handleTuyaEvent(BaseTuyaMessage event) {
        // 1. Obsługa komunikatów technicznych (np. bicie serca)
        if ("unknown".equals(event.type())) {
            if (event instanceof UnknownMessage) {
                UnknownMessage unknown = (UnknownMessage) event;
                if (unknown.getBizData() == null) {
                    log.debug(">>> BRIDGE: Odebrano Heartbeat/Ping dla: {}", event.getDevId());
                }
            }
            return;
        }

        log.info(">>> BRIDGE: Odebrano event [{}] dla urządzenia: {}", event.type(), event.getDevId());

        // 2. Przesłanie danych do Frontendu (React) przez WebSocket
        messagingTemplate.convertAndSend("/topic/device-updates", event);

        // 3. Przetwarzanie i zapis do bazy danych (MongoDB)
        if (event instanceof StatusReportMessage) {
            handleStatusReport((StatusReportMessage) event);
        } else if (event instanceof DevicePropertyMessage) {
            handlePropertyMessage((DevicePropertyMessage) event);
        }
    }

    /**
     * Obsługa starszego formatu raportów statusu
     */
    private void handleStatusReport(StatusReportMessage event) {
        Double temp = null;
        Double hum = null;
        Integer battery = null;
        String smokeStatus = null;

        for (StatusReportMessage.Item item : event.getStatus()) {
            String code = item.getCode().toLowerCase();
            String value = item.getValue().toString();

            if (code.contains("temp")) {
                temp = Double.parseDouble(value) / 10.0;
            } else if (code.contains("hum")) {
                hum = Double.parseDouble(value);
            } else if (code.contains("battery")) {
                battery = (int) Double.parseDouble(value);
            } else if (code.contains("smoke")) {
                smokeStatus = value;
            }
        }

        if (temp != null || hum != null || battery != null || smokeStatus != null) {
            saveRecord(event.getDevId(), temp, hum, battery, smokeStatus);
        }
    }

    /**
     * Obsługa nowego formatu (Property) - najczęściej używany przez nowe czujniki
     */
    private void handlePropertyMessage(DevicePropertyMessage event) {
        Double temp = null;
        Double hum = null;
        Integer battery = null;
        String smokeStatus = null;

        if (event.getProperties() != null) {
            for (DevicePropertyMessage.PropertyItem item : event.getProperties()) {
                String code = item.getCode().toLowerCase();
                String value = item.getValue().toString();

                log.debug("    Analiza Property: {} | Wartosc: {}", code, value);

                if (code.contains("temp")) {
                    temp = Double.parseDouble(value) / 10.0;
                } else if (code.contains("hum")) {
                    hum = Double.parseDouble(value);
                } else if (code.contains("battery")) {
                    try {

                        battery = (int) Double.parseDouble(value);
                    } catch (NumberFormatException e) {

                        log.warn("Otrzymano tekstowy status baterii: {}", value);
                        if ("high".equalsIgnoreCase(value)) {
                            battery = 100;
                        } else if ("middle".equalsIgnoreCase(value) || "medium".equalsIgnoreCase(value)) {
                            battery = 50;
                        } else if ("low".equalsIgnoreCase(value)) {
                            battery = 10;
                        } else {
                            // Jeśli przyjdzie coś zupełnie innego, ustawiamy na 0 żeby nie wysadzić bazy
                            battery = 0;
                        }
                    }
                } else if (code.contains("smoke_sensor_status") || code.contains("smoke_sensor_state")) {
                    smokeStatus = value;
                }
            }
        }

        if (temp != null || hum != null || battery != null || smokeStatus != null) {
            saveRecord(event.getDevId(), temp, hum, battery, smokeStatus);
        }
    }

    /**
     * Zapis rekordu do MongoDB
     */
    private void saveRecord(String deviceId, Double temp, Double hum, Integer battery, String smokeStatus) {
        try {
            TemperatureRecord record = TemperatureRecord.builder()
                    .deviceId(deviceId)
                    .temperature(temp)
                    .humidity(hum)
                    .battery(battery)
                    .smokeStatus(smokeStatus)
                    .timestamp(LocalDateTime.now())
                    .build();

            temperatureRepository.save(record);

            log.info(">>> MONGO: Sukces! Zapisano dane dla {}: T: {}°C | H: {}% | B: {}% | S: {}",
                    deviceId, temp, hum, battery, smokeStatus);
        } catch (Exception e) {
            log.error(">>> MONGO BŁĄD: Nie udało się zapisać rekordu dla {}: {}", deviceId, e.getMessage());
        }
    }
}
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
        // Log informujący o typie odebranej wiadomości
        if ("unknown".equals(event.type())) {
            System.out.println(">>> DEBUG UNKNOWN: Odebrano surowy komunikat dla: " + event.getDevId());

            // Sprawdźmy, czy UnknownMessage ma jakiekolwiek dane w bizData, 
            // nawet jeśli bizCode jest null
            if (event instanceof UnknownMessage) {
                UnknownMessage unknown = (UnknownMessage) event;
                if (unknown.getBizData() != null) {
                    System.out.println(">>> DANE SYSTEMOWE: " + unknown.getBizData().toString());
                } else {
                    System.out.println(">>> KOMUNIKAT PUSTY (prawdopodobnie Heartbeat/Ping)");
                }
            }
            return;
        }
        System.out.println(">>> BRIDGE: Odebrano event typu [" + event.type() + "] dla urządzenia: " + event.getDevId());

        // Przesyłamy surowy event do Reacta przez WebSocket
        messagingTemplate.convertAndSend("/topic/device-updates", event);

        // Wybieramy odpowiednią metodę przetwarzania w zależności od typu wiadomości
        if (event instanceof StatusReportMessage) {
            handleStatusReport((StatusReportMessage) event);
        } else if (event instanceof DevicePropertyMessage) {
            handlePropertyMessage((DevicePropertyMessage) event);
        }
    }

    /**
     * Obsługa standardowych raportów statusu (starszy format)
     */
    private void handleStatusReport(StatusReportMessage event) {
        Double temp = null;
        Double hum = null;

        for (StatusReportMessage.Item item : event.getStatus()) {
            String code = item.getCode().toLowerCase();
            String value = item.getValue().toString();

            if (code.contains("temp")) {
                temp = Double.parseDouble(value) / 10.0;
            } else if (code.contains("hum")) {
                hum = Double.parseDouble(value);
            }
        }

        if (temp != null) {
            saveRecord(event.getDevId(), temp, hum);
        }
    }

    /**
     * Obsługa wiadomości typu Property (nowy format widoczny w Twoich logach)
     */
    private void handlePropertyMessage(DevicePropertyMessage event) {
        Double temp = null;
        Double hum = null;

        if (event.getProperties() != null) {
            for (DevicePropertyMessage.PropertyItem item : event.getProperties()) {
                String code = item.getCode().toLowerCase();
                String value = item.getValue().toString();

                System.out.println("    Analizuję Property: " + code + " | Wartość: " + value);

                if (code.contains("temp")) {
                    temp = Double.parseDouble(value) / 10.0;
                } else if (code.contains("hum")) {
                    hum = Double.parseDouble(value);
                }
            }
        }

        if (temp != null) {
            saveRecord(event.getDevId(), temp, hum);
        }
    }

    /**
     * Wspólna metoda zapisu do MongoDB
     */
    private void saveRecord(String deviceId, Double temp, Double hum) {
        TemperatureRecord record = TemperatureRecord.builder()
                .deviceId(deviceId)
                .temperature(temp)
                .humidity(hum)
                .timestamp(LocalDateTime.now())
                .build();

        temperatureRepository.save(record);
        System.out.println(">>> MONGO: Sukces! Zapisano " + temp + "°C | " + hum + "% dla " + deviceId);
    }
}
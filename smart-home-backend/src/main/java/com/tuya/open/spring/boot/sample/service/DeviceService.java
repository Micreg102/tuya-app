package com.tuya.open.spring.boot.sample.service;

import com.tuya.connector.open.api.model.PageResult;
import com.tuya.open.spring.boot.sample.ability.api.DeviceConnector;
import com.tuya.open.spring.boot.sample.ability.model.Device;
import com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord;
import com.tuya.open.spring.boot.sample.repository.TemperatureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
 import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SuppressWarnings("all")
@Service
public class DeviceService {
    @Autowired
    DeviceConnector deviceConnector;
    @Autowired
    private TemperatureRepository temperatureRepository;
    //public Device getById(String deviceId) {
    //    return deviceConnector.getById(deviceId);
   // }
    public Device getById(String deviceId) {
        Device device = deviceConnector.getById(deviceId);
        // Jeśli główny endpoint nie zwrócił statusu, pobieramy go osobno
        if (device != null && (device.getStatus() == null || device.getStatus().isEmpty())) {
            device.setStatus(deviceConnector.getStatus(deviceId));
        }
        return device;
    }
    public Boolean command(String deviceId, List<Map<String, Object>> commands) {
        return deviceConnector.command(deviceId, Map.of("commands", commands));
    }
    @CrossOrigin
    @GetMapping("/all")
    public List<Device> getAllDevices() {
        // Przekazujemy parametry: strona 1, rozmiar 20
        PageResult<Device> result = deviceConnector.getList(1, 20);
        if (result != null && result.getList() != null) {
            return result.getList();
        }
        return new ArrayList<>(); // zwracamy pustą listę zamiast błędu, jeśli nic nie ma
    }
    public Map<String, Object> getTemperaturePrediction(String deviceId) {
        // 1. Obliczamy datę sprzed 7 dni (idealne okno czasowe do treningu Propheta)
        Instant now = Instant.now();
        Date sevenDaysAgo = Date.from(now.minus(7, ChronoUnit.DAYS));

        // 2. Pobieramy SUROWE dane dla AI (model potrzebuje gęstych punktów, żeby wyłapać cykl dobowy)
        List<TemperatureRecord> history = temperatureRepository.findByDeviceIdAndTimestampAfterOrderByTimestampDesc(deviceId, sevenDaysAgo);

        List<String> timestamps = new ArrayList<>();
        List<Double> temperatures = new ArrayList<>();

        // 3. Filtrujemy tylko prawidłowe odczyty
        for (TemperatureRecord record : history) {
            if (record.getTemperature() != null && record.getTimestamp() != null) {
                timestamps.add(record.getTimestamp().toString());
                temperatures.add(record.getTemperature());
            }
        }

        // Zabezpieczenie: Prophet potrzebuje przynajmniej kilkudziesięciu punktów do wykrycia sezonowości
        if (temperatures.size() < 24) {
            return Collections.singletonMap("error", "Zbyt mało surowych danych (minimum 24) z ostatnich 7 dni do predykcji cyklu dobowego.");
        }

        // 4. Budujemy paczkę JSON dla Pythona
        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("timestamps", timestamps);
        pythonRequest.put("temperatures", temperatures);
        pythonRequest.put("predict_hours", 12);

        // 5. Wysyłamy HTTP POST do Pythona
        RestTemplate restTemplate = new RestTemplate();
        try {
            return restTemplate.postForObject("http://localhost:8000/predict", pythonRequest, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Nie można połączyć się z serwerem AI: " + e.getMessage());
        }
    }
    public List<TemperatureRecord> getSmartHistory(String deviceId, String range) {
        Instant now = Instant.now();

        if ("today".equals(range)) {
            // Dla "Dzisiaj" chcemy widzieć wszystkie skoki temperatury (np. wietrzenie)
            return temperatureRepository.findTop100ByDeviceIdOrderByTimestampDesc(deviceId);

        } else if ("month".equals(range)) {
            // Dla "Miesiąca" obliczamy datę sprzed 30 dni
            Date thirtyDaysAgo = Date.from(now.minus(30, ChronoUnit.DAYS));
            // MongoDB uśredni tysiące punktów do ~30 dniowych reprezentantów
            return temperatureRepository.findDailyAggregated(deviceId, thirtyDaysAgo);

        } else if ("year".equals(range)) {
            // Dla "Roku" obliczamy datę sprzed 365 dni
            Date oneYearAgo = Date.from(now.minus(365, ChronoUnit.DAYS));
            // Dostaniemy maksymalnie ~365 ładnych uśrednionych kropek
            return temperatureRepository.findDailyAggregated(deviceId, oneYearAgo);

        } else { // "all"
            // Dla "Lifetime" cofamy się o absurdalnie daleki czas (np. 10 lat)
            Date tenYearsAgo = Date.from(now.minus(3650, ChronoUnit.DAYS));
            return temperatureRepository.findDailyAggregated(deviceId, tenYearsAgo);
        }
    }


}

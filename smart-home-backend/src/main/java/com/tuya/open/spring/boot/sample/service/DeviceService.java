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
        // 1. Pobieramy historię (założyłem nazwę metody w repozytorium, dostosuj jeśli masz inną)
        List<TemperatureRecord> history = temperatureRepository.findTop2000ByDeviceIdOrderByTimestampDesc(deviceId);

        List<String> timestamps = new ArrayList<>();
        List<Double> temperatures = new ArrayList<>();

        // 2. Filtrujemy tylko prawidłowe odczyty temperatury z pełnymi datami
        for (TemperatureRecord record : history) {
            if (record.getTemperature() != null && record.getTimestamp() != null) {
                timestamps.add(record.getTimestamp().toString());
                temperatures.add(record.getTemperature());
            }
        }

        // Zabezpieczenie: AI potrzebuje przynajmniej 5 punktów
        if (temperatures.size() < 5) {
            return Collections.singletonMap("error", "Zbyt mało danych do predykcji.");
        }

        // 3. Budujemy paczkę JSON dla Pythona
        Map<String, Object> pythonRequest = new HashMap<>();
        pythonRequest.put("timestamps", timestamps);
        pythonRequest.put("temperatures", temperatures);
        pythonRequest.put("predict_hours", 12);

        // 4. Wysyłamy HTTP POST do Pythona (port 8000)
        RestTemplate restTemplate = new RestTemplate();
        try {
            return restTemplate.postForObject("http://localhost:8000/predict", pythonRequest, Map.class);
        } catch (Exception e) {
            throw new RuntimeException("Nie można połączyć się z serwerem AI na porcie 8000: " + e.getMessage());
        }
    }
    public List<TemperatureRecord> getSmartHistory(String deviceId, String range) {
        if ("today".equals(range)) {
            return temperatureRepository.findTop100ByDeviceIdOrderByTimestampDesc(deviceId);
        } else if ("month".equals(range)) {
            return temperatureRepository.findTop2000ByDeviceIdOrderByTimestampDesc(deviceId);
        } else if ("year".equals(range)) {
            return temperatureRepository.findTop5000ByDeviceIdOrderByTimestampDesc(deviceId);
        } else { // "all"
            return temperatureRepository.findTop10000ByDeviceIdOrderByTimestampDesc(deviceId);
        }
    }


}

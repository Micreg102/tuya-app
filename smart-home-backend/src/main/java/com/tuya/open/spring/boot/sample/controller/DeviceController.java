package com.tuya.open.spring.boot.sample.controller;

import com.tuya.open.spring.boot.sample.ability.model.Device;
import com.tuya.open.spring.boot.sample.service.DeviceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
@CrossOrigin
@RestController
@RequestMapping("/devices")
public class DeviceController {

    @Autowired
    DeviceService deviceService;

    @GetMapping("{device_id}")
    public Device getById(@PathVariable("device_id") String deviceId) {
        return deviceService.getById(deviceId);
    }

    @PostMapping("{device_id}/command")
    public Boolean command(@PathVariable("device_id") String deviceId, @RequestBody List<Map<String, Object>> commands) {
        return deviceService.command(deviceId, commands);
    }
    @GetMapping("/all")
    public List<Device> getAll() {
        return deviceService.getAllDevices();
    }
    @Autowired
    private com.tuya.open.spring.boot.sample.repository.TemperatureRepository temperatureRepository;

    @CrossOrigin
    @GetMapping("/{deviceId}/history")
    public List<com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord> getHistory(@PathVariable String deviceId) {
        return temperatureRepository.findTop100ByDeviceIdOrderByTimestampDesc(deviceId);
    }
    @GetMapping("/test-db")
    public String testDb() {
        com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord test =
                com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord.builder()
                        .deviceId("test-device")
                        .temperature(22.5)
                        .timestamp(java.time.LocalDateTime.now())
                        .build();
        temperatureRepository.save(test);
        return "Zapisano testowy rekord!";
    }
    @GetMapping("/{deviceId}/predict")
    public ResponseEntity<?> predictDeviceTemperature(@PathVariable String deviceId) {
        try {
            return ResponseEntity.ok(deviceService.getTemperaturePrediction(deviceId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}

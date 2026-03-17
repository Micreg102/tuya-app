package com.tuya.open.spring.boot.sample.service;

import com.tuya.connector.open.api.model.PageResult;
import com.tuya.open.spring.boot.sample.ability.api.DeviceConnector;
import com.tuya.open.spring.boot.sample.ability.model.Device;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@SuppressWarnings("all")
@Service
public class DeviceService {
    @Autowired
    DeviceConnector deviceConnector;

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


}

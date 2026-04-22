package com.tuya.open.spring.boot.sample.repository;

import com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TemperatureRepository extends MongoRepository<TemperatureRecord, String> {
    // Pobiera 100 ostatnich wpisów dla danej czujki, od najnowszych
    List<TemperatureRecord> findTop100ByDeviceIdOrderByTimestampDesc(String deviceId);

}
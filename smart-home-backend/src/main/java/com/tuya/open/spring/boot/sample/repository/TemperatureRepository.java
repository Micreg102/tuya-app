package com.tuya.open.spring.boot.sample.repository;

import com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface TemperatureRepository extends MongoRepository<TemperatureRecord, String> {
    List<TemperatureRecord> findTop100ByDeviceIdOrderByTimestampDesc(String deviceId);
    List<TemperatureRecord> findByDeviceIdAndTimestampAfterOrderByTimestampDesc(String deviceId, Date timestamp);
//    List<TemperatureRecord> findTop2000ByDeviceIdOrderByTimestampDesc(String deviceId);
//    List<TemperatureRecord> findTop5000ByDeviceIdOrderByTimestampDesc(String deviceId); // Dla roku
//    List<TemperatureRecord> findTop10000ByDeviceIdOrderByTimestampDesc(String deviceId); // Dla lifetime
@Aggregation(pipeline = {
        // 1. Odsiej tylko to urządzenie i tylko od podanej daty w tył
        "{ '$match': { 'deviceId': ?0, 'timestamp': { '$gte': ?1 } } }",

        // 2. Pogrupuj dane: kluczem jest Dzień (YYYY-MM-DD). Wyciągnij średnie!
        "{ '$group': { " +
                "'_id': { '$dateToString': { 'format': '%Y-%m-%d', 'date': '$timestamp' } }, " +
                "'temperature': { '$avg': '$temperature' }, " +
                "'humidity': { '$avg': '$humidity' }, " +
                "'battery': { '$avg': '$battery' }, " +
                // Zachowujemy pole timestamp, żeby Twój React nie zwariował i wiedział, o której to było
                "'timestamp': { '$first': '$timestamp' } " +
                "} }",

        // 3. Posortuj malejąco po czasie (tak jak oczekuje tego Frontend)
        "{ '$sort': { 'timestamp': -1 } }"
})
List<TemperatureRecord> findDailyAggregated(String deviceId, Date since);
}
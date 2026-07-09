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
@Aggregation(pipeline = {
        "{ '$match': { 'deviceId': ?0, 'timestamp': { '$gte': ?1 } } }",
        "{ '$group': { " +
                "'_id': { '$dateToString': { 'format': '%Y-%m-%d', 'date': '$timestamp' } }, " +
                "'temperature': { '$avg': '$temperature' }, " +
                "'humidity': { '$avg': '$humidity' }, " +
                "'battery': { '$avg': '$battery' }, " +
                "'timestamp': { '$first': '$timestamp' } " +
                "} }",
        "{ '$addFields': { " +
                "'temperature': { '$round': ['$temperature', 1] }, " +
                "'humidity': { '$round': ['$humidity', 1] }, " +
                "'battery': { '$round': ['$battery', 0] } " +
                "} }",
        "{ '$sort': { 'timestamp': -1 } }"
})
List<TemperatureRecord> findDailyAggregated(String deviceId, Date since);
}
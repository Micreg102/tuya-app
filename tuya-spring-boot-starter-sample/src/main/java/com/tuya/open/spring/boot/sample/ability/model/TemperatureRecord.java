package com.tuya.open.spring.boot.sample.ability.model;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "temperature_history")
public class TemperatureRecord {
    @Id
    String id;
    String deviceId;
    Double temperature;
    Double humidity;
    LocalDateTime timestamp;
}
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
    private String id;
    private String deviceId;
    private Double temperature;
    private Double humidity;
    private Integer battery;
    private String smokeStatus;
    private LocalDateTime timestamp;
}
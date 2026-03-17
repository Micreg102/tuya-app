package com.tuya.open.spring.boot.sample.ability.api;

import com.tuya.connector.api.annotations.*;
import com.tuya.connector.open.api.model.PageResult;
import com.tuya.open.spring.boot.sample.ability.model.Device;

import java.util.List;
import java.util.Map;

public interface DeviceConnector {
    @GET("/v1.3/iot-03/devices")
    PageResult<Device> getList(@Query("page_no") int pageNo, @Query("page_size") int pageSize);
    @GET("/v1.0/iot-03/devices/{device_id}/status")
    List<Map<String, Object>> getStatus(@Path("device_id") String deviceId);
    @GET("/v1.1/iot-03/devices/{device_id}")
    Device getById(@Path("device_id") String deviceId);

    @POST("/v1.0/iot-03/devices/{device_id}/commands")
    Boolean command(@Path("device_id") String deviceId, @Body Map<String, Object> commands);
}

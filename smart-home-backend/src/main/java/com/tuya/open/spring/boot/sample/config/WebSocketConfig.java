package com.tuya.open.spring.boot.sample.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Serwer będzie wysyłał powiadomienia na kanały zaczynające się od /topic
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // React będzie się łączył z tym adresem
        registry.addEndpoint("/ws-tuya").setAllowedOriginPatterns("*").withSockJS();
    }
}
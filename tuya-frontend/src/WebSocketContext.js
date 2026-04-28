import React, { createContext, useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Tworzymy kontekst
export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    // Stan przechowujący ostatnią wiadomość z backendu
    const [lastMessage, setLastMessage] = useState(null);

    useEffect(() => {
        const client = new Client({
            brokerURL: 'ws://localhost:8088/ws-tuya',
            connectHeaders: {},
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.webSocketFactory = () => new SockJS('http://localhost:8080/ws-tuya');

        client.onConnect = () => {
            console.log("WebSocket (Context): Połączono!");

            client.subscribe('/topic/device-updates', (message) => {
                const payload = JSON.parse(message.body);
                // Zamiast CustomEvent, aktualizujemy stan Reacta!
                setLastMessage(payload);
            });
        };

        client.activate();
        return () => client.deactivate();
    }, []);

    // Przekazujemy lastMessage do wszystkich dzieci owiniętych w Provider
    return (
        <WebSocketContext.Provider value={lastMessage}>
            {children}
        </WebSocketContext.Provider>
    );
};
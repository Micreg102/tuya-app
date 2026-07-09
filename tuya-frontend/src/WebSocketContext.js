import React, { createContext, useState, useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [lastMessage, setLastMessage] = useState(null);
    useEffect(() => {
        const client = new Client({
            connectHeaders: {},
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });
        client.webSocketFactory = () => new SockJS('/ws-tuya');
        client.onConnect = () => {
            console.log("WebSocket: Połączono");
            client.subscribe('/topic/device-updates', (message) => {
                const payload = JSON.parse(message.body);
                setLastMessage(payload);
            });
        };
        client.activate();
        return () => client.deactivate();
    }, []);
    return (
        <WebSocketContext.Provider value={lastMessage}>
            {children}
        </WebSocketContext.Provider>
    );
};

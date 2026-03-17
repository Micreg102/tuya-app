import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DeviceDetails from './components/DeviceDetails';
import './App.css';

// Importy nowej biblioteki
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

function App() {
    useEffect(() => {
        // Konfiguracja klienta WebSocket
        const client = new Client({
            brokerURL: 'ws://localhost:8080/ws-tuya', // Adres Twojego backendu
            connectHeaders: {},
            debug: (str) => console.log(str),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // Obsługa SockJS (jeśli backend używa .withSockJS())
        client.webSocketFactory = () => new SockJS('http://localhost:8080/ws-tuya');

        client.onConnect = () => {
            console.log("WebSocket: Połączono!");
            // Subskrypcja kanału, na który backend wysyła eventy
            client.subscribe('/topic/device-updates', (message) => {
                const payload = JSON.parse(message.body);
                console.log("WebSocket Update dla:", payload.devId);

                // Rozsyłamy globalny sygnał do kafelków
                const event = new CustomEvent('tuyaUpdate', {
                    detail: { deviceId: payload.devId }
                });
                window.dispatchEvent(event);
            });
        };

        client.activate();
        return () => client.deactivate();
    }, []);

    return (
        <Router>
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/device/:deviceId" element={<DeviceDetails />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
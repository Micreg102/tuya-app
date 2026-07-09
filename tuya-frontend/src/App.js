import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import DeviceDetails from './components/DeviceDetails';
import { WebSocketProvider } from './WebSocketContext';
import './App.css';

function App() {
    return (
        <WebSocketProvider>
            <Router>
                <div className="app-container">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/device/:deviceId" element={<DeviceDetails />} />
                    </Routes>
                </div>
            </Router>
        </WebSocketProvider>
    );
}

export default App;

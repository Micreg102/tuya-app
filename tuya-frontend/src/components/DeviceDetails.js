import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Activity, Cpu, Thermometer, Droplets } from 'lucide-react';
// Importujemy komponenty wykresu
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../App.css';

const DeviceDetails = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [device, setDevice] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // 1. Pobieramy podstawowe info o urządzeniu
        axios.get(`http://localhost:8080/devices/${deviceId}`)
            .then(res => setDevice(res.data))
            .catch(err => console.error(err));

        // 2. Pobieramy historię z MongoDB
        axios.get(`http://localhost:8080/devices/${deviceId}/history`)
            .then(res => {
                // Backend zwraca dane od najnowszych, wykres potrzebuje od najstarszych
                const formattedData = res.data.reverse().map(item => ({
                    ...item,
                    // Formatujemy datę do czytelnej postaci na osi X
                    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }));
                setHistory(formattedData);
            })
            .catch(err => console.error("Błąd pobierania historii:", err));
    }, [deviceId]);

    if (!device) return <div className="loading">Pobieranie szczegółów...</div>;

    return (
        <div className="details-view">
            <button className="back-button" onClick={() => navigate('/')}>
                <ChevronLeft size={20} /> Powrót
            </button>

            <div className="details-hero">
                <div className="hero-header">
                    <h2>{device.name}</h2>
                    <span className={`badge ${device.online ? 'online' : 'offline'}`}>
                        {device.online ? 'Online' : 'Offline'}
                    </span>
                </div>

                {/* --- NOWA SEKCJA: WYKRES --- */}
                <div className="chart-container">
                    <h3><Activity size={18} /> Historia temperatury</h3>
                    {history.length > 0 ? (
                        <div style={{ width: '100%', height: 300, marginTop: '20px' }}>
                            <ResponsiveContainer>
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                    <XAxis dataKey="time" fontSize={12} tickMargin={10} />
                                    <YAxis domain={['auto', 'auto']} unit="°C" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelFormatter={(label) => `Godzina: ${label}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="temperature"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#ef4444' }}
                                        activeDot={{ r: 6 }}
                                        animationDuration={1500}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="no-history">Czekam na pierwsze dane z czujnika...</p>
                    )}
                </div>

                <div className="details-grid">
                    <section className="details-section">
                        <h3><Cpu size={18} /> Specyfikacja</h3>
                        <div className="spec-list">
                            <div className="spec-item"><span>Model:</span> <strong>{device.model}</strong></div>
                            <div className="spec-item"><span>Produkt:</span> <strong>{device.productName}</strong></div>
                            <div className="spec-item"><span>ID:</span> <code>{device.id}</code></div>
                        </div>
                    </section>

                    <section className="details-section">
                        <h3><Activity size={18} /> Aktualny Status</h3>
                        <div className="status-dump">
                            {device.status?.map((s, i) => (
                                <div className="status-row" key={i}>
                                    <span className="code-label">{s.code}: </span>
                                    <span className="value-label">{String(s.value)}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DeviceDetails;
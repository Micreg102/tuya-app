import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Activity, Cpu, Thermometer, Droplets, Battery, ShieldAlert, History } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import '../App.css';

const DeviceDetails = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [device, setDevice] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Pobieramy podstawowe info o urządzeniu
        axios.get(`http://localhost:8080/devices/${deviceId}`)
            .then(res => setDevice(res.data))
            .catch(err => console.error("Błąd pobierania urządzenia:", err));

        // 2. Pobieramy historię z MongoDB
        axios.get(`http://localhost:8080/devices/${deviceId}/history`)
            .then(res => {
                // Backend zwraca dane od najnowszych, wykres potrzebuje od najstarszych (do rysowania od lewej do prawej)
                const formattedData = res.data.reverse().map(item => {
                    const dateObj = new Date(item.timestamp);
                    return {
                        ...item,
                        // Formatujemy datę do osi X i tooltipów
                        time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        fullDate: dateObj.toLocaleString()
                    };
                });
                setHistory(formattedData);
            })
            .catch(err => console.error("Błąd pobierania historii:", err))
            .finally(() => setLoading(false));
    }, [deviceId]);

    if (loading || !device) return <div className="loading">Ładowanie szczegółów...</div>;

    // Sprawdzamy typ urządzenia, aby wyświetlić odpowiedni wykres
    const isSmokeSensor = device.category === 'sensor' || device.category === 'cs';

    // Filtrujemy tylko te wpisy z historii, gdzie był alarm dymu (do osi czasu)
    const alarmEvents = history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1');

    return (
        <div className="details-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', color: '#f8fafc' }}>
            {/* NAGŁÓWEK */}
            <div className="details-header" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                <button onClick={() => navigate(-1)} style={{ background: '#334155', border: 'none', color: 'white', padding: '10px', borderRadius: '50%', cursor: 'pointer' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2>{device.name}</h2>
            </div>

            {/* SEKCJA GŁÓWNA - WYKRESY / HISTORIA */}
            <div className="chart-section" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: '#3b82f6' }}>
                    <History size={20} />
                    Historia Odczytów
                </h3>

                {history.length > 0 ? (
                    <div style={{ height: '350px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {isSmokeSensor ? (
                                // WYKRES DLA CZUJNIKA DYMU (Bateria)
                                <AreaChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="time" stroke="#94a3b8" />
                                    <YAxis domain={['auto', 100]} stroke="#10b981" />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} labelStyle={{ color: '#94a3b8' }} />
                                    <Legend />
                                    <Area type="stepAfter" dataKey="battery" name="Poziom Baterii (%)" stroke="#10b981" fill="#047857" fillOpacity={0.3} />
                                </AreaChart>
                            ) : (
                                // WYKRES DLA CZUJNIKA KLIMATU (Temp + Wilgotność na dwóch osiach Y)
                                <LineChart data={history} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" />
                                    <YAxis yAxisId="left" stroke="#ef4444" domain={['auto', 'auto']} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temperatura (°C)" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="humidity" name="Wilgotność (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="no-history" style={{ color: '#94a3b8', textAlign: 'center', padding: '40px 0' }}>
                        Czekam na pierwsze dane z czujnika w bazie MongoDB...
                    </p>
                )}
            </div>

            {/* SEKCJA ZDARZEŃ ALARMOWYCH (Tylko dla czujnika dymu) */}
            {isSmokeSensor && alarmEvents.length > 0 && (
                <div className="alarms-section" style={{ background: '#450a0a', padding: '20px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #7f1d1d' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', marginBottom: '15px' }}>
                        <ShieldAlert size={20} />
                        Ostatnie Alarmy
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {alarmEvents.slice(-5).reverse().map((event, index) => (
                            <li key={index} style={{ padding: '10px 0', borderBottom: '1px solid #7f1d1d', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#f8fafc' }}>Wykryto zagrożenie (Alarm)</span>
                                <span style={{ color: '#fca5a5' }}>{event.fullDate}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* DOLNA SIATKA - SPECYFIKACJA I STATUS (Twoja oryginalna struktura) */}
            <div className="details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <section className="details-section" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#cbd5e1' }}><Cpu size={18} /> Specyfikacja</h3>
                    <div className="spec-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#94a3b8' }}>
                        <div className="spec-item"><span>Model:</span> <strong style={{ color: '#f8fafc' }}>{device.model}</strong></div>
                        <div className="spec-item"><span>Produkt:</span> <strong style={{ color: '#f8fafc' }}>{device.productName}</strong></div>
                        <div className="spec-item"><span>Kategoria:</span> <strong style={{ color: '#f8fafc' }}>{device.category}</strong></div>
                        <div className="spec-item"><span>ID:</span> <code style={{ background: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>{device.id}</code></div>
                    </div>
                </section>

                <section className="details-section" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#cbd5e1' }}><Activity size={18} /> Aktualny Status (Dane Surowe)</h3>
                    <div className="status-dump" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {device.status?.map((s, i) => (
                            <div className="status-row" key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#0f172a', borderRadius: '6px' }}>
                                <span className="code-label" style={{ color: '#94a3b8' }}>{s.code}: </span>
                                <span className="value-label" style={{ color: '#10b981', fontWeight: 'bold' }}>{String(s.value)}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DeviceDetails;
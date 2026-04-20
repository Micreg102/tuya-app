import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Activity, Cpu, Thermometer, Droplets, Battery, ShieldAlert,Siren, History } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import '../App.css';

const DeviceDetails = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [device, setDevice] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('today');


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
                console.log("Dane pobrane z bazy:", formattedData);
            })
            .catch(err => console.error("Błąd pobierania historii:", err))
            .finally(() => setLoading(false));
    }, [deviceId]);

    if (loading || !device) return <div className="loading">Ładowanie szczegółów...</div>;

    // Sprawdzamy typ urządzenia, aby wyświetlić odpowiedni wykres
    const isSmokeSensor = device.category === 'sensor' || device.category === 'cs';
    const filteredHistory = history.filter(item => {
        const itemDate = new Date(item.timestamp);
        const now = new Date();
        if (timeRange === 'today') return itemDate > new Date(now.setHours(0,0,0,0));
        if (timeRange === 'week') return itemDate > new Date(now.setDate(now.getDate() - 7));
        return true; // dla 'lifetime'
    });
    // Filtrujemy tylko te wpisy z historii, gdzie był alarm dymu (do osi czasu)
    const alarmEvents = history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1');

    return (
        <div className="min-h-screen bg-gray-50 p-6 text-gray-900">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors">
                    <ChevronLeft size={20} /> Powrót
                </button>

                <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
                    <h1 className="text-3xl font-black mb-2">{device.name}</h1>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">{device.productName}</p>

                    <div className="mt-8">
                        <h3 className="flex items-center gap-2 font-black mb-6 text-gray-400 uppercase text-xs tracking-widest">
                            <History size={16} /> {isSmokeSensor ? 'Historia Alarmów i Zasilania' : 'Historia Klimatu'}
                        </h3>
                        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                            {['today', 'week', 'year', 'all'].map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        timeRange === range ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {range === 'today' ? 'Dzisiaj' : range === 'week' ? 'Tydzień' : range === 'year' ? 'Rok' : 'Wszystko'}
                                </button>
                            ))}
                        </div>
                        <div className="h-[300px] w-full">


                            <ResponsiveContainer width="100%" height="100%">
                                {isSmokeSensor ? (
                                    // WYKRES BATERII DLA DYMU
                                    <AreaChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="time" stroke="#cbd5e1" fontSize={11} />
                                        <YAxis stroke="#cbd5e1" fontSize={11} domain={[0, 100]} />
                                        <Tooltip />
                                        <Area type="stepAfter" dataKey="battery" name="Bateria (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                                    </AreaChart>
                                ) : (
                                    // WYKRES TEMP/HUM DLA KLIMATU
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="time" stroke="#cbd5e1" fontSize={11} />
                                        <YAxis yAxisId="left" stroke="#ef4444" fontSize={11} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} />
                                        <Tooltip />
                                        <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#ef4444" strokeWidth={3} dot={false} />
                                        <Line yAxisId="right" type="monotone" dataKey="humidity" name="Wilgotność (%)" stroke="#3b82f6" strokeWidth={3} dot={false} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* DODATKOWA LISTA ZDARZEŃ DLA CZUJNIKA DYMU */}
                {isSmokeSensor && (
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
                        <h3 className="font-black mb-4 text-gray-400 uppercase text-xs tracking-widest">Dziennik Zdarzeń</h3>
                        <div className="space-y-4">
                            {history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1').length > 0 ? (
                                history.filter(h => h.smokeStatus === 'alarm' || h.smokeStatus === '1').reverse().map((event, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700">
                                        <div className="flex items-center gap-3">
                                            <Siren size={20} />
                                            <span className="font-bold">WYKRYTO ZAGROŻENIE</span>
                                        </div>
                                        <span className="text-xs font-mono">{new Date(event.timestamp).toLocaleString()}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm italic">Brak odnotowanych alarmów dymu.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* GRID SPECYFIKACJI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Cpu size={18} /> Specyfikacja</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between border-b pb-2"><span>Model:</span> <strong>{device.model}</strong></div>
                            <div className="flex justify-between border-b pb-2"><span>Produkt:</span> <strong>{device.productName}</strong></div>
                            <div className="flex justify-between border-b pb-2"><span>ID:</span> <code className="bg-gray-100 px-2 rounded text-xs">{device.id}</code></div>
                        </div>
                    </section>

                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Activity size={18} /> Status Surowy</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {device.status?.map((s, i) => (
                                <div key={i} className="flex justify-between bg-gray-50 p-2 rounded text-sm">
                                    <span className="text-gray-500">{s.code}:</span>
                                    <span className="font-mono font-bold text-blue-600">{String(s.value)}</span>
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
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Activity, Cpu, Thermometer, Droplets, ShieldAlert, Siren, History, Sparkles, Loader2 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { WebSocketContext } from '../WebSocketContext';
import '../App.css';

const DeviceDetails = () => {
    const { deviceId } = useParams();
    const navigate = useNavigate();
    const [device, setDevice] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    // Domyślny filtr to dzisiaj
    const [timeRange, setTimeRange] = useState('today');

    // Stany dla AI
    const [aiPredictions, setAiPredictions] = useState([]);
    const [aiLoading, setAiLoading] = useState(false);

    const wsUpdateData = useContext(WebSocketContext);

    useEffect(() => {
        axios.get(`http://localhost:8080/devices/${deviceId}`)
            .then(res => setDevice(res.data))
            .catch(err => console.error(err));
    }, [deviceId]);

    // Inteligentne pobieranie historii zależne od wybranego przycisku czasu
    useEffect(() => {
        setLoading(true);
        axios.get(`http://localhost:8080/devices/${deviceId}/history/smart?range=${timeRange}`)
            .then(res => {
                const formattedData = res.data.reverse().map(item => {
                    const d = new Date(item.timestamp);
                    let displayX = '';
                    if (timeRange === 'today') {
                        displayX = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    } else {
                        displayX = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                    }
                    return {
                        ...item,
                        timeMs: d.getTime(),
                        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        fullDate: d.toLocaleString(),
                        displayX: displayX
                    };
                });
                setHistory(formattedData);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [deviceId, timeRange]);

    useEffect(() => {
        if (!wsUpdateData || wsUpdateData.devId !== deviceId) return;
        setDevice(prev => {
            if (!prev) return prev;
            let newState = { ...prev };
            const updates = wsUpdateData.status || wsUpdateData.properties || [];
            let newStatus = [...(newState.status || [])];
            updates.forEach(upd => {
                const i = newStatus.findIndex(s => s.code === upd.code);
                if (i !== -1) newStatus[i] = { ...newStatus[i], value: upd.value };
                else newStatus.push(upd);
            });
            newState.status = newStatus;
            return newState;
        });

        const updates = wsUpdateData.status || wsUpdateData.properties || [];
        if (updates.length > 0) {
            const newTempRaw = updates.find(u => u.code.includes('temp'))?.value;
            const newHumRaw = updates.find(u => u.code.includes('hum'))?.value;
            const newBattRaw = updates.find(u => u.code.includes('battery'))?.value;
            const newSmokeRaw = updates.find(u => u.code.includes('smoke_sensor'))?.value;

            if (newTempRaw === undefined && newHumRaw === undefined && newBattRaw === undefined && newSmokeRaw === undefined) return;

            const dateObj = new Date();
            const newEntry = {
                timestamp: dateObj.toISOString(),
                time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                fullDate: dateObj.toLocaleString(),
                temperature: newTempRaw !== undefined ? newTempRaw / 10 : null,
                humidity: newHumRaw !== undefined ? newHumRaw : null,
                battery: newBattRaw !== undefined ? newBattRaw : null,
                smokeStatus: newSmokeRaw || null,
            };
            setHistory(prev => [...prev, newEntry]);
        }
    }, [wsUpdateData, deviceId]);

    const handlePredictAI = () => {
        setAiLoading(true);
        axios.get(`http://localhost:8080/devices/${deviceId}/predict`)
            .then(res => {
                if (res.data.error) {
                    alert(res.data.error);
                    return;
                }
                const formattedPredictions = res.data.predictions.map(p => {
                    const d = new Date(p.timestamp);
                    return {
                        timestamp: p.timestamp,
                        timeMs: d.getTime(),
                        displayX: `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        predicted_temperature: p.predicted_temperature
                    };
                });
                setAiPredictions(formattedPredictions);
                // USUNIĘTO: setTimeRange('all'); - teraz filtr zostaje taki, jaki był wybrany
            })
            .catch(err => {
                console.error("Błąd AI:", err);
                alert("Błąd połączenia z modułem AI!");
            })
            .finally(() => setAiLoading(false));
    };

    if (loading || !device) return <div className="loading flex justify-center items-center h-screen">Ładowanie...</div>;

    const isSmokeSensor = device.category === 'sensor' || device.category === 'cs';

    // Logika filtrów z MIESIĄCEM zamiast tygodnia
    // const filteredHistory = history.filter(item => {
    //     const itemTime = new Date(item.timestamp).getTime();
    //     const now = new Date();
    //     if (timeRange === 'today') return itemTime >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    //     if (timeRange === 'month') return itemTime >= new Date(now.setMonth(now.getMonth() - 1)).getTime(); // Zmieniono na MIESIĄC
    //     if (timeRange === 'year') return itemTime >= new Date(now.setFullYear(now.getFullYear() - 1)).getTime();
    //     return true;
    // }).map(item => {
    //     const d = new Date(item.timestamp);
    //     let displayX = '';
    //     if (timeRange === 'today') {
    //         displayX = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    //     } else {
    //         displayX = `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    //     }
    //     return { ...item, displayX };
    // });

    const chartData = [...history, ...aiPredictions];

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
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                            <h3 className="flex items-center gap-2 font-black text-gray-400 uppercase text-xs tracking-widest">
                                <History size={16} />
                                {isSmokeSensor ? 'Historia Zasilania' : 'Historia Klimatu'}
                            </h3>

                            <div className="flex flex-wrap items-center gap-4">
                                {!isSmokeSensor && (
                                    <button
                                        onClick={handlePredictAI}
                                        disabled={aiLoading}
                                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-500/30 disabled:opacity-50"
                                    >
                                        {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        Prognoza AI
                                    </button>
                                )}

                                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                                    {/* Podmiana przycisków na widoku */}
                                    {['today', 'month', 'year', 'all'].map((range) => (
                                        <button
                                            key={range}
                                            onClick={() => setTimeRange(range)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                timeRange === range ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {range === 'today' ? 'Dzisiaj' : range === 'month' ? 'Miesiąc' : range === 'year' ? 'Rok' : 'Lifetime'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                {isSmokeSensor ? (
                                    <AreaChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="displayX" stroke="#cbd5e1" fontSize={11} minTickGap={30} />
                                        <YAxis stroke="#cbd5e1" fontSize={11} domain={[0, 100]} />
                                        <Tooltip />
                                        <Area type="stepAfter" dataKey="battery" name="Bateria (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.1} connectNulls={true} />
                                    </AreaChart>
                                ) : (
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="timeMs"
                                            type="number"
                                            scale="time"
                                            domain={['dataMin', 'dataMax']}
                                            stroke="#cbd5e1"
                                            fontSize={11}
                                            minTickGap={40} // Zwiększyłem odstęp, żeby data i godzina się nie zderzały
                                            tickFormatter={(unixTime) => {
                                                const d = new Date(unixTime);
                                                // Zawsze zwracamy pełny format: DD.MM HH:mm
                                                return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                            }}
                                        />

                                        <YAxis yAxisId="left" stroke="#ef4444" fontSize={11} domain={['auto', 'auto']} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" fontSize={11} domain={[0, 100]} />

                                        <Tooltip
                                            labelFormatter={(label) => {
                                                const d = new Date(label);
                                                return `Data: ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} o ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                                            }}
                                        />
                                        <Legend />

                                        <Line yAxisId="left" type="monotone" dataKey="temperature" name="Temp Historyczna (°C)" stroke="#ef4444" strokeWidth={3} dot={false} connectNulls={false} />

                                        {/* PREDYKCJA AI - Zmieniono na ciągłą linię (brak strokeDasharray) i pogrubiono dla lepszej widoczności */}
                                        <Line yAxisId="left" type="monotone" dataKey="predicted_temperature" name="Prognoza AI (°C)" stroke="#f59e0b" strokeWidth={2} dot={{r: 1}} connectNulls={false} />

                                        <Line yAxisId="right" type="monotone" dataKey="humidity" name="Wilgotność (%)" stroke="#3b82f6" strokeWidth={3} dot={false} connectNulls={false} />
                                        <Line yAxisId="right" type="stepAfter" dataKey="battery" name="Bateria (%)" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls={true} />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Cpu size={18} /> Specyfikacja</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between border-b pb-2"><span>Model:</span> <strong>{device.model}</strong></div>
                            <div className="flex justify-between border-b pb-2"><span>Produkt:</span> <strong>{device.productName}</strong></div>
                            <div className="flex justify-between pb-2"><span>ID:</span> <code className="bg-gray-100 px-2 rounded text-xs">{device.id}</code></div>
                        </div>
                    </section>

                    <section className="bg-white border rounded-2xl p-6 shadow-sm">
                        <h3 className="flex items-center gap-2 font-bold mb-4 text-gray-700"><Activity size={18} /> Status Surowy</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {device.status?.map((s, i) => (
                                <div key={i} className="flex justify-between bg-gray-50 p-2 rounded text-sm">
                                    <span className="text-gray-500">{s.code}:</span>
                                    <span className="font-mono font-bold text-blue-600 truncate max-w-[50%]">{String(s.value)}</span>
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
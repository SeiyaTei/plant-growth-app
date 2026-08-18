'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Camera, Plus, Calendar, Image as ImageIcon, Loader2, 
  Sparkles, Sprout, Download, Upload, Settings, X, CheckCircle,
  Edit2, Trash2, ChevronLeft, ChevronRight, Maximize2, Copy, Check,
  Leaf, Sun, Heart, Flower2, Search, Play, Pause, Grid, Filter,
  Star, MapPin, Tag, Info, ShoppingBag, Thermometer, ShieldAlert
} from 'lucide-react';

const STATUS_LIST = ['🌿 元気', '🌱 新芽展開中', '🌸 開花中', '💤 休眠中', '🩺 養生中'];
const CARE_TAGS = [
  { name: '💧 水やり', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  { name: '🌱 新芽', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { name: '🪴 植え替え', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { name: '🧪 追肥・活力剤', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { name: '✂️ 剪定・葉水', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { name: '🌸 開花', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { name: '💊 害虫・病気対策', color: 'bg-rose-100 text-rose-800 border-rose-200' },
];

export default function Home() {
  const [userId, setUserId] = useState('');
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 検索・フィルター・図鑑ビュー
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('すべて');
  const [showCatalogModal, setShowCatalogModal] = useState(false);

  // プロフィール編集モーダル
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({});

  // タイムラプス再生
  const [isTimelapsePlaying, setIsTimelapsePlaying] = useState(false);
  const [timelapseIndex, setTimelapseIndex] = useState(0);
  const [timelapseSpeed, setTimelapseSpeed] = useState(800); // ms
  const timelapseTimerRef = useRef(null);

  // 新規植物登録
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('');
  const [newPlantLocation, setNewPlantLocation] = useState('リビング');

  // ログ投稿とお世話タグ
  const [showAddLog, setShowAddLog] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [logTakenAt, setLogTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  // ログ編集
  const [editingLog, setEditingLog] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editTakenAt, setEditTakenAt] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [updatingLog, setUpdatingLog] = useState(false);

  // 写真拡大ビューア
  const [viewerIndex, setViewerIndex] = useState(null);

  // 設定・同期
  const [showSettings, setShowSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [customUserIdInput, setCustomUserIdInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const fileInputRef = useRef(null);

  // スライダー位置
  const [sliderPos, setSliderPos] = useState(50);

  useEffect(() => {
    let currentId = localStorage.getItem('plant_app_user_id');
    if (!currentId) {
      currentId = 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      localStorage.setItem('plant_app_user_id', currentId);
    }
    setUserId(currentId);
    setCustomUserIdInput(currentId);
    fetchPlants(currentId);
  }, []);

  // タイムラプス自動再生処理
  useEffect(() => {
    if (isTimelapsePlaying && logs.length > 1) {
      timelapseTimerRef.current = setInterval(() => {
        setTimelapseIndex((prev) => (prev + 1 >= logs.length ? 0 : prev + 1));
      }, timelapseSpeed);
    } else {
      clearInterval(timelapseTimerRef.current);
    }
    return () => clearInterval(timelapseTimerRef.current);
  }, [isTimelapsePlaying, logs, timelapseSpeed]);

  const fetchPlants = async (uid) => {
    setLoading(true);
    const targetUid = uid || userId;
    if (!targetUid) return;

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', targetUid)
      .order('is_favorite', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPlants(data);
      if (data.length > 0) {
        setSelectedPlant((prev) => (prev ? data.find((p) => p.id === prev.id) || data[0] : data[0]));
        fetchLogs(data[0].id);
      } else {
        setSelectedPlant(null);
        setLogs([]);
      }
    }
    setLoading(false);
  };

  const fetchLogs = async (plantId) => {
    const { data, error } = await supabase
      .from('growth_logs')
      .select('*')
      .eq('plant_id', plantId)
      .order('taken_at', { ascending: true });
    if (!error && data) {
      setLogs(data);
      setTimelapseIndex(0);
      setIsTimelapsePlaying(false);
    }
  };

  // お気に入り（ピン留め）切り替え
  const toggleFavorite = async (e, plant) => {
    e.stopPropagation();
    const updatedFav = !plant.is_favorite;
    const { error } = await supabase
      .from('plants')
      .update({ is_favorite: updatedFav })
      .eq('id', plant.id);

    if (!error) {
      const updatedList = plants.map((p) => (p.id === plant.id ? { ...p, is_favorite: updatedFav } : p))
        .sort((a, b) => (b.is_favorite === a.is_favorite ? 0 : b.is_favorite ? 1 : -1));
      setPlants(updatedList);
      if (selectedPlant?.id === plant.id) {
        setSelectedPlant({ ...selectedPlant, is_favorite: updatedFav });
      }
    }
  };

  // 植物追加
  const handleAddPlant = async (e) => {
    e.preventDefault();
    if (!newPlantName.trim() || !userId) return;

    const { data, error } = await supabase
      .from('plants')
      .insert([{ 
        name: newPlantName, 
        species: newPlantSpecies, 
        location: newPlantLocation || 'リビング',
        user_id: userId 
      }])
      .select();

    if (!error && data) {
      setPlants([data[0], ...plants]);
      setSelectedPlant(data[0]);
      setLogs([]);
      setNewPlantName('');
      setNewPlantSpecies('');
      setShowAddPlant(false);
    }
  };

  // プロフィール更新
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!selectedPlant) return;

    const { data, error } = await supabase
      .from('plants')
      .update(profileForm)
      .eq('id', selectedPlant.id)
      .select();

    if (!error && data) {
      setSelectedPlant(data[0]);
      setPlants(plants.map((p) => (p.id === selectedPlant.id ? data[0] : p)));
      setShowProfileModal(false);
    }
  };

  // 写真ログ投稿
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedPlant) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${selectedPlant.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('plant-photos')
        .getPublicUrl(filePath);

      const { data: logData, error: dbError } = await supabase
        .from('growth_logs')
        .insert([
          {
            plant_id: selectedPlant.id,
            photo_url: urlData.publicUrl,
            taken_at: logTakenAt || new Date().toISOString().slice(0, 10),
            note: logNote,
            tags: selectedTags,
          },
        ])
        .select();

      if (dbError) throw dbError;

      const updated = [...logs, logData[0]].sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
      setLogs(updated);
      setSelectedFile(null);
      setLogNote('');
      setSelectedTags([]);
      setShowAddLog(false);
    } catch (err) {
      alert('写真の保存に失敗しました: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ログ更新
  const handleUpdateLog = async (e) => {
    e.preventDefault();
    if (!editingLog) return;

    setUpdatingLog(true);
    try {
      const { data, error } = await supabase
        .from('growth_logs')
        .update({
          note: editNote,
          taken_at: editTakenAt,
          tags: editTags,
        })
        .eq('id', editingLog.id)
        .select();

      if (error) throw error;

      const updated = logs.map((l) => (l.id === editingLog.id ? data[0] : l))
        .sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
      
      setLogs(updated);
      setEditingLog(null);
    } catch (err) {
      alert('ログの更新に失敗しました: ' + err.message);
    } finally {
      setUpdatingLog(false);
    }
  };

  // ログ削除
  const handleDeleteLog = async (logId) => {
    if (!confirm('この成長記録を削除してもよろしいですか？')) return;
    const { error } = await supabase.from('growth_logs').delete().eq('id', logId);
    if (!error) {
      setLogs(logs.filter((l) => l.id !== logId));
      if (viewerIndex !== null) setViewerIndex(null);
    }
  };

  // バックアップ・エクスポート
  const handleExportData = async () => {
    try {
      setBackupStatus('データを取得中...');
      const { data: plantsData, error: pError } = await supabase.from('plants').select('*').eq('user_id', userId);
      if (pError) throw pError;

      const plantIds = (plantsData || []).map((p) => p.id);
      let logsData = [];
      if (plantIds.length > 0) {
        const { data: lData, error: lError } = await supabase.from('growth_logs').select('*').in('plant_id', plantIds);
        if (lError) throw lError;
        logsData = lData || [];
      }

      const backupData = { version: '2.0', userId, exportedAt: new Date().toISOString(), plants: plantsData || [], growth_logs: logsData || [] };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `plant_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupStatus('エクスポート完了！');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (err) {
      alert('エクスポート失敗: ' + err.message);
    }
  };

  // インポート
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setBackupStatus('復元中...');
        const json = JSON.parse(event.target.result);
        if (!json.plants || !json.growth_logs) throw new Error('形式が正しくありません');

        const plantsToInsert = json.plants.map((p) => ({ ...p, user_id: userId }));
        if (plantsToInsert.length > 0) await supabase.from('plants').upsert(plantsToInsert);
        if (json.growth_logs.length > 0) await supabase.from('growth_logs').upsert(json.growth_logs);

        setBackupStatus('復元完了！');
        fetchPlants(userId);
        setTimeout(() => { setBackupStatus(''); setShowSettings(false); }, 2000);
      } catch (err) {
        alert('インポート失敗: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const getDaysPassed = (startDate) => {
    const diff = Math.floor((new Date() - new Date(startDate)) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  // 置き場所リスト抽出
  const locations = ['すべて', ...Array.from(new Set(plants.map((p) => p.location || 'リビング')))];

  // 絞り込み済み植物リスト
  const filteredPlants = plants.filter((p) => {
    const matchQuery = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                       (p.species || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchLoc = selectedLocation === 'すべて' || (p.location || 'リビング') === selectedLocation;
    return matchQuery && matchLoc;
  });

  const firstLog = logs[0];
  const latestLog = logs.length > 1 ? logs[logs.length - 1] : null;
  const currentViewerLog = viewerIndex !== null ? logs[viewerIndex] : null;
  const activeTimelapseLog = logs[timelapseIndex] || firstLog;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50/40 via-emerald-50/25 to-teal-50/35 p-4 md:p-6 max-w-lg mx-auto pb-32 text-slate-800 antialiased">
      
      {/* 🌟 ヘッダー */}
      <header className="flex justify-between items-center mb-4 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-800 to-teal-800 bg-clip-text text-transparent">
              Plant Log
            </h1>
            <p className="text-[10px] font-bold text-emerald-600">コレクション: {plants.length} 株</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCatalogModal(true)}
            className="p-2 rounded-2xl bg-white border border-emerald-100 text-emerald-700 hover:bg-emerald-50 shadow-sm transition active:scale-95 flex items-center gap-1 text-xs font-bold"
            title="植物図鑑ビュー"
          >
            <Grid className="w-4 h-4" /> 図鑑
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-2xl bg-white border border-emerald-100 text-slate-600 flex items-center justify-center hover:bg-emerald-50 shadow-sm transition active:scale-95"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 hover:shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4" /> 追加
          </button>
        </div>
      </header>

      {/* 🔍 検索バー ＆ 置き場所フィルター */}
      <div className="space-y-2.5 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="植物名や品種でクイック検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/90 border border-emerald-100 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 置き場所タグ */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px] font-bold">
          {locations.map((loc) => (
            <button
              key={loc}
              onClick={() => setSelectedLocation(loc)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap transition ${
                selectedLocation === loc
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white/80 text-slate-600 border border-emerald-100 hover:bg-emerald-50'
              }`}
            >
              {loc === 'すべて' ? '🏡 すべて' : `📍 ${loc}`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-xs font-bold">読み込み中...</p>
        </div>
      ) : plants.length === 0 ? (
        <div className="bg-white/95 rounded-3xl p-8 text-center border border-emerald-100 shadow-lg mt-6">
          <Sprout className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-black text-slate-800 text-sm mb-1">植物がまだ登録されていません</h3>
          <p className="text-xs text-slate-400 mb-5">お気に入りのグリーンを登録しましょう！</p>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md hover:bg-emerald-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 最初の植物を登録
          </button>
        </div>
      ) : (
        <>
          {/* 🌿 植物選択（ピルタブ＋ピン留め） */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {filteredPlants.map((p) => {
              const isSelected = selectedPlant?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlant(p);
                    fetchLogs(p.id);
                  }}
                  className={`group relative pl-3.5 pr-2 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 select-none ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-700/20 scale-[1.02]'
                      : 'bg-white/90 text-slate-700 border border-emerald-100/80 hover:bg-emerald-50/60'
                  }`}
                >
                  <Leaf className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`} />
                  <span>{p.name}</span>
                  <button
                    onClick={(e) => toggleFavorite(e, p)}
                    className="p-1 hover:scale-125 transition text-amber-300"
                  >
                    <Star className={`w-3.5 h-3.5 ${p.is_favorite ? 'fill-amber-400 text-amber-400' : isSelected ? 'text-white/40' : 'text-slate-300'}`} />
                  </button>
                </div>
              );
            })}
          </div>

          {selectedPlant && (
            <div className="space-y-5">
              {/* 🌟 メインカード */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-xl shadow-emerald-950/5 border border-emerald-100/80">
                {/* 上部ヘッダー */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-800 tracking-tight">{selectedPlant.name}</h2>
                      <button
                        onClick={() => {
                          setProfileForm(selectedPlant);
                          setShowProfileModal(true);
                        }}
                        className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200/60 font-bold hover:bg-emerald-100 flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3" /> 詳細
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 mt-0.5">
                      {selectedPlant.species && <span>{selectedPlant.species}</span>}
                      <span className="text-emerald-700">📍 {selectedPlant.location || 'リビング'}</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{selectedPlant.status || '🌿 元気'}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full border border-amber-200">
                    栽培 {getDaysPassed(selectedPlant.start_date)} 日目
                  </div>
                </div>

                {/* 🌟 成長比較スライダー / タイムラプス切り替え */}
                {logs.length > 1 ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-[11px] font-bold mb-2 px-1">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">
                        🌱 初期 ({firstLog?.taken_at})
                      </span>
                      
                      {/* タイムラプス再生ボタン */}
                      <button
                        onClick={() => setIsTimelapsePlaying(!isTimelapsePlaying)}
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 ${
                          isTimelapsePlaying 
                            ? 'bg-rose-500 text-white animate-pulse' 
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isTimelapsePlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isTimelapsePlaying ? '一時停止' : 'パラパラ再生'}
                      </button>

                      <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-lg">
                        🌿 最新 ({latestLog?.taken_at})
                      </span>
                    </div>

                    {/* ビューエリア */}
                    {isTimelapsePlaying ? (
                      <div className="relative h-72 w-full rounded-2xl overflow-hidden shadow-inner bg-black border-2 border-emerald-200">
                        <img
                          src={activeTimelapseLog?.photo_url}
                          alt="タイムラプス"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md p-2 rounded-xl text-white flex justify-between items-center text-xs font-bold">
                          <span>📅 {activeTimelapseLog?.taken_at}</span>
                          <span>{timelapseIndex + 1} / {logs.length} 枚目</span>
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-72 w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 select-none border-2 border-emerald-100">
                        <img src={latestLog.photo_url} alt="最新" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
                          <img src={firstLog.photo_url} alt="初期" className="absolute inset-0 w-full h-full object-cover max-w-none" style={{ width: '100%', height: '100%' }} />
                        </div>
                        <div className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize" style={{ left: `${sliderPos}%` }}>
                          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white text-emerald-700 w-8 h-8 rounded-full shadow-lg flex items-center justify-center text-xs font-black border-2 border-emerald-500">
                            ↔
                          </div>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderPos}
                          onChange={(e) => setSliderPos(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
                        />
                      </div>
                    )}
                  </div>
                ) : logs.length === 1 ? (
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-inner mb-4 border-2 border-emerald-100">
                    <img src={firstLog.photo_url} alt="初期" className="w-full h-full object-cover" />
                    <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md text-white p-2.5 rounded-xl text-xs text-center font-bold">
                      📸 2枚目の写真を記録すると、スライダー＆パラパラ再生が出現します！
                    </div>
                  </div>
                ) : (
                  <div className="h-52 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200 flex flex-col items-center justify-center text-emerald-700 p-4 mb-4">
                    <ImageIcon className="w-9 h-9 mb-2 text-emerald-400" />
                    <p className="text-xs font-bold">写真がまだありません</p>
                    <p className="text-[11px] text-emerald-600">下のボタンから最初の記念写真を残しましょう✨</p>
                  </div>
                )}

                {/* 写真記録ボタン */}
                <button
                  onClick={() => setShowAddLog(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/30 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> 今日の成長・お世話を記録
                </button>
              </div>

              {/* 🌟 成長タイムライン */}
              <div>
                <h3 className="font-black text-slate-800 text-sm mb-3 px-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flower2 className="w-4 h-4 text-emerald-600" /> 成長タイムライン ({logs.length}件)
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">写真タップで拡大</span>
                </h3>

                <div className="space-y-3">
                  {logs.slice().reverse().map((log, index) => {
                    const originalIndex = logs.length - 1 - index;
                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl p-3.5 shadow-sm border border-emerald-100/70 flex gap-3.5 items-start hover:border-emerald-300 transition"
                      >
                        <div
                          onClick={() => setViewerIndex(originalIndex)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 bg-slate-100 border border-slate-200 group/img"
                        >
                          <img src={log.photo_url} alt="ログ" className="w-full h-full object-cover group-hover/img:scale-110 transition duration-300" />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-slate-800">
                              {originalIndex === 0 ? '🌱 栽培スタート' : `📸 ログ #${originalIndex + 1}`}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {log.taken_at}
                            </span>
                          </div>

                          {/* お世話タグバッジ */}
                          {log.tags && log.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {log.tags.map((t) => (
                                <span key={t} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}

                          <p onClick={() => setViewerIndex(originalIndex)} className="text-xs text-slate-600 cursor-pointer line-clamp-2">
                            {log.note || 'メモなし'}
                          </p>
                        </div>

                        <div className="flex items-center gap-0.5 pl-1 border-l border-slate-100">
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditNote(log.note || '');
                              setEditTakenAt(log.taken_at);
                              setEditTags(log.tags || []);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteLog(log.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 🌟 写真拡大ライトボックス */}
      {currentViewerLog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col justify-between p-4 select-none">
          <div className="flex justify-between items-center text-white pt-2 px-2">
            <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-emerald-300">
              {viewerIndex + 1} / {logs.length} 枚目
            </span>
            <button onClick={() => setViewerIndex(null)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img src={currentViewerLog.photo_url} alt="拡大" className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl" />
            {viewerIndex > 0 && (
              <button onClick={() => setViewerIndex(viewerIndex - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 text-white rounded-full flex items-center justify-center">
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            {viewerIndex < logs.length - 1 && (
              <button onClick={() => setViewerIndex(viewerIndex + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 text-white rounded-full flex items-center justify-center">
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>

          <div className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-3xl p-4 text-white max-w-md mx-auto w-full shadow-2xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 bg-emerald-950/40 px-2.5 py-1 rounded-xl">
                <Calendar className="w-3.5 h-3.5" /> {currentViewerLog.taken_at}
              </span>
              <button
                onClick={() => {
                  setEditingLog(currentViewerLog);
                  setEditNote(currentViewerLog.note || '');
                  setEditTakenAt(currentViewerLog.taken_at);
                  setEditTags(currentViewerLog.tags || []);
                  setViewerIndex(null);
                }}
                className="text-xs bg-white/20 px-3 py-1 rounded-xl font-bold"
              >
                編集
              </button>
            </div>
            {currentViewerLog.tags && (
              <div className="flex flex-wrap gap-1 mb-2">
                {currentViewerLog.tags.map((t) => (
                  <span key={t} className="text-[10px] font-bold px-2 py-0.5 bg-white/20 rounded-full">{t}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-white/90 whitespace-pre-wrap">{currentViewerLog.note || 'メモはありません'}</p>
          </div>
        </div>
      )}

      {/* 🌟 植物図鑑（全コレクション・グリッド一覧）モーダル */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col border border-emerald-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <Grid className="w-5 h-5 text-emerald-600" /> 植物図鑑一覧 ({filteredPlants.length}株)
              </h2>
              <button onClick={() => setShowCatalogModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-1 flex-1">
              {filteredPlants.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedPlant(p);
                    fetchLogs(p.id);
                    setShowCatalogModal(false);
                  }}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition flex flex-col justify-between ${
                    selectedPlant?.id === p.id
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-emerald-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg">🪴</span>
                    <button onClick={(e) => toggleFavorite(e, p)}>
                      <Star className={`w-4 h-4 ${p.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 truncate">{p.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{p.species || '品種未指定'}</p>
                    <div className="mt-2 flex justify-between items-center text-[9px] font-bold text-slate-500">
                      <span>📍 {p.location || 'リビング'}</span>
                      <span className="text-emerald-700 font-extrabold">{getDaysPassed(p.start_date)}日</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 プロフィール詳細・編集モーダル */}
      {showProfileModal && selectedPlant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <Info className="w-5 h-5 text-emerald-600" /> {selectedPlant.name} の詳細
              </h2>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-3.5 text-xs font-bold text-slate-700">
              <div>
                <label className="block mb-1">植物の名前 *</label>
                <input
                  type="text"
                  value={profileForm.name || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">品種・学名</label>
                  <input
                    type="text"
                    value={profileForm.species || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, species: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1">置き場所 (エリア)</label>
                  <input
                    type="text"
                    value={profileForm.location || ''}
                    placeholder="例: 南側ベランダ"
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">育成ステータス</label>
                  <select
                    value={profileForm.status || '元気'}
                    onChange={(e) => setProfileForm({ ...profileForm, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl font-bold"
                  >
                    {STATUS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">耐寒性・適温</label>
                  <input
                    type="text"
                    placeholder="例: 10℃以上 / 寒さに強い"
                    value={profileForm.cold_tolerance || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, cold_tolerance: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1">購入店・お迎え場所</label>
                  <input
                    type="text"
                    placeholder="例: 園芸店, メルカリ"
                    value={profileForm.purchase_shop || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, purchase_shop: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1">購入価格</label>
                  <input
                    type="text"
                    placeholder="例: ¥1,500"
                    value={profileForm.purchase_price || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, purchase_price: e.target.value })}
                    className="w-full p-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1">育成ノート・特徴メモ</label>
                <textarea
                  rows="2"
                  placeholder="用土の配合や水やりの癖など..."
                  value={profileForm.profile_note || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, profile_note: e.target.value })}
                  className="w-full p-2 bg-slate-50 border rounded-xl font-normal"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 shadow-md transition"
              >
                詳細プロフィールを保存
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 成長写真とお世話ログ投稿モーダル */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-1.5">
              <Camera className="w-5 h-5 text-emerald-600" /> 成長とお世話を記録📸
            </h2>
            <p className="text-[11px] text-slate-400 mb-3 font-medium">{selectedPlant?.name} のログ</p>
            <form onSubmit={handleAddLog} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">撮影日</label>
                <input
                  type="date"
                  value={logTakenAt}
                  onChange={(e) => setLogTakenAt(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">写真を選択 *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800"
                  required
                />
              </div>

              {/* お世話タグ選択 */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600" /> お世話・イベントタグ（複数選択可）
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CARE_TAGS.map((t) => {
                    const isSelected = selectedTags.includes(t.name);
                    return (
                      <button
                        type="button"
                        key={t.name}
                        onClick={() => {
                          setSelectedTags(
                            isSelected ? selectedTags.filter((x) => x !== t.name) : [...selectedTags, t.name]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">成長メモ・様子</label>
                <textarea
                  placeholder="例: 新芽が開いてきた！"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  rows="2"
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddLog(false)}
                  disabled={uploading}
                  className="w-1/2 py-2.5 text-xs border rounded-xl font-bold"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-1/2 py-2.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-1 shadow-md"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'アルバムに保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 ログ再編集モーダル */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <Edit2 className="w-5 h-5 text-emerald-600" /> 記録の編集
              </h2>
              <button onClick={() => setEditingLog(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">撮影日</label>
                <input
                  type="date"
                  value={editTakenAt}
                  onChange={(e) => setEditTakenAt(e.target.value)}
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">お世話タグ</label>
                <div className="flex flex-wrap gap-1.5">
                  {CARE_TAGS.map((t) => {
                    const isSelected = editTags.includes(t.name);
                    return (
                      <button
                        type="button"
                        key={t.name}
                        onClick={() => {
                          setEditTags(
                            isSelected ? editTags.filter((x) => x !== t.name) : [...editTags, t.name]
                          );
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          isSelected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">メモ</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows="2"
                  className="w-full p-2 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingLog(null)} className="w-1/2 py-2 text-xs border rounded-xl font-bold">
                  キャンセル
                </button>
                <button type="submit" disabled={updatingLog} className="w-1/2 py-2 text-xs bg-emerald-600 text-white rounded-xl font-bold">
                  {updatingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : '更新'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 設定・同期モーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-1.5">
                <Settings className="w-5 h-5 text-emerald-600" /> 設定・端末キー管理
              </h2>
              <button onClick={() => setShowSettings(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 border border-emerald-100 rounded-2xl bg-emerald-50/40">
                <h3 className="text-xs font-bold text-emerald-900 mb-1">あなたの端末同期キー</h3>
                <div className="flex gap-1.5 mb-2">
                  <input type="text" readOnly value={userId} className="w-full px-2 py-1 bg-white border rounded-lg text-[10px] font-mono" />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(userId);
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex-shrink-0"
                  >
                    {copiedId ? '完了' : 'コピー'}
                  </button>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customUserIdInput.trim()) return;
                    localStorage.setItem('plant_app_user_id', customUserIdInput.trim());
                    setUserId(customUserIdInput.trim());
                    fetchPlants(customUserIdInput.trim());
                    setBackupStatus('同期しました！');
                    setTimeout(() => setBackupStatus(''), 3000);
                  }}
                  className="flex gap-1.5 pt-2 border-t border-emerald-100"
                >
                  <input
                    type="text"
                    placeholder="他端末のキー..."
                    value={customUserIdInput}
                    onChange={(e) => setCustomUserIdInput(e.target.value)}
                    className="w-full p-1.5 bg-white border rounded-lg text-xs"
                  />
                  <button type="submit" className="px-3 bg-emerald-700 text-white rounded-lg text-xs font-bold">適用</button>
                </form>
              </div>

              <div className="p-3 border rounded-2xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 mb-1">バックアップ（保存）</h3>
                <button onClick={handleExportData} className="w-full py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <Download className="w-3.5 h-3.5" /> バックアップをダウンロード
                </button>
              </div>

              <div className="p-3 border rounded-2xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 mb-1">データを復元</h3>
                <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportFile} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 border bg-white text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1">
                  <Upload className="w-3.5 h-3.5" /> JSONファイルを選択
                </button>
              </div>

              {backupStatus && (
                <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl text-center">
                  {backupStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 新規植物追加モーダル */}
      {showAddPlant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100">
            <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-1.5">
              <Sprout className="w-5 h-5 text-emerald-600" /> 新しい植物を登録
            </h2>
            <p className="text-[11px] text-slate-400 mb-4">おうちのグリーンを仲間に加えましょう🌱</p>
            <form onSubmit={handleAddPlant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">植物の名前 *</label>
                <input
                  type="text"
                  placeholder="例: モンステラ"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">品種・ニックネーム</label>
                <input
                  type="text"
                  placeholder="例: デリシオーサ / もんちゃん"
                  value={newPlantSpecies}
                  onChange={(e) => setNewPlantSpecies(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">置き場所 (エリア)</label>
                <input
                  type="text"
                  placeholder="例: リビング, 南側ベランダ, 育成棚"
                  value={newPlantLocation}
                  onChange={(e) => setNewPlantLocation(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddPlant(false)} className="w-1/2 py-2 text-xs border rounded-xl font-bold">
                  キャンセル
                </button>
                <button type="submit" className="w-1/2 py-2 text-xs bg-emerald-600 text-white rounded-xl font-bold shadow-md">
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Camera, Plus, Calendar, Image as ImageIcon, Loader2, 
  Sparkles, Sprout, Download, Upload, Settings, X, CheckCircle,
  Edit2, Trash2, ChevronLeft, ChevronRight, Maximize2
} from 'lucide-react';

export default function Home() {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 設定・バックアップ
  const [showSettings, setShowSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const fileInputRef = useRef(null);

  // 新規植物登録
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('');

  // ログ投稿
  const [showAddLog, setShowAddLog] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [logTakenAt, setLogTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState(null);

  // ログ編集
  const [editingLog, setEditingLog] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editTakenAt, setEditTakenAt] = useState('');
  const [updatingLog, setUpdatingLog] = useState(false);

  // 写真拡大ビューア（ライトボックス）
  const [viewerIndex, setViewerIndex] = useState(null);

  // Before/After スライダー位置（%）
  const [sliderPos, setSliderPos] = useState(50);

  useEffect(() => {
    fetchPlants();
  }, []);

  // キーボードの左右キーで拡大ビューアの前後送り・Escで閉じる
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewerIndex === null) return;
      if (e.key === 'ArrowLeft') showPrevPhoto();
      if (e.key === 'ArrowRight') showNextPhoto();
      if (e.key === 'Escape') setViewerIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewerIndex, logs]);

  const fetchPlants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('plants').select('*').order('created_at', { ascending: false });
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
    }
  };

  // 植物追加
  const handleAddPlant = async (e) => {
    e.preventDefault();
    if (!newPlantName.trim()) return;

    const { data, error } = await supabase
      .from('plants')
      .insert([{ name: newPlantName, species: newPlantSpecies }])
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
          },
        ])
        .select();

      if (dbError) throw dbError;

      // 日付順に再ソートして反映
      const updated = [...logs, logData[0]].sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
      setLogs(updated);
      setSelectedFile(null);
      setLogNote('');
      setLogTakenAt(new Date().toISOString().slice(0, 10));
      setShowAddLog(false);
    } catch (err) {
      alert('写真の保存に失敗しました: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ログ編集の保存
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
    if (!confirm('この記録を削除してもよろしいですか？')) return;

    const { error } = await supabase.from('growth_logs').delete().eq('id', logId);
    if (!error) {
      setLogs(logs.filter((l) => l.id !== logId));
      if (viewerIndex !== null) setViewerIndex(null);
    } else {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  // ビューア操作（前へ・次へ）
  const showPrevPhoto = () => {
    if (viewerIndex > 0) {
      setViewerIndex(viewerIndex - 1);
    }
  };

  const showNextPhoto = () => {
    if (viewerIndex < logs.length - 1) {
      setViewerIndex(viewerIndex + 1);
    }
  };

  // バックアップ・エクスポート
  const handleExportData = async () => {
    try {
      setBackupStatus('データを取得中...');
      const { data: plantsData, error: pError } = await supabase.from('plants').select('*');
      const { data: logsData, error: lError } = await supabase.from('growth_logs').select('*');

      if (pError || lError) throw new Error('データ取得に失敗しました');

      const backupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        plants: plantsData || [],
        growth_logs: logsData || []
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `plant_growth_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setBackupStatus('エクスポートが完了しました！');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (err) {
      alert('エクスポート失敗: ' + err.message);
      setBackupStatus('');
    }
  };

  // インポート復元
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setBackupStatus('復元中...');
        const json = JSON.parse(event.target.result);

        if (!json.plants || !json.growth_logs) {
          throw new Error('バックアップファイルの形式が正しくありません');
        }

        if (json.plants.length > 0) {
          const { error: pErr } = await supabase.from('plants').upsert(json.plants);
          if (pErr) throw pErr;
        }

        if (json.growth_logs.length > 0) {
          const { error: lErr } = await supabase.from('growth_logs').upsert(json.growth_logs);
          if (lErr) throw lErr;
        }

        setBackupStatus('復元が完了しました！');
        fetchPlants();
        setTimeout(() => {
          setBackupStatus('');
          setShowSettings(false);
        }, 2000);
      } catch (err) {
        alert('インポート失敗: ' + err.message);
        setBackupStatus('');
      }
    };
    reader.readAsText(file);
  };

  const getDaysPassed = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const firstLog = logs[0];
  const latestLog = logs.length > 1 ? logs[logs.length - 1] : null;
  const currentViewerLog = viewerIndex !== null ? logs[viewerIndex] : null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 max-w-lg mx-auto pb-24">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-800">
            <Sprout className="w-7 h-7 text-emerald-600" /> Plant Log
          </h1>
          <p className="text-xs text-slate-500">植物の成長遷移ビューア</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm"
            title="バックアップと設定"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow hover:bg-emerald-700 transition"
          >
            <Plus className="w-4 h-4" /> 植物を追加
          </button>
        </div>
      </header>

      {/* 写真拡大ビューア（ライトボックスモーダル） */}
      {currentViewerLog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col justify-between p-4 select-none">
          {/* 上部バー */}
          <div className="flex justify-between items-center text-white/80 pt-2 px-2">
            <span className="text-xs font-medium bg-white/10 px-3 py-1 rounded-full">
              {viewerIndex + 1} / {logs.length} 枚目
            </span>
            <button
              onClick={() => setViewerIndex(null)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 中央写真＆送りボタン */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={currentViewerLog.photo_url}
              alt="拡大写真"
              className="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-all duration-200"
            />

            {/* 前へボタン */}
            {viewerIndex > 0 && (
              <button
                onClick={showPrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm"
                title="前の写真"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* 次へボタン */}
            {viewerIndex < logs.length - 1 && (
              <button
                onClick={showNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm"
                title="次の写真"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* 下部情報バー */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 text-white max-w-md mx-auto w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-emerald-300 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {currentViewerLog.taken_at}
              </span>
              <button
                onClick={() => {
                  setEditingLog(currentViewerLog);
                  setEditNote(currentViewerLog.note || '');
                  setEditTakenAt(currentViewerLog.taken_at);
                  setViewerIndex(null);
                }}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
              >
                <Edit2 className="w-3 h-3" /> このログを編集
              </button>
            </div>
            <p className="text-xs text-white/90 whitespace-pre-wrap">
              {currentViewerLog.note || 'メモはありません'}
            </p>
          </div>
        </div>
      )}

      {/* ログ再編集モーダル */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" /> 記録を編集
              </h2>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">撮影日</label>
                <input
                  type="date"
                  value={editTakenAt}
                  onChange={(e) => setEditTakenAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">メモ・変化</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                  placeholder="メモを入力..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="w-1/2 py-2 text-xs border rounded-lg hover:bg-slate-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={updatingLog}
                  className="w-1/2 py-2 text-xs bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1"
                >
                  {updatingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : '更新する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 設定・バックアップモーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" /> データ管理・バックアップ
            </h2>
            <p className="text-xs text-slate-400 mb-4">全植物の記録と写真リンクをバックアップ／復元できます。</p>

            <div className="space-y-3">
              <div className="p-3 border rounded-xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-700 mb-1">データをバックアップ (保存)</h3>
                <p className="text-[11px] text-slate-500 mb-2">端末にJSONファイルを保存します。</p>
                <button
                  onClick={handleExportData}
                  className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" /> バックアップをダウンロード
                </button>
              </div>

              <div className="p-3 border rounded-xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-700 mb-1">データを復元 (取り込み)</h3>
                <p className="text-[11px] text-slate-500 mb-2">保存したJSONからデータを復元します。</p>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> バックアップファイルを選択
                </button>
              </div>

              {backupStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium flex items-center gap-1.5 justify-center">
                  <CheckCircle className="w-4 h-4" /> {backupStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 植物追加モーダル */}
      {showAddPlant && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-4">新しい植物を登録</h2>
            <form onSubmit={handleAddPlant} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">植物の名前 *</label>
                <input
                  type="text"
                  placeholder="例: モンステラ"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">品種・学名（任意）</label>
                <input
                  type="text"
                  placeholder="例: デリシオーサ"
                  value={newPlantSpecies}
                  onChange={(e) => setNewPlantSpecies(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlant(false)}
                  className="w-1/2 py-2 text-xs border rounded-lg hover:bg-slate-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 text-xs bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 写真記録モーダル */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold mb-4">成長写真を記録</h2>
            <form onSubmit={handleAddLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">撮影日</label>
                <input
                  type="date"
                  value={logTakenAt}
                  onChange={(e) => setLogTakenAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">写真を選択 *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">メモ・変化</label>
                <textarea
                  placeholder="例: 新しい葉が開いてきました🌱"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-emerald-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLog(false)}
                  disabled={uploading}
                  className="w-1/2 py-2 text-xs border rounded-lg hover:bg-slate-50 font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-1/2 py-2 text-xs bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 flex items-center justify-center gap-1"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-600" />
          <p className="text-sm">読み込み中...</p>
        </div>
      ) : plants.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm mt-8">
          <Sprout className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 mb-1">植物がまだ登録されていません</h3>
          <p className="text-xs text-slate-400 mb-4">右上のボタンから最初の植物を登録しましょう！</p>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow hover:bg-emerald-700 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 最初の植物を登録
          </button>
        </div>
      ) : (
        <>
          {/* 植物タブ選択 */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {plants.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPlant(p);
                  fetchLogs(p.id);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                  selectedPlant?.id === p.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {selectedPlant && (
            <div className="space-y-6">
              {/* メインカード */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedPlant.name}</h2>
                    {selectedPlant.species && (
                      <p className="text-xs text-slate-400">{selectedPlant.species}</p>
                    )}
                  </div>
                  <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                    栽培 {getDaysPassed(selectedPlant.start_date)}日目
                  </span>
                </div>

                {/* 成長Before / After スライダービューア */}
                {latestLog ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-xs text-slate-500 mb-1.5 px-1 font-medium">
                      <span>初期 ({firstLog?.taken_at})</span>
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" /> 成長比較
                      </span>
                      <span>最新 ({latestLog?.taken_at})</span>
                    </div>

                    <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 select-none">
                      <img
                        src={latestLog.photo_url}
                        alt="最新"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${sliderPos}%` }}
                      >
                        <img
                          src={firstLog.photo_url}
                          alt="初期"
                          className="absolute inset-0 w-full h-full object-cover max-w-none"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                        style={{ left: `${sliderPos}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white text-slate-800 w-6 h-6 rounded-full shadow flex items-center justify-center text-[10px] font-bold">
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
                  </div>
                ) : logs.length === 1 ? (
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-inner mb-4">
                    <img
                      src={firstLog.photo_url}
                      alt="初期写真"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/50 backdrop-blur-sm text-white p-2 rounded-xl text-xs text-center">
                      2枚目以降の写真を記録すると、Before/Afterスライダーが有効化されます！
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4 mb-4">
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs">まだ写真がありません</p>
                    <p className="text-[11px] text-slate-400">下のボタンから写真を撮って記録しましょう</p>
                  </div>
                )}

                {/* 写真記録ボタン */}
                <button
                  onClick={() => setShowAddLog(true)}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" /> 今日の成長を記録する
                </button>
              </div>

              {/* 成長タイムライン（再編集・拡大機能付き） */}
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3 px-1 flex items-center justify-between">
                  <span>成長タイムライン ({logs.length}件)</span>
                  <span className="text-[11px] text-slate-400 font-normal">写真タップで拡大</span>
                </h3>
                <div className="space-y-3">
                  {logs.slice().reverse().map((log, index) => {
                    const originalIndex = logs.length - 1 - index;
                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-3 items-center group transition hover:border-slate-300"
                      >
                        {/* 写真サムネイル（タップで拡大ビューアを開く） */}
                        <div
                          onClick={() => setViewerIndex(originalIndex)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 group/img bg-slate-100"
                        >
                          <img
                            src={log.photo_url}
                            alt="ログ写真"
                            className="w-full h-full object-cover group-hover/img:scale-110 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>

                        {/* メモと情報 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-bold text-slate-700">
                              {originalIndex === 0 ? '🌱 栽培スタート' : `📸 ログ #${originalIndex + 1}`}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {log.taken_at}
                            </span>
                          </div>
                          <p 
                            onClick={() => setViewerIndex(originalIndex)}
                            className="text-xs text-slate-600 truncate cursor-pointer hover:text-slate-900"
                          >
                            {log.note || 'メモなし'}
                          </p>
                        </div>

                        {/* 編集・削除アクション */}
                        <div className="flex items-center gap-1 pl-1 border-l border-slate-100">
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditNote(log.note || '');
                              setEditTakenAt(log.taken_at);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            title="メモ・日付を編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="この記録を削除"
                          >
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
    </main>
  );
}

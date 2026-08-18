'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Camera, Plus, Calendar, Image as ImageIcon, Loader2, 
  Sparkles, Sprout, Download, Upload, Settings, X, CheckCircle,
  Edit2, Trash2, ChevronLeft, ChevronRight, Maximize2, Copy, Check,
  Leaf, Sun, Heart, Flower2
} from 'lucide-react';

export default function Home() {
  const [userId, setUserId] = useState('');
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 設定・バックアップ
  const [showSettings, setShowSettings] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [customUserIdInput, setCustomUserIdInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
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

  // 端末ごとの固有ユーザーIDを取得または生成
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

  // 左右キーで写真送り
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

  const fetchPlants = async (uid) => {
    setLoading(true);
    const targetUid = uid || userId;
    if (!targetUid) return;

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', targetUid)
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
    }
  };

  // 植物追加
  const handleAddPlant = async (e) => {
    e.preventDefault();
    if (!newPlantName.trim() || !userId) return;

    const { data, error } = await supabase
      .from('plants')
      .insert([{ name: newPlantName, species: newPlantSpecies, user_id: userId }])
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
    if (!confirm('この成長記録を削除してもよろしいですか？')) return;

    const { error } = await supabase.from('growth_logs').delete().eq('id', logId);
    if (!error) {
      setLogs(logs.filter((l) => l.id !== logId));
      if (viewerIndex !== null) setViewerIndex(null);
    } else {
      alert('削除に失敗しました: ' + error.message);
    }
  };

  const showPrevPhoto = () => {
    if (viewerIndex > 0) setViewerIndex(viewerIndex - 1);
  };
  const showNextPhoto = () => {
    if (viewerIndex < logs.length - 1) setViewerIndex(viewerIndex + 1);
  };

  // 端末IDの同期
  const handleSyncUserId = (e) => {
    e.preventDefault();
    if (!customUserIdInput.trim()) return;
    localStorage.setItem('plant_app_user_id', customUserIdInput.trim());
    setUserId(customUserIdInput.trim());
    fetchPlants(customUserIdInput.trim());
    setBackupStatus('端末キーを同期しました！');
    setTimeout(() => setBackupStatus(''), 3000);
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // バックアップ・エクスポート
  const handleExportData = async () => {
    try {
      setBackupStatus('データを取得中...');
      const { data: plantsData, error: pError } = await supabase
        .from('plants')
        .select('*')
        .eq('user_id', userId);

      if (pError) throw pError;

      const plantIds = (plantsData || []).map((p) => p.id);
      let logsData = [];
      if (plantIds.length > 0) {
        const { data: lData, error: lError } = await supabase
          .from('growth_logs')
          .select('*')
          .in('plant_id', plantIds);
        if (lError) throw lError;
        logsData = lData || [];
      }

      const backupData = {
        version: '1.0',
        userId: userId,
        exportedAt: new Date().toISOString(),
        plants: plantsData || [],
        growth_logs: logsData || []
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `plant_backup_${new Date().toISOString().slice(0, 10)}.json`);
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

        const plantsToInsert = json.plants.map((p) => ({ ...p, user_id: userId }));

        if (plantsToInsert.length > 0) {
          const { error: pErr } = await supabase.from('plants').upsert(plantsToInsert);
          if (pErr) throw pErr;
        }

        if (json.growth_logs.length > 0) {
          const { error: lErr } = await supabase.from('growth_logs').upsert(json.growth_logs);
          if (lErr) throw lErr;
        }

        setBackupStatus('復元が完了しました！');
        fetchPlants(userId);
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
    <main className="min-h-screen bg-gradient-to-b from-amber-50/50 via-emerald-50/30 to-teal-50/40 p-4 md:p-6 max-w-lg mx-auto pb-28 text-slate-800 antialiased selection:bg-emerald-200">
      
      {/* 🌟 ヘッダー */}
      <header className="flex justify-between items-center mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 transform -rotate-3 hover:rotate-0 transition duration-300">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-emerald-800 via-teal-700 to-emerald-900 bg-clip-text text-transparent flex items-center gap-1.5">
              Plant Log
            </h1>
            <p className="text-[11px] font-semibold text-emerald-600/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> まいにちの成長アルバム
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-2xl bg-white/80 backdrop-blur-md border border-emerald-100 text-emerald-700 flex items-center justify-center hover:bg-emerald-50 shadow-sm transition active:scale-95"
            title="設定・データ同期"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/25 hover:shadow-lg hover:shadow-emerald-600/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" /> 植物を登録
          </button>
        </div>
      </header>

      {/* 🌟 写真拡大ビューア（ライトボックス） */}
      {currentViewerLog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-50 flex flex-col justify-between p-4 select-none animate-in fade-in duration-200">
          <div className="flex justify-between items-center text-white pt-2 px-2">
            <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-emerald-300">
              <Flower2 className="w-3.5 h-3.5" /> {viewerIndex + 1} / {logs.length} 枚目
            </span>
            <button
              onClick={() => setViewerIndex(null)}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition active:scale-90"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            <img
              src={currentViewerLog.photo_url}
              alt="拡大写真"
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition duration-200"
            />
            {viewerIndex > 0 && (
              <button
                onClick={showPrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition backdrop-blur-md active:scale-90"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            {viewerIndex < logs.length - 1 && (
              <button
                onClick={showNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition backdrop-blur-md active:scale-90"
              >
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
                  setViewerIndex(null);
                }}
                className="text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-xl flex items-center gap-1.5 font-bold transition active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5" /> 編集
              </button>
            </div>
            <p className="text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
              {currentViewerLog.note || 'メモはありません'}
            </p>
          </div>
        </div>
      )}

      {/* 🌟 ログ再編集モーダル */}
      {editingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" /> 記録の編集
              </h2>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">撮影日</label>
                <input
                  type="date"
                  value={editTakenAt}
                  onChange={(e) => setEditTakenAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">成長メモ・様子</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows="3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="新しい葉が出た！など"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="w-1/2 py-2.5 text-xs border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={updatingLog}
                  className="w-1/2 py-2.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  {updatingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : '更新する'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 設定・端末キー・バックアップモーダル */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" /> 設定・データ同期
            </h2>
            <p className="text-xs text-slate-400 mb-5 font-medium">端末ごとのキー管理と安心バックアップ</p>

            <div className="space-y-4">
              {/* 端末キーの確認・同期 */}
              <div className="p-4 border border-emerald-100 rounded-2xl bg-emerald-50/40">
                <h3 className="text-xs font-bold text-emerald-900 mb-1 flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5 text-emerald-600" /> あなたの端末同期キー
                </h3>
                <p className="text-[11px] text-emerald-700/80 mb-2.5">このキーをスマホに入力すると同じデータを共有できます。</p>
                <div className="flex gap-1.5 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={userId}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-[11px] font-mono text-slate-600 font-bold"
                  />
                  <button
                    onClick={copyUserId}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 flex-shrink-0 hover:bg-emerald-700 shadow-sm transition active:scale-95"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    コピー
                  </button>
                </div>

                <form onSubmit={handleSyncUserId} className="pt-3 border-t border-emerald-100">
                  <label className="block text-[11px] font-bold text-emerald-800 mb-1">別端末のキーを適用して同期：</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="user_xxxx..."
                      value={customUserIdInput}
                      onChange={(e) => setCustomUserIdInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 flex-shrink-0 transition active:scale-95"
                    >
                      適用
                    </button>
                  </div>
                </form>
              </div>

              {/* バックアップ保存 */}
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 mb-1">バックアップ（保存）</h3>
                <p className="text-[11px] text-slate-500 mb-2.5">登録した全データをJSONファイルとして手元に保存します。</p>
                <button
                  onClick={handleExportData}
                  className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4" /> バックアップをダウンロード
                </button>
              </div>

              {/* インポート復元 */}
              <div className="p-4 border border-slate-100 rounded-2xl bg-slate-50">
                <h3 className="text-xs font-bold text-slate-800 mb-1">データを復元（取り込み）</h3>
                <p className="text-[11px] text-slate-500 mb-2.5">保存したJSONファイルからデータを復元します。</p>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Upload className="w-4 h-4" /> バックアップファイルを選択
                </button>
              </div>

              {backupStatus && (
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 justify-center animate-in fade-in">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> {backupStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 植物追加モーダル */}
      {showAddPlant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100">
            <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-600" /> 新しい植物を登録
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-medium">おうちのグリーンを仲間に加えましょう🌱</p>
            <form onSubmit={handleAddPlant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">植物の名前 *</label>
                <input
                  type="text"
                  placeholder="例: モンステラ, ガジュマル"
                  value={newPlantName}
                  onChange={(e) => setNewPlantName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">品種・ニックネーム（任意）</label>
                <input
                  type="text"
                  placeholder="例: デリシオーサ / もんちゃん"
                  value={newPlantSpecies}
                  onChange={(e) => setNewPlantSpecies(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlant(false)}
                  className="w-1/2 py-2.5 text-xs border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition"
                >
                  登録する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🌟 写真記録モーダル */}
      {showAddLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-emerald-100">
            <h2 className="text-lg font-black text-slate-800 mb-1 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-600" /> 今日の成長をパシャリ📸
            </h2>
            <p className="text-xs text-slate-400 mb-4 font-medium">{selectedPlant?.name} の成長記録を残します</p>
            <form onSubmit={handleAddLog} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">撮影日</label>
                <input
                  type="date"
                  value={logTakenAt}
                  onChange={(e) => setLogTakenAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">写真を選択 *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">成長メモ・様子</label>
                <textarea
                  placeholder="例: 新しい葉っぱが開いてきました🌱"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  rows="3"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLog(false)}
                  disabled={uploading}
                  className="w-1/2 py-2.5 text-xs border border-slate-200 rounded-xl hover:bg-slate-50 font-bold text-slate-600"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-1/2 py-2.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'アルバムに保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-emerald-800">植物たちを読み込み中...</p>
        </div>
      ) : plants.length === 0 ? (
        <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 text-center border border-emerald-100 shadow-xl shadow-emerald-900/5 mt-6">
          <div className="w-16 h-16 rounded-3xl bg-amber-100/70 flex items-center justify-center text-amber-700 mx-auto mb-4">
            <Sprout className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="font-black text-slate-800 text-base mb-1">植物がまだ登録されていません</h3>
          <p className="text-xs text-slate-500 mb-6 font-medium">お気に入りの植物を登録して、日々の変化を楽しく記録しましょう！</p>
          <button
            onClick={() => setShowAddPlant(true)}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-lg shadow-emerald-600/30 hover:shadow-xl inline-flex items-center gap-2 active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> 最初の植物を登録する
          </button>
        </div>
      ) : (
        <>
          {/* 🌿 植物セレクター（ポップなピルタブ） */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            {plants.map((p) => {
              const isSelected = selectedPlant?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPlant(p);
                    fetchLogs(p.id);
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white/80 backdrop-blur-sm text-slate-600 border border-emerald-100/80 hover:bg-emerald-50/50'
                  }`}
                >
                  <Leaf className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-200' : 'text-emerald-500'}`} />
                  {p.name}
                </button>
              );
            })}
          </div>

          {selectedPlant && (
            <div className="space-y-6">
              {/* 🌟 メインカード（Before/After スライダー） */}
              <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 shadow-xl shadow-emerald-950/5 border border-emerald-100/80">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-1.5">
                      {selectedPlant.name}
                    </h2>
                    {selectedPlant.species && (
                      <p className="text-[11px] font-semibold text-emerald-600">{selectedPlant.species}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 bg-amber-100/80 text-amber-900 font-extrabold text-xs rounded-full border border-amber-200 shadow-sm">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>栽培 {getDaysPassed(selectedPlant.start_date)} 日目</span>
                  </div>
                </div>

                {/* 成長Before / After スライダービューア */}
                {latestLog ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mb-2 px-1">
                      <span className="bg-slate-100 px-2.5 py-0.5 rounded-lg text-slate-600">
                        🌱 最初 ({firstLog?.taken_at})
                      </span>
                      <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg flex items-center gap-1 font-extrabold border border-emerald-100">
                        <Sparkles className="w-3 h-3 text-amber-500" /> 成長マジックスライダー
                      </span>
                      <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-lg">
                        🌿 いま ({latestLog?.taken_at})
                      </span>
                    </div>

                    <div className="relative h-72 w-full rounded-2xl overflow-hidden shadow-inner bg-slate-900 select-none border-2 border-emerald-100">
                      {/* After画像（全面） */}
                      <img
                        src={latestLog.photo_url}
                        alt="最新の姿"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Before画像（クリップ表示） */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{ width: `${sliderPos}%` }}
                      >
                        <img
                          src={firstLog.photo_url}
                          alt="最初の姿"
                          className="absolute inset-0 w-full h-full object-cover max-w-none"
                          style={{ width: '100%', height: '100%' }}
                        />
                      </div>
                      {/* スライダーの境界線バー */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize"
                        style={{ left: `${sliderPos}%` }}
                      >
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
                  </div>
                ) : logs.length === 1 ? (
                  <div className="relative h-64 w-full rounded-2xl overflow-hidden shadow-inner mb-4 border-2 border-emerald-100">
                    <img
                      src={firstLog.photo_url}
                      alt="初期写真"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-md text-white p-2.5 rounded-xl text-xs text-center font-bold">
                      📸 もう1枚写真を追加すると、Before/Afterスライダーが自動で出現します！
                    </div>
                  </div>
                ) : (
                  <div className="h-52 bg-emerald-50/50 rounded-2xl border-2 border-dashed border-emerald-200/80 flex flex-col items-center justify-center text-emerald-700/70 p-4 mb-4">
                    <ImageIcon className="w-9 h-9 mb-2 text-emerald-400" />
                    <p className="text-xs font-bold text-emerald-900">まだアルバムに写真がありません</p>
                    <p className="text-[11px] text-emerald-600 font-medium">下のボタンから最初の記念写真を残しましょう✨</p>
                  </div>
                )}

                {/* 📸 写真記録ボタン */}
                <button
                  onClick={() => setShowAddLog(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/30 hover:shadow-xl transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" /> 今日の成長を記録する
                </button>
              </div>

              {/* 🌟 成長タイムライン（スクラップブック風アルバム） */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                    <Flower2 className="w-4 h-4 text-emerald-600" />
                    成長タイムライン
                    <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {logs.length} 枚
                    </span>
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-1 rounded-lg border border-slate-100">
                    タップで拡大
                  </span>
                </div>

                <div className="space-y-3">
                  {logs.slice().reverse().map((log, index) => {
                    const originalIndex = logs.length - 1 - index;
                    return (
                      <div
                        key={log.id}
                        className="bg-white rounded-2xl p-3 shadow-md shadow-slate-200/50 border border-emerald-100/60 flex gap-3.5 items-center hover:border-emerald-300 transition duration-200 hover:-translate-y-0.5"
                      >
                        {/* サムネイル写真 */}
                        <div
                          onClick={() => setViewerIndex(originalIndex)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 bg-slate-100 border border-slate-200/60 group/img"
                        >
                          <img
                            src={log.photo_url}
                            alt="ログ写真"
                            className="w-full h-full object-cover group-hover/img:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                            <Maximize2 className="w-4 h-4" />
                          </div>
                        </div>

                        {/* ログ詳細 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                              {originalIndex === 0 ? '🌱 栽培スタート' : `📸 ログ #${originalIndex + 1}`}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-100/60">
                              <Calendar className="w-3 h-3" /> {log.taken_at}
                            </span>
                          </div>
                          <p 
                            onClick={() => setViewerIndex(originalIndex)}
                            className="text-xs text-slate-600 truncate cursor-pointer hover:text-emerald-900 font-medium"
                          >
                            {log.note || 'メモなし'}
                          </p>
                        </div>

                        {/* 編集・削除ボタン */}
                        <div className="flex items-center gap-0.5 pl-1.5 border-l border-slate-100">
                          <button
                            onClick={() => {
                              setEditingLog(log);
                              setEditNote(log.note || '');
                              setEditTakenAt(log.taken_at);
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                            title="編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition"
                            title="削除"
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

'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, Plus, Calendar, Image as ImageIcon, Loader2, Sparkles, Sprout } from 'lucide-react';

export default function Home() {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // 新規植物登録用フォーム状態
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [newPlantName, setNewPlantName] = useState('');
  const [newPlantSpecies, setNewPlantSpecies] = useState('');

  // ログ投稿用フォーム状態
  const [showAddLog, setShowAddLog] = useState(false);
  const [logNote, setLogNote] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  // Before/After スライダー位置（%）
  const [sliderPos, setSliderPos] = useState(50);

  // 初期データ取得
  useEffect(() => {
    fetchPlants();
  }, []);

  const fetchPlants = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('plants').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPlants(data);
      if (data.length > 0) {
        setSelectedPlant(data[0]);
        fetchLogs(data[0].id);
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

      // 1. Supabase Storage に画像をアップロード
      const { error: uploadError } = await supabase.storage
        .from('plant-photos')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('plant-photos')
        .getPublicUrl(filePath);

      // 3. データベースにログを保存
      const { data: logData, error: dbError } = await supabase
        .from('growth_logs')
        .insert([
          {
            plant_id: selectedPlant.id,
            photo_url: urlData.publicUrl,
            note: logNote,
          },
        ])
        .select();

      if (dbError) throw dbError;

      setLogs([...logs, logData[0]]);
      setSelectedFile(null);
      setLogNote('');
      setShowAddLog(false);
    } catch (err) {
      alert('写真の保存に失敗しました: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 栽培日数の計算
  const getDaysPassed = (startDate) => {
    const start = new Date(startDate);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const firstLog = logs[0];
  const latestLog = logs.length > 1 ? logs[logs.length - 1] : null;

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
        <button
          onClick={() => setShowAddPlant(true)}
          className="bg-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" /> 植物を追加
        </button>
      </header>

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
                      {/* After画像（全面） */}
                      <img
                        src={latestLog.photo_url}
                        alt="最新"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Before画像（クリップ表示） */}
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
                      {/* スライダーの境界線バー */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
                        style={{ left: `${sliderPos}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white text-slate-800 w-6 h-6 rounded-full shadow flex items-center justify-center text-[10px] font-bold">
                          ↔
                        </div>
                      </div>
                      {/* 範囲入力スライダー（透明オーバーレイ） */}
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

              {/* 成長タイムライン（記録一覧） */}
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-3 px-1">成長タイムライン</h3>
                <div className="space-y-3">
                  {logs.slice().reverse().map((log, index) => (
                    <div
                      key={log.id}
                      className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 flex gap-3 items-center"
                    >
                      <img
                        src={log.photo_url}
                        alt="ログ写真"
                        className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700">
                            {logs.length - index === 1 ? '🌱 栽培スタート' : `📸 ログ #${logs.length - index}`}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {log.taken_at}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">
                          {log.note || 'メモなし'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

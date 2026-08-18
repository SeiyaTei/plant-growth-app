import React from 'react';
import { Camera, Calendar, ArrowRight, Sprout } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen p-6 max-w-md mx-auto">
      {/* ヘッダー */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-emerald-700">
            <Sprout className="w-7 h-7" /> Plant Log
          </h1>
          <p className="text-xs text-gray-500">植物の成長遷移ビューア</p>
        </div>
        <button className="bg-emerald-600 text-white p-2.5 rounded-full shadow hover:bg-emerald-700 transition">
          <Camera className="w-5 h-5" />
        </button>
      </header>

      {/* 植物カード（モック） */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-lg font-bold">モンステラ・デリシオーサ</h2>
            <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium">栽培 42日目</span>
          </div>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> 2026/08/18
          </span>
        </div>

        {/* 成長比較モック */}
        <div className="relative h-48 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-dashed border-gray-300">
          <p className="text-sm text-gray-400 text-center px-4">
            ここに Before / After の<br />スライダー写真が表示されます
          </p>
        </div>

        <div className="mt-4 flex justify-between items-center text-sm">
          <span className="text-gray-500 text-xs">最新ログ: 新芽が開きました🌱</span>
          <button className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline text-xs">
            記録を見る <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </main>
  );
}

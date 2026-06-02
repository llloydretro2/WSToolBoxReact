import React, { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useLocale } from "../contexts/LocaleContext.jsx";
import { Upload, Download, RefreshCw, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { renderCard, ensureFonts } from "../utils/wsCardMaker/renderer.js";
import { getCanvasSize } from "../utils/wsCardMaker/layout.js";

// ── Default card data ──────────────────────────────────────────────────────────

const DEFAULT_CARD = {
  type:    "character",
  side:    "both",
  color:   "green",
  level:   1,
  cost:    0,
  power:   5000,
  souls:   1,
  trigger:  "none",
  trigger2: "none",
  backup:   "none",
  name:    "",
  trait1:  "",
  trait2:  "",
  effect:  "",
  flavor:  "",
  serial:  "",
  artist:  "",
  art:     null,
};

// ── Option definitions ─────────────────────────────────────────────────────────

const TYPES   = ["character", "event", "climax"];
const SIDES   = ["weiss", "schwarz", "both"];
const COLORS  = ["yellow", "green", "red", "blue", "purple"];
const SOULS   = [0, 1, 2, 3];
const LEVELS  = [0, 1, 2, 3];

const COLOR_BG = {
  yellow: "#facc15", green: "#22c55e", red: "#ef4444",
  blue: "#3b82f6",   purple: "#a855f7",
};
const COLOR_LABEL = { yellow: "黄", green: "绿", red: "红", blue: "蓝", purple: "紫" };
const TYPE_LABEL  = { character: "角色", event: "事件", climax: "高潮" };
const SIDE_LABEL  = { weiss: "Weiß", schwarz: "Schwarz", both: "Both" };

const TRIGGER_OPTIONS = [
  { value: "none",      label: "无" },
  { value: "soul+1",    label: "Soul" },
  { value: "soul+2",    label: "2 Soul" },
  { value: "gate",      label: "Gate" },
  { value: "shot",      label: "Shot" },
  { value: "standby",   label: "Standby" },
  { value: "pool",      label: "Pool" },
  { value: "comeback",  label: "Comeback" },
  { value: "return",    label: "Return" },
  { value: "draw",      label: "Book" },
  { value: "treasure",  label: "Treasure" },
  { value: "choice",    label: "Choice" },
  { value: "discovery", label: "Discovery" },
  { value: "chance",    label: "Chance" },
];

const BACKUP_OPTIONS = [
  { value: "none",       label: "无" },
  { value: "backup",     label: "Backup" },
  { value: "clockshift", label: "Clock Shift" },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CardMaker() {
  useLocale();
  const [card, setCard]           = useState(DEFAULT_CARD);
  const [rendering, setRendering] = useState(false);
  const [artURL, setArtURL]       = useState(null);
  const [artTransform, setArtTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  const canvasRef  = useRef(null);
  const fileRef    = useRef(null);
  const renderTimer = useRef(null);

  const update = useCallback((field, value) => {
    setCard(prev => ({ ...prev, [field]: value }));
  }, []);

  // Art upload
  const handleArtFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setArtURL(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setArtTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  }, []);

  const clearArt = useCallback(() => {
    setArtURL(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
  }, []);

  // Preload fonts once
  useEffect(() => { ensureFonts(); }, []);

  // Re-render canvas on any card/art change (debounced 120ms)
  useEffect(() => {
    clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(async () => {
      if (!canvasRef.current) return;
      setRendering(true);
      try {
        await renderCard(canvasRef.current, { ...card, art: artURL, artTransform });
      } finally {
        setRendering(false);
      }
    }, 120);
    return () => clearTimeout(renderTimer.current);
  }, [card, artURL]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup object URL on unmount
  useEffect(() => () => { if (artURL) URL.revokeObjectURL(artURL); }, [artURL]);

  // Re-render when transform changes
  useEffect(() => {
    if (!artURL) return;
    clearTimeout(renderTimer.current);
    renderTimer.current = setTimeout(async () => {
      if (!canvasRef.current) return;
      setRendering(true);
      try {
        await renderCard(canvasRef.current, { ...card, art: artURL, artTransform });
      } finally {
        setRendering(false);
      }
    }, 50);
    return () => clearTimeout(renderTimer.current);
  }, [artTransform]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExport = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${card.name || "card"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const isCharacter = card.type === "character";
  const isClimax    = card.type === "climax";
  const isEvent     = card.type === "event";
  const { w: cardW, h: cardH } = getCanvasSize(card.type);
  const hasStats    = isCharacter || isEvent;  // level / cost
  const hasTraits   = isCharacter;
  const hasSouls    = isCharacter;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8 sm:py-10">

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text)] leading-none mb-1">
          卡片制作
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          自定义 WS 卡面并导出 PNG
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-start">

        {/* ── Left: Form ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Card type / Side / Color */}
          <div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-4">
              基础属性
            </p>
            <div className="flex flex-col gap-4">

              {/* Type */}
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">类型</label>
                <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
                  {TYPES.map((t, i) => (
                    <button key={t} type="button"
                      onClick={() => update("type", t)}
                      className={`px-4 py-1.5 text-xs font-bold transition-colors
                        ${i < TYPES.length - 1 ? "border-r border-[var(--border)]" : ""}
                        ${card.type === t
                          ? "bg-[var(--text)] text-[var(--background)]"
                          : "text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
                      {TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Side */}
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">阵营</label>
                <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
                  {SIDES.map((s, i) => (
                    <button key={s} type="button"
                      onClick={() => update("side", s)}
                      className={`px-4 py-1.5 text-xs font-bold transition-colors
                        ${i < SIDES.length - 1 ? "border-r border-[var(--border)]" : ""}
                        ${card.side === s
                          ? "bg-[var(--text)] text-[var(--background)]"
                          : "text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
                      {SIDE_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">颜色</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} type="button"
                      onClick={() => update("color", c)}
                      title={COLOR_LABEL[c]}
                      className={`w-8 h-8 rounded-full text-white text-[10px] font-black transition-all
                        border-2 ${card.color === c ? "border-[var(--text)] scale-110 shadow-md" : "border-transparent"}`}
                      style={{ backgroundColor: COLOR_BG[c] }}>
                      {COLOR_LABEL[c]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-4">
              数值
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

              {hasStats && (
                <NumberField label="等级" value={card.level} min={0} max={3}
                  onChange={v => update("level", v)} />
              )}
              {hasStats && (
                <NumberField label="费用" value={card.cost} min={0} max={9}
                  onChange={v => update("cost", v)} />
              )}
              {isCharacter && (
                <NumberField label="攻击力" value={card.power} min={0} max={99999} step={500}
                  onChange={v => update("power", v)} wide />
              )}
              {hasSouls && (
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">魂数</label>
                  <div className="inline-flex border border-[var(--border)] rounded-lg overflow-hidden">
                    {SOULS.map((s, i) => (
                      <button key={s} type="button"
                        onClick={() => update("souls", s)}
                        className={`w-9 py-1.5 text-xs font-bold transition-colors
                          ${i < SOULS.length - 1 ? "border-r border-[var(--border)]" : ""}
                          ${card.souls === s
                            ? "bg-[var(--text)] text-[var(--background)]"
                            : "text-[var(--text)] hover:bg-[var(--card-background)]"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trigger */}
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">Trigger</label>
                <select
                  value={card.trigger}
                  onChange={e => update("trigger", e.target.value)}
                  className="w-full border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
                             text-sm text-[var(--text)] bg-white focus:outline-none focus:border-[var(--text-muted)]
                             transition-colors">
                  {TRIGGER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Trigger 2 — climax only */}
              {isClimax && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">Trigger 2</label>
                  <select
                    value={card.trigger2}
                    onChange={e => update("trigger2", e.target.value)}
                    className="w-full border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
                               text-sm text-[var(--text)] bg-white focus:outline-none focus:border-[var(--text-muted)]
                               transition-colors">
                    {TRIGGER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Backup (character/event only) */}
              {!isClimax && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">能力徽章</label>
                  <select
                    value={card.backup}
                    onChange={e => update("backup", e.target.value)}
                    className="w-full border border-solid border-[var(--border)] rounded-lg px-2 py-1.5
                               text-sm text-[var(--text)] bg-white focus:outline-none focus:border-[var(--text-muted)]
                               transition-colors">
                    {BACKUP_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Text fields */}
          <div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-4">
              文字内容
            </p>
            <div className="flex flex-col gap-3">

              <TextField label="卡名" value={card.name}
                onChange={v => update("name", v)} placeholder="例：輝く笑顔 春日野穹" />

              {hasTraits && (
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="特征1" value={card.trait1}
                    onChange={v => update("trait1", v)} placeholder="例：魔法" />
                  <TextField label="特征2" value={card.trait2}
                    onChange={v => update("trait2", v)} placeholder="例：音楽" />
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">效果文本</label>
                <textarea
                  value={card.effect}
                  onChange={e => update("effect", e.target.value)}
                  rows={4}
                  placeholder={"例：【AUTO】 当这张卡片被打出到舞台时，你可以选择自己的一张Hand牌，将其放入等待区。"}
                  className="w-full border border-solid border-[var(--border)] rounded-lg px-3 py-2
                             text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
                             bg-transparent focus:outline-none focus:border-[var(--text-muted)]
                             transition-colors resize-y"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">风味文字</label>
                <textarea
                  value={card.flavor}
                  onChange={e => update("flavor", e.target.value)}
                  rows={2}
                  placeholder="例：「今天也要全力以赴！」"
                  className="w-full border border-solid border-[var(--border)] rounded-lg px-3 py-2
                             text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
                             bg-transparent focus:outline-none focus:border-[var(--text-muted)]
                             transition-colors resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField label="卡号" value={card.serial}
                  onChange={v => update("serial", v)} placeholder="例：SAO/S65-001" />
                <TextField label="画师" value={card.artist}
                  onChange={v => update("artist", v)} placeholder="例：Taro" />
              </div>
            </div>
          </div>

          {/* Art upload */}
          <div className="border border-[var(--border)] rounded-2xl bg-white/70 backdrop-blur-md p-5">
            <p className="text-[10px] font-black tracking-widest uppercase text-[var(--text-secondary)] mb-3">
              卡图
            </p>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleArtFile(e.target.files[0])} />

            {artURL ? (
              <ArtEditor
                artURL={artURL}
                transform={artTransform}
                onTransformChange={setArtTransform}
                onClear={clearArt}
                onReplace={() => fileRef.current.click()}
                cardW={cardW}
                cardH={cardH}
              />
            ) : (
              <div
                onDrop={e => { e.preventDefault(); handleArtFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-8
                           flex flex-col items-center gap-2 cursor-pointer
                           hover:border-[var(--text-muted)] hover:bg-[var(--card-background)]
                           transition-colors">
                <Upload size={20} className="text-[var(--text-muted)]" />
                <p className="text-sm text-[var(--text-secondary)]">点击或拖放图片</p>
                <p className="text-[11px] text-[var(--text-muted)]">支持 JPG / PNG / WebP</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Preview ───────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-24 flex flex-col gap-3 items-center">

          {/* Canvas preview */}
          <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white/70 backdrop-blur-md p-3">
            <div className="relative" style={{ width: 224, height: Math.round(224 * cardH / cardW) }}>
              <canvas
                ref={canvasRef}
                width={cardW}
                height={cardH}
                className="w-full h-full rounded-xl"
              />
              {rendering && (
                <div className="absolute inset-0 flex items-center justify-center
                                bg-white/40 backdrop-blur-sm rounded-xl">
                  <RefreshCw size={20} className="animate-spin text-[var(--text-muted)]" />
                </div>
              )}
            </div>
          </div>

          {/* Export */}
          <button onClick={handleExport}
            className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl
                       bg-[var(--text-muted)] text-white hover:bg-[var(--text-secondary)]
                       transition-colors shadow-sm w-full justify-center">
            <Download size={16} />
            导出 PNG
          </button>

          <p className="text-[10px] text-[var(--text-muted)] text-center">
            导出分辨率：{cardW}×{cardH}px
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Reusable mini-components ───────────────────────────────────────────────────

NumberField.propTypes = { label: PropTypes.string, value: PropTypes.number, min: PropTypes.number, max: PropTypes.number, step: PropTypes.number, onChange: PropTypes.func, wide: PropTypes.bool };
TextField.propTypes   = { label: PropTypes.string, value: PropTypes.string, onChange: PropTypes.func, placeholder: PropTypes.string };
ArtEditor.propTypes   = { artURL: PropTypes.string, transform: PropTypes.object, onTransformChange: PropTypes.func, onClear: PropTypes.func, onReplace: PropTypes.func, cardW: PropTypes.number, cardH: PropTypes.number };

// ── Art Editor (drag to pan, scroll/buttons to zoom) ──────────────────────────

const PREVIEW_MAX = 200;

function ArtEditor({ artURL, transform, onTransformChange, onClear, onReplace, cardW = 448, cardH = 626 }) {
  // Scale preview to fit in PREVIEW_MAX on the longer side
  const ratio   = cardW / cardH;
  const PREVIEW_W = ratio >= 1 ? PREVIEW_MAX : Math.round(PREVIEW_MAX * ratio);
  const PREVIEW_H = ratio >= 1 ? Math.round(PREVIEW_MAX / ratio) : PREVIEW_MAX;

  const { scale, offsetX, offsetY } = transform;
  const [imgSize, setImgSize] = useState({ w: 1, h: 1 });
  const dragRef = useRef(null);

  // Compute display transform matching canvas cover logic
  const coverScale = Math.max(PREVIEW_W / imgSize.w, PREVIEW_H / imgSize.h);
  const dispScale  = coverScale * scale;
  const dispW = imgSize.w * dispScale;
  const dispH = imgSize.h * dispScale;
  const previewRatio = PREVIEW_W / cardW;
  const dispX = (PREVIEW_W - dispW) / 2 + offsetX * previewRatio;
  const dispY = (PREVIEW_H - dispH) / 2 + offsetY * previewRatio;

  const zoom = useCallback((delta) => {
    onTransformChange(prev => ({ ...prev, scale: Math.max(0.3, Math.min(8, prev.scale + delta)) }));
  }, [onTransformChange]);

  // Mouse: scroll to zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  }, [zoom]);

  // Mouse: drag to pan
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offsetX, oy: offsetY };

    const onMove = (ev) => {
      const dx = (ev.clientX - dragRef.current.startX) / previewRatio;
      const dy = (ev.clientY - dragRef.current.startY) / previewRatio;
      onTransformChange(prev => ({ ...prev,
        offsetX: dragRef.current.ox + dx,
        offsetY: dragRef.current.oy + dy,
      }));
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [offsetX, offsetY, onTransformChange, previewRatio]);

  // Touch: single finger pan, two finger pinch-zoom
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      dragRef.current = { type: 'pan', startX: t.clientX, startY: t.clientY, ox: offsetX, oy: offsetY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      dragRef.current = { type: 'pinch', startDist: Math.hypot(dx, dy), startScale: scale };
    }
  }, [offsetX, offsetY, scale]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!dragRef.current) return;
    if (dragRef.current.type === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = (t.clientX - dragRef.current.startX) / previewRatio;
      const dy = (t.clientY - dragRef.current.startY) / previewRatio;
      onTransformChange(prev => ({ ...prev,
        offsetX: dragRef.current.ox + dx,
        offsetY: dragRef.current.oy + dy,
      }));
    } else if (dragRef.current.type === 'pinch' && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(0.3, Math.min(8, dragRef.current.startScale * (dist / dragRef.current.startDist)));
      onTransformChange(prev => ({ ...prev, scale: newScale }));
    }
  }, [onTransformChange, previewRatio]);

  const handleTouchEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Attach non-passive touch listeners directly (React synthetic events can't preventDefault on passive handlers)
  const previewRef = useRef(null);
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd,   { passive: false });
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove',  handleTouchMove);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="flex flex-col gap-2">
      {/* Preview + interaction area */}
      <div
        ref={previewRef}
        className="relative overflow-hidden rounded-xl border border-[var(--border)] cursor-grab active:cursor-grabbing select-none"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}>
        <img
          src={artURL}
          alt="卡图"
          onLoad={e => setImgSize({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
          draggable={false}
          style={{
            position: 'absolute',
            width: dispW, height: dispH,
            left: dispX, top: dispY,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => zoom(0.15)}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)]
                     hover:bg-[var(--card-background)] hover:text-[var(--text)] transition-colors">
          <ZoomIn size={14} />
        </button>
        <button type="button" onClick={() => zoom(-0.15)}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)]
                     hover:bg-[var(--card-background)] hover:text-[var(--text)] transition-colors">
          <ZoomOut size={14} />
        </button>
        <button type="button"
          onClick={() => onTransformChange({ scale: 1, offsetX: 0, offsetY: 0 })}
          className="p-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)]
                     hover:bg-[var(--card-background)] hover:text-[var(--text)] transition-colors">
          <RotateCcw size={14} />
        </button>
        <span className="text-[11px] text-[var(--text-muted)] ml-1">{Math.round(scale * 100)}%</span>
        <div className="flex-1" />
        <button type="button" onClick={onReplace}
          className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          换图
        </button>
        <button type="button" onClick={onClear}
          className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, min, max, step = 1, onChange, wide }) {
  return (
    <div className={wide ? "col-span-2 sm:col-span-1" : ""}>
      <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-full border border-solid border-[var(--border)] rounded-lg px-3 py-1.5
                   text-sm text-[var(--text)] bg-transparent focus:outline-none
                   focus:border-[var(--text-muted)] transition-colors text-center"
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-[var(--text-secondary)] mb-1 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-solid border-[var(--border)] rounded-lg px-3 py-1.5
                   text-sm text-[var(--text)] placeholder:text-[var(--text-muted)]
                   bg-transparent focus:outline-none focus:border-[var(--text-muted)]
                   transition-colors"
      />
    </div>
  );
}

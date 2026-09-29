// === NGS_GenkoYoushi_apply.jsx ===
// Core (helpers + build) from NGS_GenkoYoushi.jsx
(function (thisObj) {
    function vg(g) { return g && (g.property("ADBE Vectors Group") || g.property("ADBE Root Vectors Group") || g.property("Contents")); }
    function addGroup(parent, name) { var c = vg(parent); if (!c) throw Error("VectorsGroup not found"); var g = c.addProperty("ADBE Vector Group"); g.name = name; return g; }
    function addSlider(fx, name, val) { var s = fx.addProperty("ADBE Slider Control"); s.name = name; s.property(1).setValue(val); return s; }
    function addColor(fx, name, col) { var c = fx.addProperty("ADBE Color Control"); c.name = name; c.property(1).setValue(col); return c; }

    function build(p) {
        app.beginUndoGroup("GenkoYoushi vertical (manual gap & scale, baked cell)");
        try {
            if (!app.project) app.newProject();
            var comp = (app.project.activeItem && app.project.activeItem instanceof CompItem)
                ? app.project.activeItem : app.project.items.addComp("GenkoYoushi_Comp", 1920, 1080, 1, 10, 30);

            var L = comp.layers.addShape(); L.name = "GenkoYoushi";
            var LT = L.property("ADBE Transform Group"); if (LT) LT.property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);

            var fx = L.property("ADBE Effect Parade");
            addSlider(fx, "Size ", 100);
            addSlider(fx, "Columns", p.cols);
            addSlider(fx, "Rows", p.rows);
            addSlider(fx, "H Gap", p.hGap);
            addSlider(fx, "Frame Stroke", p.stroke);
            addColor(fx, "Stroke Color", p.strokeColor);
            addSlider(fx, "Offset X ", 0);
            addSlider(fx, "Offset Y ", 0);

            (function addFillAndVertical(fx) {
                var cf = fx.addProperty("ADBE Checkbox Control"); cf.name = "Enable Fill";
                try { cf.property(1).setValue(p.fillOn ? 1 : 0); } catch (_) { }
                var fc = fx.addProperty("ADBE Color Control"); fc.name = "Fill Color";
                try { fc.property(1).setValue(p.fillColor || [1, 1, 1]); } catch (_) { }
            })(fx);

            var cw = (p.totalW - Math.max(0, (p.rows - 1)) * p.hGap) / Math.max(1, p.rows);
            cw = Math.max(1, cw);

            var grid = addGroup(L, "Grid");
            var gTr = grid.property("ADBE Vector Transform Group") || grid.property("ADBE Transform Group");
            var gAnc = gTr && (gTr.property("ADBE Vector Anchor") || gTr.property("ADBE Anchor Point"));
            if (gAnc) try { gAnc.setValue([0, 0]); } catch (_) { }

            var gPos = gTr && (gTr.property("ADBE Vector Position") || gTr.property("ADBE Position"));
            if (gPos) {
                gPos.expression =
                    'var cw=' + cw.toFixed(4) + ';\n' +
                    'var ox=effect("Offset X ")(1)/100*cw;\n' +
                    'var oy=effect("Offset Y ")(1)/100*cw;\n' +
                    '[ox, oy]';
            }

            var gScale = gTr && (gTr.property("ADBE Vector Scale") || gTr.property("ADBE Scale"));
            if (gScale) { gScale.expression = 'var s=effect("Size ")(1); [s,s]'; }

            var gridCnt = vg(grid);
            var colUnit = addGroup(grid, "ColumnUnit");
            var cuCnt = vg(colUnit);

            var cell = cuCnt.addProperty("ADBE Vector Group"); cell.name = "CellUnit";
            var cellCnt = vg(cell);

            var rect = cellCnt.addProperty("ADBE Vector Shape - Rect");
            rect.property("ADBE Vector Rect Position").setValue([0, 0]);
            rect.property("ADBE Vector Rect Size").expression = 'var cw=' + cw.toFixed(4) + '; [cw, cw]';

            var stroke = cellCnt.addProperty("ADBE Vector Graphic - Stroke");
            stroke.property("ADBE Vector Stroke Color").expression = 'effect("Stroke Color")(1)';
            stroke.property("ADBE Vector Stroke Width").expression = 'effect("Frame Stroke")(1)';

            var unitFill = cellCnt.addProperty("ADBE Vector Graphic - Fill");
            unitFill.property("ADBE Vector Fill Color").expression =
                'try{ effect("Fill Color")(1) }catch(e){ try{ effect("Cell Fill Color")(1) }catch(e2){ [1,1,1,1] }}';
            unitFill.property("ADBE Vector Fill Opacity").expression =
                'var n; try{ n = effect("Enable Fill")(1).value; } catch(e){ try{ n = effect("Enable Cell Fill")(1).value; } catch(e2){ n = 0; } } ' +
                '(n === 1) ? 100 : 0;';

            // 縦：上→下（Copies = Columns-1）… ステップに cw をベイク
            var repV = cellCnt.addProperty("ADBE Vector Filter - Repeater"); repV.name = "Rep_Vert";
            repV.property("ADBE Vector Repeater Copies").expression = 'Math.max(0, effect("Columns")(1)-1)';
            var trV = repV.property("ADBE Vector Repeater Transform") || repV.property("ADBE Vector Transform Group");
            var posV = trV && (trV.property("ADBE Vector Repeater Position") || trV.property("ADBE Vector Position"));
            if (posV) {
                posV.expression =
                    'var cw=' + cw.toFixed(4) + ';\n' +
                    '[0, cw]';
            }
            try { var rotV = trV.property("ADBE Vector Repeater Rotation") || trV.property("ADBE Vector Rotation"); if (rotV) rotV.setValue(0); } catch (_) { }
            try { var scV = trV.property("ADBE Vector Repeater Scale") || trV.property("ADBE Vector Scale"); if (scV) scV.setValue([100, 100]); } catch (_) { }

            // 横：左→右（Copies = Rows-1）… Gap 分をマイナス方向へオフセット
            var repH = gridCnt.addProperty("ADBE Vector Filter - Repeater"); repH.name = "Rep_Rows";
            repH.property("ADBE Vector Repeater Copies").expression = 'Math.max(0, effect("Rows")(1)-1)';
            var trH = repH.property("ADBE Vector Repeater Transform") || repH.property("ADBE Vector Transform Group");
            var posH = trH && (trH.property("ADBE Vector Repeater Position") || trH.property("ADBE Vector Position"));
            if (posH) {
                posH.expression =
                    'var cw=' + cw.toFixed(4) + '; var G=effect("H Gap")(1);\n' +
                    '[ -(cw+G), 0 ]';
            }
            try { var rotH = trH.property("ADBE Vector Repeater Rotation") || trH.property("ADBE Vector Rotation"); if (rotH) rotH.setValue(0); } catch (_) { }
            try { var scH = trH.property("ADBE Vector Repeater Scale") || trH.property("ADBE Vector Scale"); if (scH) scH.setValue([100, 100]); } catch (_) { }
        } catch (e) { alert("Error: " + e.toString()); throw e; }
        finally { app.endUndoGroup(); }
    }

    // UI
    function buildUI(thisObj) {
        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "NGS_GenkoYoushi_4", undefined, { resizeable: true });

        // --- 共通サイズ（必要ならここだけ弄れば全体が連動） ---
        var UI_SCALE = 0.80;
        function sz(n) { return Math.max(1, Math.round(n * UI_SCALE)); }
        var LABEL_W = sz(60);
        var FIELD_W = sz(40);
        var CONTROL_H = sz(18);
        var BTN_MIN_W = sz(5);
        var BTN_MIN_H = sz(10);
        var ROW_GAP = sz(2);
        var COL_GAP = sz(6);
        var TAB_MIN_W = sz(200);
        var TAB_MIN_H = sz(100);
        // --- 伸縮ボタン設定（最小だけ小さい・両軸フィル） ---
        function makeElasticButton(b) {
            try {
                var MIN_W = sz(40); // もっと小さく→ 40〜48
                var MIN_H = sz(10); // もっと小さく→ 10〜12（クリックしにくくなるので注意）
                b.minimumSize = [MIN_W, MIN_H];
                b.maximumSize = [10000, 10000];   // 事実上の無制限
                b.alignment = ["fill", "fill"]; // 横も縦もビヨーン
                // （フォントは固定しない。小さくしたいときだけ下を解禁）
                // b.graphics.font = ScriptUI.newFont("MS UI Gothic", "REGULAR", Math.max(8, Math.round(9*UI_SCALE)));
            } catch (e) { }
        }
        function unfixButton(b) {
            try {
                b.maximumSize = [10000, 10000];    // 固定上限を撤廃
                // 明示固定していた場合の初期sizeを小さめに戻す（任意）
                b.size = undefined;                // AEでは無視されることもあるので…
                b.preferredSize = [0, 0];          // 希望サイズ0=レイアウト任せ
            } catch (e) { }
        }

        // --- ルート ---
        win.orientation = "column";
        win.alignChildren = ["fill", "fill"];
        win.margins = sz(8);
        win.spacing = ROW_GAP;

        // --- タブパネル ＆ タブを最初に作る（ここが重要） ---
        var tp = win.add("tabbedpanel");
        tp.alignChildren = ["fill", "fill"];
        tp.margins = 0;
        tp.spacing = 0;
        tp.minimumSize = [TAB_MIN_W, TAB_MIN_H];

        var tabMain = tp.add("tab", undefined, "設定");     // ← 先に定義
        var tabPresets = tp.add("tab", undefined, "プリセット");

        // =========================
        // 設定タブ UI
        // =========================
        var g = tabMain.add("group");
        g.orientation = "column";
        g.alignChildren = ["fill", "top"];
        g.alignment = ["fill", "fill"];
        g.spacing = ROW_GAP;
        try {
            [btnApply, btnFxToUI /*, btnPreset(非表示なら不要)*/].forEach(function (b) {
                unfixButton(b);          //（固定を解除）
                makeElasticButton(b);    //（伸縮に切替）
            });
        } catch (e) { }
        function addRow2(l1, d1, l2, d2) {
            var row = g.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.alignment = ["fill", "top"];
            row.spacing = COL_GAP;

            function field(label, def) {
                var gp = row.add("group");
                gp.orientation = "row";
                gp.alignChildren = ["left", "center"];
                gp.alignment = ["fill", "center"];
                gp.spacing = sz(6);

                var st = gp.add("statictext", undefined, label);
                st.justify = "right";
                st.preferredSize = [LABEL_W, CONTROL_H];

                var ed = gp.add("edittext", undefined, def);
                ed.preferredSize = [FIELD_W, CONTROL_H];
                ed.characters = 5;
                ed.alignment = ["fill", "center"];
                return ed;
            }
            var e1 = field(l1, d1);
            var e2 = field(l2, d2);
            return { row: row, e1: e1, e2: e2 };
        }

        function addRow1(label, def) {
            var row = g.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.alignment = ["fill", "top"];
            row.spacing = sz(6);

            var st = row.add("statictext", undefined, label);
            st.justify = "right";
            st.preferredSize = [LABEL_W, CONTROL_H];

            var ed = row.add("edittext", undefined, def);
            ed.preferredSize = [FIELD_W, CONTROL_H];
            ed.characters = 5;
            ed.alignment = ["fill", "center"];
            return ed;
        }

        function addColorRow(label, rgb01Arr) {
            function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
            function paint(panel, a) {
                panel.graphics.backgroundColor = panel.graphics.newBrush(
                    panel.graphics.BrushType.SOLID_COLOR,
                    [clamp01(a[0]), clamp01(a[1]), clamp01(a[2])]
                );
            }
            var row = g.add("group");
            row.orientation = "row";
            row.alignChildren = ["left", "center"];
            row.alignment = ["fill", "top"];
            row.spacing = COL_GAP;

            var st = row.add("statictext", undefined, label);
            st.justify = "right";
            st.preferredSize = [LABEL_W, CONTROL_H];

            var btn = row.add("button", undefined, "選択");
            btn.minimumSize = [BTN_MIN_W, BTN_MIN_H];
            btn.alignment = ["left", "center"];

            var sw = row.add("panel");
            sw.preferredSize = [sz(28), sz(14)];
            sw.alignment = ["left", "center"];
            paint(sw, rgb01Arr);

            rgb01Arr._repaint = function () { paint(sw, rgb01Arr); };

            btn.onClick = function () {
                function rgbToHex(a) { return ((Math.round(255 * a[0]) & 255) << 16) | ((Math.round(255 * a[1]) & 255) << 8) | (Math.round(255 * a[2]) & 255); }
                function hexToRgb(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]; }
                var picked = $.colorPicker(rgbToHex(rgb01Arr));
                if (picked !== -1) {
                    var c = hexToRgb(picked);
                    rgb01Arr[0] = c[0]; rgb01Arr[1] = c[1]; rgb01Arr[2] = c[2];
                    rgb01Arr._repaint && rgb01Arr._repaint();
                }
            };
            return rgb01Arr;
        }

        // 実UI（設定タブ）
        var edScale = addRow1("サイズ：", "100");
        var edC = addRow1("一行の行数：", "8");
        var edR = addRow1("行数：", "5");
        var edHG = addRow1("横間隔：", "6");
        var edSW = addRow1("線の太さ：", "2");

        // 色と塗りの設定はこのまま残す（順番は任意）
        var strokeColor = addColorRow("枠の色：", [0.21, 0.40, 0.72]);
        var fillColor = addColorRow("塗りの色：", [1, 1, 1]);

        var chkFill = g.add("checkbox", undefined, "塗りつぶしを有効");
        chkFill.alignment = ["left", "top"];

        // ボタン行（右寄せのまま）
        var rowBtn = g.add("group");
        rowBtn.orientation = "row";
        rowBtn.alignment = ["fill", "top"];
        rowBtn.spacing = sz(6);

        var spacer = rowBtn.add("group"); // 右寄せ用の空グループ
        spacer.alignment = ["fill", "center"];

        var btnApply = rowBtn.add("button", undefined, "適用");
        var btnFxToUI = rowBtn.add("button", undefined, "Effect→UI");
        var btnPreset = rowBtn.add("button", undefined, "プリセット");
        [btnApply, btnFxToUI, btnPreset].forEach(function (b) {
            b.minimumSize = [BTN_MIN_W, BTN_MIN_H];
        });
        btnPreset.visible = false;
        try { btnPreset.maximumSize = [0, 0]; } catch (_) { }
        // =========================
        // 既存ロジックに接続（build/pickActiveGYLayer/readFx などはそのまま流用）
        // =========================
        function pickActiveGYLayer() {
            try {
                var comp = app.project.activeItem;
                if (!(comp && comp instanceof CompItem)) return null;
                if (comp.selectedLayers && comp.selectedLayers.length > 0) return comp.selectedLayers[0];
                return comp.layer("GenkoYoushi") || comp.layer("GenkoYoushi_001") || null;
            } catch (_) { return null; }
        }
        function readFx(layer, name, defVal) {
            try {
                var fx = layer.property("ADBE Effect Parade"); if (!fx) return defVal;
                var p = fx.property(name); if (!p) return defVal;
                return p.property(1).value;
            } catch (_) { return defVal; }
        }

        btnApply.onClick = function () {
            var params = {
                totalW: Math.max(10, 600),
                cols: Math.max(1, parseInt(edC.text, 10) || 8),
                rows: Math.max(1, parseInt(edR.text, 10) || 5),
                hGap: parseFloat(edHG.text) || 6,
                stroke: Math.max(0.1, parseFloat(edSW.text) || 2),
                strokeColor: strokeColor.slice(),
                fillOn: !!chkFill.value,
                fillColor: fillColor.slice()
            };
            build(params);

            // 生成直後 Size 反映
            try {
                var L = app.project.activeItem.selectedLayers[0] || app.project.activeItem.layer("GenkoYoushi");
                var grid = L.property("ADBE Root Vectors Group").property("Grid");
                var gTr = grid && (grid.property("ADBE Vector Transform Group") || grid.property("ADBE Transform Group"));
                var gSc = gTr && (gTr.property("ADBE Vector Scale") || gTr.property("ADBE Scale"));
                if (gSc) { var s = parseFloat(edScale.text) || 100; gSc.setValue([s, s]); }
            } catch (_) { }
        };

        btnFxToUI.onClick = function () {
            try {
                var L = pickActiveGYLayer();
                if (!L) { alert("原稿用紙レイヤーを選択してください。"); return; }

                var sizePct = readFx(L, "Size ", parseFloat(edScale.text) || 100);
                var cols = readFx(L, "Columns", parseInt(edC.text, 10) || 8);
                var rows = readFx(L, "Rows", parseInt(edR.text, 10) || 5);
                var hgap = readFx(L, "H Gap", parseFloat(edHG.text) || 6);
                var swidth = readFx(L, "Frame Stroke", parseFloat(edSW.text) || 2);

                var scCol = readFx(L, "Stroke Color", null);
                var enFill = readFx(L, "Enable Fill", 0);
                var fiCol = readFx(L, "Fill Color", null);

                edScale.text = String(sizePct);
                edC.text = String(Math.max(1, Math.round(cols)));
                edR.text = String(Math.max(1, Math.round(rows)));
                edHG.text = String(hgap);
                edSW.text = String(swidth);

                if (scCol && scCol.length >= 3) {
                    for (var i = 0; i < 3; i++) strokeColor[i] = Math.max(0, Math.min(1, scCol[i]));
                    if (strokeColor._repaint) strokeColor._repaint();
                }
                chkFill.value = (enFill === 1);
                if (fiCol && fiCol.length >= 3) {
                    for (var j = 0; j < 3; j++) fillColor[j] = Math.max(0, Math.min(1, fiCol[j]));
                    if (fillColor._repaint) fillColor._repaint();
                }
            } catch (e) { alert("Effect→UI 取り込みでエラー: " + e.toString()); }
        };

        // =========================
        // プリセットタブ
        // =========================
        var PRESET_SECTION = "NGS_GenkoYoushi_Presets";
        var PRESET_INDEX_KEY = "_INDEX_";
        // プリセットタブ
        try {
            [bSaveUI, bSaveLayer, bLoad, bApply, bDelete].forEach(function (b) {
                unfixButton(b);
                makeElasticButton(b);
            });
        } catch (e) { }
        function readPresetIndex() {
            try {
                if (!app.settings.haveSetting(PRESET_SECTION, PRESET_INDEX_KEY)) return [];
                var s = app.settings.getSetting(PRESET_SECTION, PRESET_INDEX_KEY);
                var arr = JSON.parse(s); return (arr && arr.length) ? arr : [];
            } catch (_) { return []; }
        }
        function writePresetIndex(arr) {
            try { app.settings.saveSetting(PRESET_SECTION, PRESET_INDEX_KEY, JSON.stringify(arr || [])); }
            catch (e) { alert("プリセットインデックス保存失敗: " + e.toString()); }
        }
        function savePreset(name, dataObj) {
            try { app.settings.saveSetting(PRESET_SECTION, name, JSON.stringify(dataObj)); return true; }
            catch (e) { alert("プリセット保存失敗: " + e.toString()); return false; }
        }
        function loadPreset(name) {
            try {
                if (!app.settings.haveSetting(PRESET_SECTION, name)) return null;
                var s = app.settings.getSetting(PRESET_SECTION, name);
                if (!s || s === "") return null;
                return JSON.parse(s);
            } catch (e) { alert("プリセット読込失敗: " + e.toString()); return null; }
        }
        function deletePreset(name) {
            try {
                if (!app.settings.haveSetting(PRESET_SECTION, name)) return;
                if (app.settings.deleteSetting) app.settings.deleteSetting(PRESET_SECTION, name);
                else app.settings.saveSetting(PRESET_SECTION, name, "");
            } catch (e) { alert("プリセット削除失敗: " + e.toString()); }
        }
        function upsertPresetIndex(name) {
            var idx = readPresetIndex();
            if (idx.indexOf(name) === -1) { idx.push(name); writePresetIndex(idx); }
        }
        function removeFromPresetIndex(name) {
            var idx = readPresetIndex();
            var out = []; for (var i = 0; i < idx.length; i++) if (idx[i] !== name) out.push(idx[i]);
            writePresetIndex(out);
        }
        function currentParamsFromUI() {
            return {
                sizePct: parseFloat(edScale.text) || 100,
                cols: Math.max(1, parseInt(edC.text, 10) || 8),
                rows: Math.max(1, parseInt(edR.text, 10) || 5),
                hGap: parseFloat(edHG.text) || 6,
                stroke: Math.max(0.1, parseFloat(edSW.text) || 2),
                strokeColor: strokeColor.slice(0, 3),
                fillOn: !!chkFill.value,
                fillColor: fillColor.slice(0, 3)
            };
        }
        function applyParamsToUI(p) {
            if (!p) return;
            edScale.text = String(p.sizePct || 100);
            edC.text = String(Math.max(1, Math.round(p.cols || 8)));
            edR.text = String(Math.max(1, Math.round(p.rows || 5)));
            edHG.text = String(p.hGap || 6);
            edSW.text = String(p.stroke || 2);
            if (p.strokeColor && p.strokeColor.length >= 3) {
                for (var i = 0; i < 3; i++) strokeColor[i] = p.strokeColor[i];
                if (strokeColor._repaint) strokeColor._repaint();
            }
            chkFill.value = !!p.fillOn;
            if (p.fillColor && p.fillColor.length >= 3) {
                for (var j = 0; j < 3; j++) fillColor[j] = p.fillColor[j];
                if (fillColor._repaint) fillColor._repaint();
            }
        }

        function buildPresetUI(parent) {
            var gTop = parent.add("group");
            gTop.orientation = "row";
            gTop.alignChildren = ["fill", "fill"];
            gTop.alignment = ["fill", "fill"];
            gTop.spacing = COL_GAP;

            var lb = gTop.add("listbox", undefined, [], { multiselect: false });
            lb.preferredSize = [sz(220), sz(180)];
            lb.alignment = ["fill", "fill"];

            var gBtn = gTop.add("group");
            gBtn.orientation = "column";
            gBtn.alignChildren = ["fill", "top"];
            gBtn.alignment = ["fill", "fill"];
            gBtn.spacing = sz(6);

            var edName = gBtn.add("edittext", undefined, "");
            edName.characters = 16;
            edName.preferredSize = [sz(200), CONTROL_H];

            var bSave = gBtn.add("button", undefined, "UI保存");
            var bSaveLayer = gBtn.add("button", undefined, "レイヤー保存");
            var bLoad = gBtn.add("button", undefined, "読込");
            var bApplyPreset = gBtn.add("button", undefined, "適用");
            var bDel = gBtn.add("button", undefined, "削除");
            [bSave, bLoad, bApplyPreset, bDel].forEach(function (b) {
                b.minimumSize = [BTN_MIN_W, BTN_MIN_H];
            });


            var sep = gBtn.add("panel", undefined, undefined); // 仕切り
            sep.alignment = ["fill", "top"];
            sep.minimumSize = [1, sz(1)];

            var bCloseToMain = gBtn.add("button", undefined, "設定に戻る");
            bCloseToMain.minimumSize = [BTN_MIN_W, BTN_MIN_H];
            sep.visible = false;
            bCloseToMain.visible = false;
            try { sep.maximumSize = [0, 0]; } catch (_) { }
            try { bCloseToMain.maximumSize = [0, 0]; } catch (_) { }
            bSaveLayer.onClick = function () {
                try {
                    var ai = app.project && app.project.activeItem;
                    if (!ai || !(ai instanceof CompItem)) throw Error("アクティブコンポがありません");
                    var lyr = ai.selectedLayers && ai.selectedLayers[0];
                    if (!lyr || !(lyr instanceof ShapeLayer)) throw Error("ShapeLayer を選択してください");
                    if (lyr.name !== "GenkoYoushi") throw Error("GenkoYoushi レイヤを選んでください");

                    var fx = lyr.property("ADBE Effect Parade");
                    function num(name, def) { var p = fx.property(name); return p ? p.property(1).value : def; }
                    function col(name, def) { var p = fx.property(name); return p ? p.property(1).value : def; }
                    function chk(name, def) { var p = fx.property(name); try { return p ? (p.property(1).value === 1) : def; } catch (_) { return def; } }

                    // ★UIと同じキー名に統一（sizePct を保存）
                    var data = {
                        cols: Math.max(1, parseInt(num("Columns", 20), 10) || 20),
                        rows: Math.max(1, parseInt(num("Rows", 20), 10) || 20),
                        hGap: parseFloat(num("H Gap", 0)) || 0,
                        totalW: 800, // レイヤーからは取得不可のため暫定
                        sizePct: parseFloat(num("Size ", 100)) || 100, // ←ここ重要！
                        stroke: parseFloat(num("Frame Stroke", 2)) || 2,
                        strokeColor: (function (v) { v = v || [1, 1, 1, 1]; return [v[0], v[1], v[2]]; })(col("Stroke Color", [1, 1, 1, 1])),
                        fillOn: !!chk("Enable Fill", false),
                        fillColor: (function (v) { v = v || [1, 1, 1, 1]; return [v[0], v[1], v[2]]; })(col("Fill Color", [1, 1, 1, 1])),
                        offx: parseFloat(num("Offset X ", 0)) || 0,
                        offy: parseFloat(num("Offset Y ", 0)) || 0
                    };

                    var name = edName.text.replace(/^\s+|\s+$/g, "");
                    if (!name) { alert("プリセット名を入力してください。"); return; }
                    if (savePreset(name, data)) { upsertPresetIndex(name); }
                    refreshList();
                } catch (e) { alert("レイヤー保存エラー: " + e.toString()); }
            };
            function refreshList() {
                lb.removeAll();
                var idx = readPresetIndex();
                var alive = [];
                for (var i = 0; i < idx.length; i++) {
                    var n = idx[i], keep = false;
                    try {
                        if (app.settings.haveSetting(PRESET_SECTION, n)) {
                            var val = app.settings.getSetting(PRESET_SECTION, n);
                            keep = !!val;
                        }
                    } catch (_) { }
                    if (keep) { alive.push(n); lb.add("item", n); }
                }
                if (alive.length !== idx.length) writePresetIndex(alive);
            }
            refreshList();

            lb.onChange = function () { if (lb.selection) edName.text = lb.selection.text; };
            lb.onDoubleClick = function () { bApplyPreset.notify("onClick"); };

            bSave.onClick = function () {
                var name = edName.text.replace(/^\s+|\s+$/g, "");
                if (!name) { alert("プリセット名を入力してください。"); return; }
                if (savePreset(name, currentParamsFromUI())) { upsertPresetIndex(name); refreshList(); }
            };
            bLoad.onClick = function () {
                var pick = edName.text.replace(/^\s+|\s+$/g, "") || (lb.selection ? lb.selection.text : "");
                if (!pick) { alert("読込対象を選択してください。"); return; }
                var data = loadPreset(pick);
                if (!data) { alert("プリセットが見つかりません。"); return; }
                applyParamsToUI(data);
                tp.selection = tabMain;
            };
            bApplyPreset.onClick = function () {
                var pick = edName.text.replace(/^\s+|\s+$/g, "") || (lb.selection ? lb.selection.text : "");
                if (!pick) { alert("適用対象を選択してください。"); return; }
                var data = loadPreset(pick);
                if (!data) { alert("プリセットが見つかりません。"); return; }
                applyParamsToUI(data);
                // 生成実行
                var p = currentParamsFromUI();
                build({
                    totalW: Math.max(10, 600),
                    cols: Math.max(1, p.cols),
                    rows: Math.max(1, p.rows),
                    hGap: p.hGap,
                    stroke: Math.max(0.1, p.stroke),
                    strokeColor: (p.strokeColor || []).slice(0, 3),
                    fillOn: !!p.fillOn,
                    fillColor: (p.fillColor || []).slice(0, 3)
                });
                // スケール反映
                try {
                    var comp = app.project.activeItem;
                    var L = comp && (comp.selectedLayers[0] || comp.layer("GenkoYoushi"));
                    var grid = L && L.property("ADBE Root Vectors Group").property("Grid");
                    var gTr = grid && (grid.property("ADBE Vector Transform Group") || grid.property("ADBE Transform Group"));
                    var gSc = gTr && (gTr.property("ADBE Vector Scale") || gTr.property("ADBE Scale"));
                    if (gSc) { var s = parseFloat(edScale.text) || (data.sizePct || 100); gSc.setValue([s, s]); }
                } catch (_) { }
            };
            bDel.onClick = function () {
                var pick = edName.text.replace(/^\s+|\s+$/g, "") || (lb.selection ? lb.selection.text : "");
                if (!pick) { alert("削除対象を選択してください。"); return; }
                deletePreset(pick); removeFromPresetIndex(pick); refreshList(); edName.text = "";
            };
            bCloseToMain.onClick = function () { tp.selection = tabMain; };

            // 設定タブの「プリセット」ボタン → タブ切替
            btnPreset.onClick = function () { refreshList(); tp.selection = tabPresets; };
        }

        // プリセットタブの構築はここで一度だけ
        buildPresetUI(tabPresets);

        // 初期タブは設定
        tp.selection = tabMain;

        // …UIを全部 add し終えた“直後”、returnの直前に入れる
        try {
            if (win instanceof Window || win instanceof Panel) {
                win.onResizing = win.onResize = function () { try { this.layout.resize(); } catch (e) { } };
                win.layout.layout(true);
                // もっと小さく畳めるように最小サイズを下げる
                win.minimumSize = [sz(220), sz(140)]; // さらに攻めるなら [sz(200), sz(120)]
            }
        } catch (e) { }

        return win;   // ← 最後は必ず return
    }
    // --- 実行部（buildUIの外） ---
    var pal = buildUI(thisObj);
    if (!(pal instanceof Panel)) {  // palette実行時だけ表示
        pal.center();
        pal.show();
    }

})(this);
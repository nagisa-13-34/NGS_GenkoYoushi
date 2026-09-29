
(function (thisObj) {
  function vg(g) { return g && (g.property("ADBE Vectors Group") || g.property("ADBE Root Vectors Group") || g.property("Contents")); }
  function addGroup(parent, name) { var c = vg(parent); if (!c) throw Error("VectorsGroup not found"); var g = c.addProperty("ADBE Vector Group"); g.name = name; return g; }
  function addSlider(fx, name, val) { var s = fx.addProperty("ADBE Slider Control"); s.name = name; s.property(1).setValue(val); return s; }
  function addColor(fx, name, col) { var c = fx.addProperty("ADBE Color Control"); c.name = name; c.property(1).setValue(col); return c; }

  function build(p) {
    app.beginUndoGroup("GenkoYoshi vertical (manual gap & scale, baked cell)");
    try {
      if (!app.project) app.newProject();
      var comp = (app.project.activeItem && app.project.activeItem instanceof CompItem)
        ? app.project.activeItem : app.project.items.addComp("GenkoYoshi_Comp", 1920, 1080, 1, 10, 30);

      var L = comp.layers.addShape(); L.name = "GenkoYoshi";
      var LT = L.property("ADBE Transform Group"); if (LT) LT.property("ADBE Position").setValue([comp.width / 2, comp.height / 2]);

      // ---- Effects（Cell Size は作らない）----
      var fx = L.property("ADBE Effect Parade");
      addSlider(fx, "Size (%)", 100);          // 手動スケール（Rowsと非連動）
      addSlider(fx, "Columns", p.cols);       // 一行の行数（縦）
      addSlider(fx, "Rows", p.rows);       // 行数（横）
      addSlider(fx, "H Gap", p.hGap);       // 列間（±可）
      addSlider(fx, "Frame Stroke", p.stroke);     // セル線の太さ
      addColor(fx, "Stroke Color", p.strokeColor);
      addSlider(fx, "Offset X (%)", 0);
      addSlider(fx, "Offset Y (%)", 0);

      // ★セルサイズ（px）を初期値からベイク
      var cw = (p.totalW - Math.max(0, (p.rows - 1)) * p.hGap) / Math.max(1, p.rows);
      cw = Math.max(1, cw); // 下限

      var grid = addGroup(L, "Grid");
      var gTr = grid.property("ADBE Vector Transform Group") || grid.property("ADBE Transform Group");

      // 右端ピン：アンカー原点
      var gAnc = gTr && (gTr.property("ADBE Vector Anchor") || gTr.property("ADBE Anchor Point"));
      if (gAnc) try { gAnc.setValue([0, 0]); } catch (_) { }

      // 位置（％オフセットのみ）… cw を式内にベイク
      var gPos = gTr && (gTr.property("ADBE Vector Position") || gTr.property("ADBE Position"));
      if (gPos) {
        gPos.expression =
          'var cw=' + cw.toFixed(4) + ';\n' +
          'var ox=effect("Offset X (%)")(1)/100*cw;\n' +
          'var oy=effect("Offset Y (%)")(1)/100*cw;\n' +
          '[ox, oy]';
      }

      // スケール：Size(%)そのまま
      var gScale = gTr && (gTr.property("ADBE Vector Scale") || gTr.property("ADBE Scale"));
      if (gScale) { gScale.expression = 'var s=effect("Size (%)")(1); [s,s]'; }

      var gridCnt = vg(grid);

      // 列ユニット
      var colUnit = addGroup(grid, "ColumnUnit");
      var cuCnt = vg(colUnit);

      var cell = cuCnt.addProperty("ADBE Vector Group"); cell.name = "CellUnit";
      var cellCnt = vg(cell);

      // セル長方形：cw をベイク
      var rect = cellCnt.addProperty("ADBE Vector Shape - Rect");
      rect.property("ADBE Vector Rect Position").setValue([0, 0]);
      rect.property("ADBE Vector Rect Size").expression = 'var cw=' + cw.toFixed(4) + '; [cw, cw]';

      var stroke = cellCnt.addProperty("ADBE Vector Graphic - Stroke");
      stroke.property("ADBE Vector Stroke Color").expression = 'effect("Stroke Color")(1)';
      stroke.property("ADBE Vector Stroke Width").expression = 'effect("Frame Stroke")(1)';

      // 縦：上→下（Copies = Columns-1）… ステップに cw をベイク
      var repV = cellCnt.addProperty("ADBE Vector Filter - Repeater"); repV.name = "Rep_Vert";
      repV.property("ADBE Vector Repeater Copies").expression = 'Math.max(0, effect("Columns")(1)-1)';
      var trV = repV.property("ADBE Vector Repeater Transform") || repV.property("ADBE Vector Transform Group");
      var posV = trV && (trV.property("ADBE Vector Repeater Position") || trV.property("ADBE Vector Position"));
      if (posV) { posV.expression = 'var cw=' + cw.toFixed(4) + '; [0, cw]'; }
      try { var rotV = trV.property("ADBE Vector Repeater Rotation") || trV.property("ADBE Vector Rotation"); if (rotV) rotV.setValue(0); } catch (_) { }
      try { var scV = trV.property("ADBE Vector Repeater Scale") || trV.property("ADBE Vector Scale"); if (scV) scV.setValue([100, 100]); } catch (_) { }

      // 横：右端から左へ（Copies = Rows-1、ステップ = -(cw+HGap)）… cw はベイク、HGapは手動反映
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

  // ---- UI（従来どおり／Cell Size は出さない）----
  function buildUI(thisObj) {
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "NGS_GenkoYoshi", undefined, { resizeable: false });
    win.alignChildren = "fill";
    var g = win.add("group"); g.orientation = "column"; g.alignChildren = "left";

    function addRow2(l1, d1, l2, d2) {
      var r = g.add("group");
      r.add("statictext", undefined, l1);
      var e1 = r.add("edittext", undefined, d1); e1.characters = 6;
      r.add("statictext", undefined, l2);
      var e2 = r.add("edittext", undefined, d2); e2.characters = 6;
      return [e1, e2];
    }
    function addColor(label, defRGB01) {
      function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); } function clampRgb01(a) { return [clamp01(a[0] || 0), clamp01(a[1] || 0), clamp01(a[2] || 0)]; }
      function rgbToHex(a) { a = clampRgb01(a); return ((Math.round(255 * a[0]) & 255) << 16) | ((Math.round(255 * a[1]) & 255) << 8) | (Math.round(255 * a[2]) & 255); }
      function hexToRgb(h) { return [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, ((h) & 255) / 255]; }
      var r = g.add("group"); r.add("statictext", undefined, label);
      var btn = r.add("button", undefined, "選択"); var sw = r.add("panel"); sw.preferredSize = [40, 20];
      function paint(arr) { var rgb = [Math.max(0, Math.min(1, arr[0] || 0)), Math.max(0, Math.min(1, arr[1] || 0)), Math.max(0, Math.min(1, arr[2] || 0))]; sw.graphics.backgroundColor = sw.graphics.newBrush(sw.graphics.BrushType.SOLID_COLOR, rgb); }
      paint(defRGB01);
      btn.onClick = function () { var startHex = ((Math.round(255 * defRGB01[0]) & 255) << 16) | ((Math.round(255 * defRGB01[1]) & 255) << 8) | (Math.round(255 * defRGB01[2]) & 255); var picked = $.colorPicker(startHex); if (picked !== -1) { var rgb = [((picked >> 16) & 255) / 255, ((picked >> 8) & 255) / 255, (picked & 255) / 255]; for (var i = 0; i < 3; i++) defRGB01[i] = rgb[i]; paint(defRGB01); } };
      return defRGB01;
    }

    var r1 = addRow2("サイズ(%)：", "100", "一行の行数：", "8");
    var edScale = r1[0], edC = r1[1];
    var r2 = addRow2("行数：", "5", "横間隔：", "6");
    var edR = r2[0], edHG = r2[1];
    var r3 = g.add("group"); r3.add("statictext", undefined, "線の太さ(px)：");
    var edSW = r3.add("edittext", undefined, "2"); edSW.characters = 6;
    var strokeColor = addColor("枠の色：", [0.21, 0.40, 0.72]);

    var btn = g.add("button", undefined, "適用");
    btn.onClick = function () {
      var params = {
        totalW: Math.max(10, 600), // 初期セル算出用の仮幅（自由）
        cols: Math.max(1, parseInt(edC.text, 10) || 8),
        rows: Math.max(1, parseInt(edR.text, 10) || 5),
        hGap: parseFloat(edHG.text) || 6,
        stroke: Math.max(0.1, parseFloat(edSW.text) || 2),
        strokeColor: strokeColor.slice()
      };
      build(params);
      // スケール適用
      try {
        var L = app.project.activeItem.selectedLayers[0] || app.project.activeItem.layer("GenkoYoshi");
        var grid = L.property("ADBE Root Vectors Group").property("Grid");
        var gTr = grid && (grid.property("ADBE Vector Transform Group") || grid.property("ADBE Transform Group"));
        var gSc = gTr && (gTr.property("ADBE Vector Scale") || gTr.property("ADBE Scale"));
        if (gSc) { var s = parseFloat(edScale.text) || 100; gSc.setValue([s, s]); }
      } catch (_) { }
    };

    if (win instanceof Window) { win.center(); win.show(); }
    return win;
  }

  buildUI(thisObj);
})();

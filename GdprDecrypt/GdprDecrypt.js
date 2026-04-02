define(["qlik", "jquery", "text!./GdprDecrypt.css"], function (qlik, $, cssContent) {
  "use strict";

  var DEFAULT_API_URL = "https://rd6.hitechpals.com/aes_decrypt/decrypt";
  var DEFAULT_ID_FIELD = "id";
  var DEFAULT_ENCRYPTED_COLUMNS = "hr_id";

  var INTERNAL_MAX_ROWS = 100000;
  var INTERNAL_PAGE_SIZE = 5000;
  var INTERNAL_TIMEOUT_SECONDS = 180;
  var INTERNAL_MAX_EXPRESSION_LENGTH = 120000;

  $("<style>").html(cssContent).appendTo("head");

  var instanceState = {};

  function getState(instanceId) {
    if (!instanceState[instanceId]) {
      instanceState[instanceId] = {
        busy: false,
        tone: "info",
        message: "Idle. Configure fields and click Decrypt.",
        progress: "",
        stats: "",
        previewRows: [],
        originalPropsByObjectId: {},
        originalScript: null,
        usedScriptApproach: false
      };
    }
    return instanceState[instanceId];
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function parseColumns(csv) {
    return String(csv || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function createTimeoutController(timeoutSeconds) {
    var timeoutMs = Math.max(5, timeoutSeconds) * 1000;
    var controller = new AbortController();
    var timeoutHandle = setTimeout(function () { controller.abort(); }, timeoutMs);
    return {
      signal: controller.signal,
      clear: function () { clearTimeout(timeoutHandle); }
    };
  }

  function fieldRef(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) { return "[]"; }
    if (trimmed.charAt(0) === "[" && trimmed.charAt(trimmed.length - 1) === "]") {
      return trimmed;
    }
    return "[" + trimmed.replace(/\]/g, "\\]") + "]";
  }

  function qlikStringLiteral(value) {
    return "'" + String(value == null ? "" : value).replace(/'/g, "''") + "'";
  }

  function normalizeFieldName(name) {
    var normalized = String(name == null ? "" : name).trim().toLowerCase();
    if (!normalized) { return ""; }
    normalized = normalized.replace(/^\[|\]$/g, "");
    normalized = normalized.replace(/^"|"$/g, "");
    return normalized;
  }

  function fieldNameVariants(name) {
    var normalized = normalizeFieldName(name);
    if (!normalized) { return []; }
    var variants = {};
    variants[normalized] = true;
    if (normalized.indexOf(".") >= 0) {
      variants[normalized.split(".").pop()] = true;
    }
    return Object.keys(variants);
  }

  function stripLeadingEquals(expression) {
    if (typeof expression !== "string") { return expression; }
    var trimmed = expression.trim();
    if (trimmed.charAt(0) === "=") { return trimmed.slice(1).trim(); }
    return trimmed;
  }

  function deepClone(value) {
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    return JSON.parse(JSON.stringify(value, function (_key, current) {
      if (typeof current === "function") { return undefined; }
      if (!current || typeof current !== "object") { return current; }
      if (!seen) { return current; }
      if (seen.has(current)) { return undefined; }
      seen.add(current);
      return current;
    }));
  }

  function tryExtractBareField(expression) {
    if (typeof expression !== "string") { return null; }
    var text = expression.trim();
    if (!text) { return null; }
    if (text.charAt(0) === "=") { text = text.slice(1).trim(); }
    var bracketMatch = text.match(/^\[([^\]]+)\]$/);
    if (bracketMatch) { return bracketMatch[1].trim().toLowerCase(); }
    if (/^[A-Za-z0-9_ .$-]+$/.test(text)) { return text.toLowerCase(); }
    return null;
  }

  function getEngineModel(app) {
    if (app && app.model) { return app.model; }
    return app;
  }

  function unwrapPropertiesEnvelope(value) {
    if (!value || typeof value !== "object") { return value; }
    if (value.qProperty && typeof value.qProperty === "object") { return value.qProperty; }
    if (value.properties && typeof value.properties === "object") { return value.properties; }
    if (value.qProp && typeof value.qProp === "object") { return value.qProp; }
    return value;
  }

  function formatError(error) {
    if (!error) { return "Unknown error"; }
    if (error.message && typeof error.message === "string") { return error.message; }
    if (typeof error === "string") { return error; }
    try {
      var text = JSON.stringify(error);
      if (text && text !== "{}") { return text; }
    } catch (_e) {}
    return String(error);
  }

  // --- Script-based direct field value update (primary approach) ---
  //
  // Qlik Sense Engine API allows updating the in-memory data model for the
  // current session without touching QVD files on disk:
  //   1. app.model.getScript()  - read the current load script
  //   2. Append MAPPING LOAD INLINE + INNER JOIN / ApplyMap statements
  //   3. Comment out STORE statements so QVDs are NOT written
  //   4. app.model.setScript(modifiedScript)
  //   5. app.model.doReload(0, false, false) - reload WITHOUT doSave()
  // All visualisations then automatically reflect the decrypted values.
  // Calling doSave() is intentionally omitted so the change is session-only.

  function escapeQlikInlineVal(value) {
    var text = String(value == null ? "" : value);
    if (text.indexOf(",") >= 0 || text.indexOf('"') >= 0 ||
        text.indexOf("\n") >= 0 || text.indexOf("\r") >= 0) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function sanitizeMapName(name) {
    return "GdprDecrypt_Map_" + String(name || "").replace(/[^A-Za-z0-9]/g, "_");
  }

  function suppressStoreStatements(script) {
    var lines = script.split("\n");
    var result = [];
    var inStore = false;
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!inStore && /^STORE\b/i.test(trimmed)) { inStore = true; }
      if (inStore) {
        result.push("// [GdprDecrypt suppressed STORE] " + line);
        if (trimmed.charAt(trimmed.length - 1) === ";") { inStore = false; }
      } else {
        result.push(line);
      }
    });
    return result.join("\n");
  }

  async function getTablesForColumns(app, idField, columns) {
    var tableNames = [];
    var engineModel = getEngineModel(app);
    if (!engineModel) { return tableNames; }
    var normalizedId = normalizeFieldName(idField);
    var normalizedCols = columns.map(normalizeFieldName);
    try {
      if (typeof engineModel.getTablesAndKeys === "function") {
        var tablesResult = await engineModel.getTablesAndKeys(
          { qcx: 0, qcy: 0, qcz: 0, qcw: 0, qch: 0 },
          { qcx: 0, qcy: 0, qcz: 0, qcw: 0, qch: 0 },
          0, false, false
        );
        var tables = (tablesResult && tablesResult.qtr) || [];
        tables.forEach(function (table) {
          if (!table.qName) { return; }
          var fieldNames = (table.qFields || []).map(function (f) {
            return normalizeFieldName(f.qName);
          });
          var hasId = fieldNames.indexOf(normalizedId) >= 0;
          var hasCol = normalizedCols.some(function (col) {
            return fieldNames.indexOf(col) >= 0;
          });
          if (hasId && hasCol) { tableNames.push(table.qName); }
        });
      }
    } catch (_tablesError) {}
    return tableNames;
  }

  function buildDecryptScriptAppendix(idField, columns, decryptedRows, tableNames) {
    var lines = [];
    var idRef = fieldRef(idField);
    var columnsWithData = [];
    lines.push("");
    lines.push("// === GdprDecrypt: session decrypt overlay (QVDs not modified) ===");
    columns.forEach(function (columnName) {
      var mapName = sanitizeMapName(columnName);
      var pairs = [];
      decryptedRows.forEach(function (row) {
        var idValue = row[idField];
        var decValue = row[columnName];
        if (idValue !== undefined && idValue !== null && String(idValue).trim() !== "" &&
            decValue !== undefined && decValue !== null && String(decValue).trim() !== "") {
          pairs.push(escapeQlikInlineVal(String(idValue)) + "," + escapeQlikInlineVal(String(decValue)));
        }
      });
      if (!pairs.length) { return; }
      columnsWithData.push(columnName);
      lines.push("");
      lines.push(mapName + ":");
      lines.push("MAPPING LOAD * INLINE [");
      lines.push("key, value");
      pairs.forEach(function (pair) { lines.push(pair); });
      lines.push("];");
    });
    if (!columnsWithData.length) { return null; }
    tableNames.forEach(function (tableName) {
      var quotedTable = "[" + tableName.replace(/\\/g, "\\\\").replace(/\]/g, "\\]") + "]";
      var applyExprs = columnsWithData.map(function (columnName) {
        var mapName = sanitizeMapName(columnName);
        return "  ApplyMap('" + mapName + "', Text(" + idRef + "), " +
          fieldRef(columnName) + ") AS " + fieldRef(columnName);
      });
      lines.push("");
      lines.push("INNER JOIN (" + quotedTable + ")");
      lines.push("LOAD");
      lines.push("  " + idRef + ",");
      lines.push(applyExprs.join(",\n"));
      lines.push("RESIDENT " + quotedTable + ";");
    });
    lines.push("");
    lines.push("// === End GdprDecrypt session decrypt overlay ===");
    return lines.join("\n");
  }

  async function applyDecryptViaScript(app, idField, columns, decryptedRows, onProgress) {
    var engineModel = getEngineModel(app);
    onProgress("Discovering data model tables...");
    var tableNames = await getTablesForColumns(app, idField, columns);
    if (!tableNames.length) {
      throw new Error(
        "No Qlik table found containing both \"" + idField + "\" and columns [" +
        columns.join(", ") + "]. Verify the fields exist in the loaded data model."
      );
    }
    onProgress("Reading current load script...");
    var originalScript;
    if (typeof engineModel.getScript === "function") {
      originalScript = await engineModel.getScript();
    } else {
      throw new Error("getScript() not available in this Qlik context.");
    }
    onProgress("Building session script appendix...");
    var appendix = buildDecryptScriptAppendix(idField, columns, decryptedRows, tableNames);
    if (!appendix) {
      throw new Error("No decrypted values to embed in the session script.");
    }
    var safeScript = suppressStoreStatements(originalScript);
    var sessionScript = safeScript + "\n" + appendix;
    onProgress("Setting session load script...");
    if (typeof engineModel.setScript === "function") {
      await engineModel.setScript(sessionScript);
    } else {
      throw new Error("setScript() not available in this Qlik context.");
    }
    onProgress("Reloading data model (session only - QVDs unchanged)...");
    var reloaded = false;
    try {
      if (typeof engineModel.doReload === "function") {
        reloaded = await engineModel.doReload(0, false, false);
      } else {
        throw new Error("doReload() not available in this Qlik context.");
      }
    } catch (reloadError) {
      try { await engineModel.setScript(originalScript); } catch (_) {}
      throw reloadError;
    }
    if (!reloaded) {
      try { await engineModel.setScript(originalScript); } catch (_) {}
      throw new Error("doReload() returned false. Check Qlik server logs for script errors.");
    }
    return { originalScript: originalScript, tableNames: tableNames };
  }

  async function resetViaScript(app, originalScript, onProgress) {
    var engineModel = getEngineModel(app);
    onProgress("Restoring original load script...");
    if (typeof engineModel.setScript === "function") {
      await engineModel.setScript(originalScript);
    } else {
      throw new Error("setScript() not available in this Qlik context.");
    }
    onProgress("Reloading with original script...");
    if (typeof engineModel.doReload === "function") {
      await engineModel.doReload(0, false, false);
    }
  }

  // --- Engine object helpers ---

  async function getEngineObjectSafe(app, objectId) {
    var engineModel = getEngineModel(app);
    if (engineModel && typeof engineModel.getObject === "function") {
      return engineModel.getObject(objectId);
    }
    return null;
  }

  async function getObjectPropertiesSafe(app, objectId) {
    var engineObject = await getEngineObjectSafe(app, objectId);
    if (engineObject && typeof engineObject.getProperties === "function") {
      return unwrapPropertiesEnvelope(await engineObject.getProperties());
    }
    if (app && typeof app.getObjectProperties === "function") {
      return unwrapPropertiesEnvelope(await app.getObjectProperties(objectId));
    }
    throw new Error("Unable to read properties for object " + objectId + ".");
  }

  async function setObjectPropertiesSafe(app, objectId, props) {
    var normalizedProps = unwrapPropertiesEnvelope(props);
    var engineObject = await getEngineObjectSafe(app, objectId);
    if (engineObject && typeof engineObject.setProperties === "function") {
      return engineObject.setProperties(normalizedProps);
    }
    if (app && typeof app.setObjectProperties === "function") {
      return app.setObjectProperties(objectId, normalizedProps);
    }
    throw new Error("Unable to set properties for object " + objectId + ".");
  }

  async function isPatchedObjectLayoutValid(app, objectId) {
    var engineModel = getEngineModel(app);
    if (!engineModel || typeof engineModel.getObject !== "function") { return true; }
    try {
      var obj = await engineModel.getObject(objectId);
      if (obj && typeof obj.getLayout === "function") { await obj.getLayout(); }
      return true;
    } catch (_e) { return false; }
  }

  // --- Data extraction from current selections ---

  async function fetchRowsFromCurrentSelections(app, idField, columns, onProgress) {
    var fields = [idField].concat(columns);
    var dimensionDefs = fields.map(function (fieldName) {
      return { qDef: { qFieldDefs: [fieldRef(fieldName)] } };
    });
    var engineModel = getEngineModel(app);
    if (!engineModel || typeof engineModel.createSessionObject !== "function") {
      throw new Error("Unable to create engine session object in this Qlik context.");
    }
    var sessionObj = await engineModel.createSessionObject({
      qInfo: { qType: "GdprDecrypt-session" },
      qHyperCubeDef: {
        qDimensions: dimensionDefs,
        qMeasures: [],
        qInitialDataFetch: [{ qTop: 0, qLeft: 0, qHeight: Math.min(INTERNAL_PAGE_SIZE, 10000), qWidth: fields.length }]
      }
    });
    try {
      var layout = await sessionObj.getLayout();
      var totalRows = layout.qHyperCube.qSize.qcy;
      var takeRows = Math.min(totalRows, INTERNAL_MAX_ROWS);
      var rows = [];
      for (var top = 0; top < takeRows; top += INTERNAL_PAGE_SIZE) {
        var height = Math.min(INTERNAL_PAGE_SIZE, takeRows - top);
        var pages;
        try {
          pages = await sessionObj.getHyperCubeData("/qHyperCubeDef",
            [{ qTop: top, qLeft: 0, qHeight: height, qWidth: fields.length }]);
        } catch (_pathError) {
          pages = await sessionObj.getHyperCubeData("/qHyperCube",
            [{ qTop: top, qLeft: 0, qHeight: height, qWidth: fields.length }]);
        }
        var matrix = (pages[0] && pages[0].qMatrix) || [];
        matrix.forEach(function (cells) {
          var row = {};
          for (var idx = 0; idx < fields.length; idx += 1) {
            var cell = cells[idx] || {};
            var value = cell.qText;
            if ((value === undefined || value === null || value === "") && Number.isFinite(cell.qNum)) {
              value = String(cell.qNum);
            }
            row[fields[idx]] = value;
          }
          var idValue = row[idField];
          if (idValue === undefined || idValue === null || String(idValue).trim() === "") { return; }
          rows.push(row);
        });
        if (onProgress) {
          onProgress("Extracted " + Math.min(top + height, takeRows) + " / " + takeRows + " rows...");
        }
      }
      return { rows: rows, totalRows: totalRows, capped: totalRows > takeRows };
    } finally {
      if (sessionObj && sessionObj.id) {
        try {
          if (typeof engineModel.destroySessionObject === "function") {
            await engineModel.destroySessionObject(sessionObj.id);
          } else if (typeof sessionObj.destroy === "function") {
            await sessionObj.destroy();
          }
        } catch (_destroyError) {}
      }
    }
  }

  // --- Decrypt API call ---

  async function callDecryptPost(apiUrl, payload) {
    var timeout = createTimeoutController(INTERNAL_TIMEOUT_SECONDS);
    try {
      var response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: timeout.signal
      });
      var responseText = await response.text();
      var responseJson = null;
      if (responseText) {
        try { responseJson = JSON.parse(responseText); } catch (_e) {}
      }
      if (!response.ok) {
        var detail = responseJson && responseJson.detail ? responseJson.detail : responseText;
        throw new Error("Decrypt API failed: " + (detail || ("HTTP " + response.status)));
      }
      if (!Array.isArray(responseJson)) {
        throw new Error(
          "Decrypt API response must be a JSON array. Got: " +
          (responseText ? responseText.slice(0, 250) : "<empty>")
        );
      }
      return responseJson;
    } catch (error) {
      if (error && error.name === "AbortError") { throw new Error("Decrypt API request timed out."); }
      if (error instanceof TypeError) {
        throw new Error(
          "Network/CORS error calling decrypt API (" +
          (error && error.message ? error.message : "fetch failed") + "). URL: " + apiUrl
        );
      }
      throw error;
    } finally {
      timeout.clear();
    }
  }

  // --- Chart expression patching (fallback when script approach is unavailable) ---

  function buildExpressionByColumn(idField, columns, decryptedRows) {
    var pickExprByColumn = {};
    var variantToColumnKey = {};
    var skippedColumns = [];
    var idRef = fieldRef(idField);
    columns.forEach(function (columnName) {
      var columnKey = normalizeFieldName(columnName);
      var ids = [];
      var values = [];
      decryptedRows.forEach(function (row) {
        var idValue = row[idField];
        var decryptedValue = row[columnName];
        if (idValue === undefined || idValue === null || String(idValue).trim() === "") { return; }
        if (decryptedValue === undefined || decryptedValue === null || String(decryptedValue).trim() === "") { return; }
        ids.push(String(idValue));
        values.push(String(decryptedValue));
      });
      if (!ids.length) { skippedColumns.push(columnName + " (no decrypted values)"); return; }
      var matchExpr = "Match(Text(" + idRef + ")," + ids.map(qlikStringLiteral).join(",") + ")";
      var pickExpr = "Pick(" + matchExpr + "," + values.map(qlikStringLiteral).join(",") + ")";
      var probe = "=Alt(" + pickExpr + "," + fieldRef(columnName) + ")";
      if (probe.length > INTERNAL_MAX_EXPRESSION_LENGTH) {
        skippedColumns.push(columnName + " (expression too large for chart patching)");
        return;
      }
      pickExprByColumn[columnKey] = pickExpr;
      fieldNameVariants(columnName).forEach(function (variant) {
        if (!variantToColumnKey[variant]) { variantToColumnKey[variant] = columnKey; }
      });
    });
    return { pickExprByColumn: pickExprByColumn, variantToColumnKey: variantToColumnKey, skippedColumns: skippedColumns };
  }

  function patchObjectProperties(props, pickExprByColumn, variantToColumnKey) {
    var changed = false;
    function extractFieldFromSimpleWrapper(expression) {
      if (typeof expression !== "string") { return null; }
      var text = expression.trim();
      if (!text) { return null; }
      if (text.charAt(0) === "=") { text = text.slice(1).trim(); }
      var wrappedMatch = text.match(/^(Only|Text|Upper|Lower|Trim|Num)\s*\((.*)\)$/i);
      if (!wrappedMatch) { return null; }
      var inner = wrappedMatch[2] || "";
      if (/^num$/i.test(wrappedMatch[1])) { inner = inner.split(",")[0] || ""; }
      return tryExtractBareField(inner.trim());
    }
    function patchExpression(expression) {
      if (typeof expression !== "string") { return expression; }
      var candidateField = tryExtractBareField(expression) || extractFieldFromSimpleWrapper(expression);
      var columnKey = "";
      if (candidateField) {
        var fieldVariants = fieldNameVariants(candidateField);
        for (var vi = 0; vi < fieldVariants.length; vi += 1) {
          var dk = variantToColumnKey[fieldVariants[vi]];
          if (dk) { columnKey = dk; break; }
        }
      }
      if (!columnKey) {
        var matches = expression.match(/\[[^\]]+\]/g) || [];
        for (var mi = 0; mi < matches.length; mi += 1) {
          var bv = fieldNameVariants(matches[mi]);
          for (var bi = 0; bi < bv.length; bi += 1) {
            var bk = variantToColumnKey[bv[bi]];
            if (bk) { columnKey = bk; break; }
          }
          if (columnKey) { break; }
        }
      }
      var pickExpr = columnKey ? pickExprByColumn[columnKey] : "";
      if (!pickExpr) { return expression; }
      changed = true;
      return "=Alt(" + pickExpr + "," + stripLeadingEquals(expression) + ")";
    }
    function patchHyperCubeDef(hcd) {
      if (!hcd || typeof hcd !== "object") { return; }
      if (Array.isArray(hcd.qDimensions)) {
        for (var di = 0; di < hcd.qDimensions.length; di += 1) {
          var dim = hcd.qDimensions[di];
          if (!dim || !dim.qDef || !Array.isArray(dim.qDef.qFieldDefs)) { continue; }
          for (var fi = 0; fi < dim.qDef.qFieldDefs.length; fi += 1) {
            dim.qDef.qFieldDefs[fi] = patchExpression(dim.qDef.qFieldDefs[fi]);
          }
        }
      }
      if (Array.isArray(hcd.qMeasures)) {
        for (var mi2 = 0; mi2 < hcd.qMeasures.length; mi2 += 1) {
          var meas = hcd.qMeasures[mi2];
          if (!meas || !meas.qDef || typeof meas.qDef.qDef !== "string") { continue; }
          meas.qDef.qDef = patchExpression(meas.qDef.qDef);
        }
      }
    }
    function patchListObjectDef(lod) {
      if (!lod || !lod.qDef || !Array.isArray(lod.qDef.qFieldDefs)) { return; }
      for (var idx = 0; idx < lod.qDef.qFieldDefs.length; idx += 1) {
        lod.qDef.qFieldDefs[idx] = patchExpression(lod.qDef.qFieldDefs[idx]);
      }
    }
    patchHyperCubeDef(props && props.qHyperCubeDef);
    patchListObjectDef(props && props.qListObjectDef);
    return { changed: changed, props: props };
  }

  function getVisibleObjectIds(currentObjectId) {
    var ids = {};
    ["[data-qvid]", "[data-qid]", "[data-object-id]"].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        var id = node.getAttribute("data-qvid") || node.getAttribute("data-qid") || node.getAttribute("data-object-id");
        if (!id || id === currentObjectId || /CurrentSelections/i.test(id)) { return; }
        ids[id] = true;
      });
    });
    return Object.keys(ids);
  }

  async function applyPatchesToVisibleObjects(app, objectIds, pickExprByColumn, variantToColumnKey, state, onProgress) {
    var changedObjects = 0;
    var skippedObjects = [];
    var failedObjects = [];
    for (var idx = 0; idx < objectIds.length; idx += 1) {
      var objectId = objectIds[idx];
      if (onProgress) { onProgress("Patching chart objects " + (idx + 1) + " / " + objectIds.length + "..."); }
      try {
        var originalProps = await getObjectPropertiesSafe(app, objectId);
        var nextProps = deepClone(originalProps);
        var patchResult = patchObjectProperties(nextProps, pickExprByColumn, variantToColumnKey);
        if (!patchResult.changed) { skippedObjects.push(objectId); continue; }
        if (!state.originalPropsByObjectId[objectId]) {
          state.originalPropsByObjectId[objectId] = deepClone(originalProps);
        }
        await setObjectPropertiesSafe(app, objectId, patchResult.props);
        var valid = await isPatchedObjectLayoutValid(app, objectId);
        if (!valid) {
          try {
            await setObjectPropertiesSafe(app, objectId, originalProps);
            failedObjects.push(objectId + " (patch invalid; rolled back)");
          } catch (re) {
            failedObjects.push(objectId + " (patch invalid, rollback failed: " + formatError(re) + ")");
          }
          continue;
        }
        changedObjects += 1;
      } catch (error) {
        failedObjects.push(objectId + " (" + formatError(error) + ")");
      }
    }
    return { changedObjects: changedObjects, skippedObjects: skippedObjects, failedObjects: failedObjects };
  }

  async function restoreOriginalObjects(app, state, onProgress) {
    var objectIds = Object.keys(state.originalPropsByObjectId);
    if (!objectIds.length) { return { restored: 0, failed: [] }; }
    var restored = 0;
    var failed = [];
    for (var idx = 0; idx < objectIds.length; idx += 1) {
      var objectId = objectIds[idx];
      if (onProgress) { onProgress("Restoring objects " + (idx + 1) + " / " + objectIds.length + "..."); }
      try {
        await setObjectPropertiesSafe(app, objectId, state.originalPropsByObjectId[objectId]);
        restored += 1;
        delete state.originalPropsByObjectId[objectId];
      } catch (error) {
        failed.push(objectId + " (" + (error.message || String(error)) + ")");
      }
    }
    return { restored: restored, failed: failed };
  }

  // --- UI helpers ---

  function buildDecryptedSample(decryptedRows, columns) {
    if (!Array.isArray(decryptedRows) || !decryptedRows.length) { return ""; }
    var firstRow = decryptedRows[0] || {};
    var sampleParts = [];
    if (firstRow.id !== undefined && firstRow.id !== null && String(firstRow.id).trim() !== "") {
      sampleParts.push("id=" + String(firstRow.id));
    }
    columns.slice(0, 3).forEach(function (columnName) {
      var value = firstRow[columnName];
      if (value === undefined || value === null || String(value).trim() === "") { return; }
      sampleParts.push(columnName + "=" + String(value).slice(0, 60));
    });
    return sampleParts.length ? "Sample: " + sampleParts.join(" | ") : "";
  }

  function renderPreviewTable(rows, columns) {
    var limitedRows = Array.isArray(rows) ? rows.slice(0, 20) : [];
    if (!limitedRows.length) { return '<div class="gdpr-empty">No decrypted rows to preview.</div>'; }
    var keys = ["id"];
    columns.forEach(function (c) { if (keys.indexOf(c) === -1) { keys.push(c); } });
    var headerHtml = keys.map(function (k) { return "<th>" + escapeHtml(k) + "</th>"; }).join("");
    var bodyHtml = limitedRows.map(function (row) {
      return "<tr>" + keys.map(function (k) {
        var v = row[k];
        return "<td>" + escapeHtml(v === undefined || v === null ? "" : v) + "</td>";
      }).join("") + "</tr>";
    }).join("");
    return '<div class="gdpr-table-wrap">' +
      '<div class="gdpr-table-note">Previewing ' + limitedRows.length + " row" + (limitedRows.length === 1 ? "" : "s") + ".</div>" +
      '<div class="gdpr-table-scroll"><table class="gdpr-table">' +
      "<thead><tr>" + headerHtml + "</tr></thead>" +
      "<tbody>" + bodyHtml + "</tbody>" +
      "</table></div></div>";
  }

  function render($element, layout, state) {
    var toneClass = state.tone === "warn" ? "gdpr-status-warn" : state.tone === "error" ? "gdpr-status-error" : "";
    var props = layout.props || {};
    var apiUrl = String(props.apiUrl || DEFAULT_API_URL);
    var idField = String(props.idField || DEFAULT_ID_FIELD);
    var columns = parseColumns(props.encryptedColumns || DEFAULT_ENCRYPTED_COLUMNS);
    var previewRows = Array.isArray(state.previewRows) ? state.previewRows : [];
    var modeLabel = state.usedScriptApproach
      ? "Method: direct field update (setScript + doReload, QVDs unchanged)"
      : "Method: chart expression patching (fallback)";
    var summary = ["API: " + apiUrl, "ID field: " + idField, "Columns: " + (columns.length ? columns.join(", ") : "<none>")].join(" | ");
    $element.html(
      '<div class="gdpr-wrap">' +
        '<h3 class="gdpr-title">GdprDecrypt</h3>' +
        '<p class="gdpr-subtitle">Decrypt selected rows. Updates loaded field values in-session without modifying QVDs.</p>' +
        '<div class="gdpr-actions">' +
          '<button class="gdpr-btn gdpr-btn-decrypt" ' + (state.busy ? "disabled" : "") + ">Decrypt</button>" +
          '<button class="gdpr-btn gdpr-btn-secondary gdpr-btn-reset" ' + (state.busy ? "disabled" : "") + ">Reset</button>" +
        "</div>" +
        '<div class="gdpr-status ' + toneClass + '">' +
          escapeHtml(state.message || "") +
          (state.progress ? "\n" + escapeHtml(state.progress) : "") +
          (state.stats ? "\n" + escapeHtml(state.stats) : "") +
          (previewRows.length ? "\n" + escapeHtml(modeLabel) : "") +
        "</div>" +
        '<div class="gdpr-preview"><h4 class="gdpr-preview-title">Decrypted Data</h4>' +
          renderPreviewTable(previewRows, columns) +
        "</div>" +
        '<div class="gdpr-meta">' + escapeHtml(summary) + "</div>" +
      "</div>"
    );
  }

  function withBusy(state, value) {
    state.busy = value;
    if (!value) { state.progress = ""; }
  }

  // --- Main actions ---

  async function runDecrypt(self, layout, $element) {
    var state = getState(layout.qInfo.qId);
    var app = qlik.currApp(self);
    var props = layout.props || {};
    var apiUrl = String(props.apiUrl || DEFAULT_API_URL).trim();
    var idField = String(props.idField || DEFAULT_ID_FIELD).trim();
    var columns = parseColumns(props.encryptedColumns || DEFAULT_ENCRYPTED_COLUMNS);
    if (!apiUrl || !idField || !columns.length) {
      state.tone = "error";
      state.message = "Configure API URL, ID field, and encrypted columns.";
      render($element, layout, state);
      return;
    }
    withBusy(state, true);
    state.tone = "info";
    state.message = "Starting decrypt run...";
    state.stats = "";
    state.previewRows = [];
    render($element, layout, state);
    try {
      if (state.usedScriptApproach && state.originalScript) {
        state.progress = "Restoring previous session script...";
        render($element, layout, state);
        try {
          await resetViaScript(app, state.originalScript, function (msg) { state.progress = msg; render($element, layout, state); });
        } catch (_e) {}
        state.originalScript = null;
        state.usedScriptApproach = false;
      } else if (Object.keys(state.originalPropsByObjectId).length) {
        state.progress = "Restoring previous chart expression patch...";
        render($element, layout, state);
        await restoreOriginalObjects(app, state, function (msg) { state.progress = msg; render($element, layout, state); });
      }
      var extraction = await fetchRowsFromCurrentSelections(app, idField, columns, function (msg) {
        state.progress = msg; render($element, layout, state);
      });
      if (!extraction.rows.length) {
        state.tone = "warn";
        state.message = "No rows found for configured fields in the current selection.";
        state.stats = "Try adjusting your selections or the configured field names.";
        return;
      }
      state.progress = "Calling decrypt API with " + extraction.rows.length + " row(s)...";
      render($element, layout, state);
      var payload = { id_column: idField, rows: extraction.rows };
      if (columns.length === 1) { payload.column = columns[0]; } else { payload.columns = columns; }
      var decryptedRows = await callDecryptPost(apiUrl, payload);
      state.previewRows = decryptedRows;
      var decryptedSample = buildDecryptedSample(decryptedRows, columns);
      var statParts = [];
      if (decryptedSample) { statParts.push(decryptedSample); }
      statParts.push("Rows sent: " + extraction.rows.length, "Rows decrypted: " + decryptedRows.length);
      if (extraction.capped) { statParts.push("Row cap reached (" + INTERNAL_MAX_ROWS + ")"); }

      // Primary: update loaded field values directly via script-based session reload
      var scriptError = null;
      try {
        state.progress = "Applying direct field value update via session script reload...";
        render($element, layout, state);
        var scriptResult = await applyDecryptViaScript(app, idField, columns, decryptedRows,
          function (msg) { state.progress = msg; render($element, layout, state); });
        state.originalScript = scriptResult.originalScript;
        state.usedScriptApproach = true;
        statParts.push("Tables updated: " + scriptResult.tableNames.join(", "));
        qlik.resize();
        $(window).trigger("resize");
        state.tone = "info";
        state.message = "Decrypt complete. Field values updated in memory (QVDs unchanged).";
        state.stats = statParts.join("\n");
        return;
      } catch (err) {
        scriptError = err;
        state.usedScriptApproach = false;
        state.originalScript = null;
      }

      // Fallback: patch chart object expressions
      state.progress = "Script approach unavailable (" + formatError(scriptError) + "). Falling back to chart expression patching...";
      render($element, layout, state);
      var expressionBuild = buildExpressionByColumn(idField, columns, decryptedRows);
      var pickExprByColumn = expressionBuild.pickExprByColumn;
      var variantToColumnKey = expressionBuild.variantToColumnKey;
      var skippedColumns = expressionBuild.skippedColumns;
      if (!Object.keys(pickExprByColumn).length) {
        state.tone = "warn";
        state.message = "No columns could be patched after decrypt.";
        state.stats = ["Script approach error: " + formatError(scriptError)]
          .concat(skippedColumns.length ? ["Skipped columns: " + skippedColumns.join(", ")] : []).join("\n");
        return;
      }
      var candidateObjectIds = getVisibleObjectIds(layout.qInfo.qId);
      if (!candidateObjectIds.length) {
        state.tone = "warn";
        state.message = "No chart objects found to patch (fallback).";
        state.stats = "Script approach error: " + formatError(scriptError);
        return;
      }
      var patchResults = await applyPatchesToVisibleObjects(app, candidateObjectIds, pickExprByColumn, variantToColumnKey, state,
        function (msg) { state.progress = msg; render($element, layout, state); });
      qlik.resize();
      $(window).trigger("resize");
      state.tone = patchResults.failedObjects.length ? "warn" : "info";
      state.message = "Decrypt complete (chart expression patching fallback).";
      statParts.push(
        "Objects scanned: " + candidateObjectIds.length,
        "Objects changed: " + patchResults.changedObjects,
        "Objects skipped: " + patchResults.skippedObjects.length,
        "Script approach error: " + formatError(scriptError)
      );
      if (skippedColumns.length) { statParts.push("Skipped columns: " + skippedColumns.join(", ")); }
      if (patchResults.failedObjects.length) { statParts.push("Failures: " + patchResults.failedObjects.slice(0, 5).join(" | ")); }
      state.stats = statParts.join("\n");
    } catch (error) {
      state.tone = "error";
      state.message = "Decrypt failed.";
      state.stats = formatError(error);
    } finally {
      withBusy(state, false);
      render($element, layout, state);
    }
  }

  async function runReset(self, layout, $element) {
    var state = getState(layout.qInfo.qId);
    var app = qlik.currApp(self);
    withBusy(state, true);
    state.tone = "info";
    state.message = "Resetting...";
    state.stats = "";
    render($element, layout, state);
    try {
      if (state.usedScriptApproach && state.originalScript) {
        await resetViaScript(app, state.originalScript, function (msg) { state.progress = msg; render($element, layout, state); });
        state.originalScript = null;
        state.usedScriptApproach = false;
        state.tone = "info";
        state.message = "Reset complete. Original field values restored via script reload.";
        state.stats = "Load script restored; QVDs were never modified.";
      } else if (Object.keys(state.originalPropsByObjectId).length) {
        var restoreResult = await restoreOriginalObjects(app, state, function (msg) { state.progress = msg; render($element, layout, state); });
        state.tone = restoreResult.failed.length ? "warn" : "info";
        state.message = "Reset complete. Chart expressions restored.";
        state.stats = "Restored: " + restoreResult.restored + "\nFailed: " + restoreResult.failed.length +
          (restoreResult.failed.length ? "\nFailures: " + restoreResult.failed.slice(0, 5).join(" | ") : "");
      } else {
        state.tone = "info";
        state.message = "Nothing to reset.";
        state.stats = "";
      }
      qlik.resize();
      $(window).trigger("resize");
      state.previewRows = [];
    } catch (error) {
      state.tone = "error";
      state.message = "Reset failed.";
      state.stats = formatError(error);
      state.previewRows = [];
    } finally {
      withBusy(state, false);
      render($element, layout, state);
    }
  }

  // --- Extension definition ---

  return {
    initialProperties: {
      props: {
        apiUrl: DEFAULT_API_URL,
        idField: DEFAULT_ID_FIELD,
        encryptedColumns: DEFAULT_ENCRYPTED_COLUMNS
      }
    },
    definition: {
      type: "items",
      component: "accordion",
      items: {
        settings: {
          uses: "settings",
          items: {
            apiUrl: {
              type: "string",
              ref: "props.apiUrl",
              label: "POST API URL",
              defaultValue: DEFAULT_API_URL
            },
            idField: {
              type: "string",
              ref: "props.idField",
              label: "ID field",
              defaultValue: DEFAULT_ID_FIELD
            },
            encryptedColumns: {
              type: "string",
              ref: "props.encryptedColumns",
              label: "Encrypted columns (comma-separated)",
              defaultValue: DEFAULT_ENCRYPTED_COLUMNS
            }
          }
        }
      }
    },
    paint: function ($element, layout) {
      var self = this;
      var state = getState(layout.qInfo.qId);
      render($element, layout, state);
      $element.find(".gdpr-btn-decrypt").off("click").on("click", function () {
        runDecrypt(self, layout, $element);
      });
      $element.find(".gdpr-btn-reset").off("click").on("click", function () {
        runReset(self, layout, $element);
      });
      return Promise.resolve();
    }
  };
});

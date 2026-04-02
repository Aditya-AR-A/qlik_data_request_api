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
        originalPropsByObjectId: {}
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
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function createTimeoutController(timeoutSeconds) {
    var timeoutMs = Math.max(5, timeoutSeconds) * 1000;
    var controller = new AbortController();
    var timeoutHandle = setTimeout(function () {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      clear: function () {
        clearTimeout(timeoutHandle);
      }
    };
  }

  function fieldRef(name) {
    var trimmed = String(name || "").trim();
    if (!trimmed) {
      return "[]";
    }
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
    if (!normalized) {
      return "";
    }

    normalized = normalized.replace(/^\[|\]$/g, "");
    normalized = normalized.replace(/^"|"$/g, "");
    return normalized;
  }

  function fieldNameVariants(name) {
    var normalized = normalizeFieldName(name);
    if (!normalized) {
      return [];
    }

    var variants = {};
    variants[normalized] = true;

    if (normalized.indexOf(".") >= 0) {
      variants[normalized.split(".").pop()] = true;
    }

    return Object.keys(variants);
  }

  function stripLeadingEquals(expression) {
    if (typeof expression !== "string") {
      return expression;
    }

    var trimmed = expression.trim();
    if (trimmed.charAt(0) === "=") {
      return trimmed.slice(1).trim();
    }

    return trimmed;
  }

  function deepClone(value) {
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    return JSON.parse(
      JSON.stringify(value, function (_key, current) {
        if (typeof current === "function") {
          return undefined;
        }

        if (!current || typeof current !== "object") {
          return current;
        }

        if (!seen) {
          return current;
        }

        if (seen.has(current)) {
          return undefined;
        }

        seen.add(current);
        return current;
      })
    );
  }

  function tryExtractBareField(expression) {
    if (typeof expression !== "string") {
      return null;
    }

    var text = expression.trim();
    if (!text) {
      return null;
    }

    if (text.charAt(0) === "=") {
      text = text.slice(1).trim();
    }

    var bracketMatch = text.match(/^\[([^\]]+)\]$/);
    if (bracketMatch) {
      return bracketMatch[1].trim().toLowerCase();
    }

    if (/^[A-Za-z0-9_ .$-]+$/.test(text)) {
      return text.toLowerCase();
    }

    return null;
  }

  function getVisibleObjectIds(currentObjectId) {
    var ids = {};
    var selectors = ["[data-qvid]", "[data-qid]", "[data-object-id]"];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        var id = node.getAttribute("data-qvid") || node.getAttribute("data-qid") || node.getAttribute("data-object-id");
        if (!id || id === currentObjectId) {
          return;
        }
        if (/CurrentSelections/i.test(id)) {
          return;
        }
        ids[id] = true;
      });
    });

    return Object.keys(ids);
  }

  async function getObjectIdsFromEngine(app, currentObjectId) {
    var ids = {};
    var engineModel = getEngineModel(app);

    if (!engineModel) {
      return [];
    }

    var infos = [];
    try {
      if (typeof engineModel.getAllInfos === "function") {
        infos = await engineModel.getAllInfos();
      } else if (engineModel.enigmaModel && typeof engineModel.enigmaModel.getAllInfos === "function") {
        infos = await engineModel.enigmaModel.getAllInfos();
      }
    } catch (_infoError) {
      infos = [];
    }

    infos.forEach(function (info) {
      var id = info && info.qId;
      var type = info && info.qType ? String(info.qType).toLowerCase() : "";
      if (!id || id === currentObjectId) {
        return;
      }
      if (/currentselections/i.test(id)) {
        return;
      }
      if (type === "sheet" || type === "bookmark" || type === "story" || type === "app") {
        return;
      }
      ids[id] = true;
    });

    return Object.keys(ids);
  }

  function getCurrentSheetIdFromUrl() {
    var sources = [
      (window && window.location && window.location.pathname) || "",
      (window && window.location && window.location.hash) || "",
      (window && window.location && window.location.href) || ""
    ];

    for (var idx = 0; idx < sources.length; idx += 1) {
      var source = sources[idx];
      if (!source) {
        continue;
      }

      var match = source.match(/\/sheet\/([^\/?#]+)/i) || source.match(/sheet\/([^\/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }

    return "";
  }

  async function getObjectIdsFromCurrentSheet(app, currentObjectId) {
    var ids = {};
    var sheetId = getCurrentSheetIdFromUrl();

    if (!sheetId || sheetId === currentObjectId) {
      return [];
    }

    try {
      var sheetProps = await getObjectPropertiesSafe(app, sheetId);
      var cells = sheetProps && sheetProps.cells;

      if (!Array.isArray(cells)) {
        return [];
      }

      cells.forEach(function (cell) {
        var id = cell && (cell.name || cell.qId || (cell.qInfo && cell.qInfo.qId));
        if (!id || id === currentObjectId) {
          return;
        }
        if (/currentselections/i.test(id)) {
          return;
        }
        ids[id] = true;
      });
    } catch (_sheetError) {
      return [];
    }

    return Object.keys(ids);
  }

  async function getCandidateObjectIds(app, currentObjectId) {
    var ids = {};

    getVisibleObjectIds(currentObjectId).forEach(function (id) {
      ids[id] = true;
    });

    (await getObjectIdsFromCurrentSheet(app, currentObjectId)).forEach(function (id) {
      ids[id] = true;
    });

    if (!Object.keys(ids).length) {
      (await getObjectIdsFromEngine(app, currentObjectId)).forEach(function (id) {
        ids[id] = true;
      });
    }

    return Object.keys(ids);
  }

  function buildDecryptedSample(decryptedRows, columns) {
    if (!Array.isArray(decryptedRows) || !decryptedRows.length) {
      return "";
    }

    var firstRow = decryptedRows[0] || {};
    var sampleParts = [];

    if (firstRow.id !== undefined && firstRow.id !== null && String(firstRow.id).trim() !== "") {
      sampleParts.push("id=" + String(firstRow.id));
    }

    columns.slice(0, 3).forEach(function (columnName) {
      var value = firstRow[columnName];
      if (value === undefined || value === null || String(value).trim() === "") {
        return;
      }
      sampleParts.push(columnName + "=" + String(value).slice(0, 60));
    });

    return sampleParts.length ? "Sample decrypted row: " + sampleParts.join(" | ") : "";
  }

  function renderPreviewTable(rows, columns) {
    var limitedRows = Array.isArray(rows) ? rows.slice(0, 20) : [];
    if (!limitedRows.length) {
      return '<div class="gdpr-empty">No decrypted rows to preview.</div>';
    }

    var keys = ["id"];
    columns.forEach(function (columnName) {
      if (keys.indexOf(columnName) === -1) {
        keys.push(columnName);
      }
    });

    var headerHtml = keys
      .map(function (key) {
        return '<th>' + escapeHtml(key) + '</th>';
      })
      .join("");

    var bodyHtml = limitedRows
      .map(function (row) {
        return (
          '<tr>' +
          keys
            .map(function (key) {
              var value = row[key];
              return '<td>' + escapeHtml(value === undefined || value === null ? "" : value) + '</td>';
            })
            .join("") +
          '</tr>'
        );
      })
      .join("");

    return (
      '<div class="gdpr-table-wrap">' +
        '<div class="gdpr-table-note">Previewing ' + limitedRows.length + ' row' + (limitedRows.length === 1 ? '' : 's') + '.</div>' +
        '<div class="gdpr-table-scroll">' +
          '<table class="gdpr-table">' +
            '<thead><tr>' + headerHtml + '</tr></thead>' +
            '<tbody>' + bodyHtml + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>'
    );
  }

  function getEngineModel(app) {
    if (app && app.model) {
      return app.model;
    }
    return app;
  }

  async function getObjectPropertiesSafe(app, objectId) {
    if (app && typeof app.getObjectProperties === "function") {
      return app.getObjectProperties(objectId);
    }

    var engineModel = getEngineModel(app);
    if (engineModel && typeof engineModel.getObject === "function") {
      var obj = await engineModel.getObject(objectId);
      if (obj && typeof obj.getProperties === "function") {
        return obj.getProperties();
      }
    }

    throw new Error("Unable to read properties for object " + objectId + ".");
  }

  async function setObjectPropertiesSafe(app, objectId, props) {
    if (app && typeof app.setObjectProperties === "function") {
      return app.setObjectProperties(objectId, props);
    }

    var engineModel = getEngineModel(app);
    if (engineModel && typeof engineModel.getObject === "function") {
      var obj = await engineModel.getObject(objectId);
      if (obj && typeof obj.setProperties === "function") {
        return obj.setProperties(props);
      }
    }

    throw new Error("Unable to set properties for object " + objectId + ".");
  }

  async function fetchRowsFromCurrentSelections(app, idField, columns, onProgress) {
    var fields = [idField].concat(columns);
    var dimensionDefs = fields.map(function (fieldName) {
      return {
        qDef: {
          qFieldDefs: [fieldRef(fieldName)]
        }
      };
    });

    var engineModel = getEngineModel(app);
    if (!engineModel || typeof engineModel.createSessionObject !== "function") {
      throw new Error("Unable to create engine session object in this Qlik context.");
    }

    var sessionObj = await engineModel.createSessionObject({
      qInfo: {
        qType: "GdprDecrypt-session"
      },
      qHyperCubeDef: {
        qDimensions: dimensionDefs,
        qMeasures: [],
        qInitialDataFetch: [
          {
            qTop: 0,
            qLeft: 0,
            qHeight: Math.min(INTERNAL_PAGE_SIZE, 10000),
            qWidth: fields.length
          }
        ]
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
          pages = await sessionObj.getHyperCubeData("/qHyperCubeDef", [
            {
              qTop: top,
              qLeft: 0,
              qHeight: height,
              qWidth: fields.length
            }
          ]);
        } catch (_pathError) {
          pages = await sessionObj.getHyperCubeData("/qHyperCube", [
            {
              qTop: top,
              qLeft: 0,
              qHeight: height,
              qWidth: fields.length
            }
          ]);
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
          if (idValue === undefined || idValue === null || String(idValue).trim() === "") {
            return;
          }

          rows.push(row);
        });

        if (onProgress) {
          onProgress("Extracted " + Math.min(top + height, takeRows) + " / " + takeRows + " rows...");
        }
      }

      return {
        rows: rows,
        totalRows: totalRows,
        capped: totalRows > takeRows
      };
    } finally {
      if (sessionObj && sessionObj.id) {
        try {
          if (typeof engineModel.destroySessionObject === "function") {
            await engineModel.destroySessionObject(sessionObj.id);
          } else if (typeof sessionObj.destroy === "function") {
            await sessionObj.destroy();
          }
        } catch (_destroyError) {
        }
      }
    }
  }

  async function callDecryptPost(apiUrl, payload) {
    var timeout = createTimeoutController(INTERNAL_TIMEOUT_SECONDS);

    try {
      var response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: timeout.signal
      });

      var responseText = await response.text();
      var responseJson = null;

      if (responseText) {
        try {
          responseJson = JSON.parse(responseText);
        } catch (_parseError) {
          responseJson = null;
        }
      }

      if (!response.ok) {
        var detail = responseJson && responseJson.detail ? responseJson.detail : responseText;
        throw new Error("Decrypt API failed: " + (detail || ("HTTP " + response.status)));
      }

      if (!Array.isArray(responseJson)) {
        throw new Error(
          "Decrypt API response must be a JSON array. Response: " +
            (responseText ? responseText.slice(0, 250) : "<empty>")
        );
      }

      return responseJson;
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("Decrypt API request timed out.");
      }

      if (error instanceof TypeError) {
        throw new Error(
          "Network/CORS error while calling decrypt API (" +
            (error && error.message ? error.message : "fetch failed") +
            "). URL: " +
            apiUrl
        );
      }

      throw error;
    } finally {
      timeout.clear();
    }
  }

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

        if (idValue === undefined || idValue === null || String(idValue).trim() === "") {
          return;
        }

        if (decryptedValue === undefined || decryptedValue === null || String(decryptedValue).trim() === "") {
          return;
        }

        ids.push(String(idValue));
        values.push(String(decryptedValue));
      });

      if (!ids.length) {
        skippedColumns.push(columnName + " (no decrypted values)");
        return;
      }

      var matchExpr = "Match(Text(" + idRef + ")," + ids.map(qlikStringLiteral).join(",") + ")";
      var pickExpr = "Pick(" + matchExpr + "," + values.map(qlikStringLiteral).join(",") + ")";
      var expressionLengthProbe = "=Alt(" + pickExpr + "," + fieldRef(columnName) + ")";

      if (expressionLengthProbe.length > INTERNAL_MAX_EXPRESSION_LENGTH) {
        skippedColumns.push(columnName + " (expression too large)");
        return;
      }

      pickExprByColumn[columnKey] = pickExpr;

      fieldNameVariants(columnName).forEach(function (variant) {
        if (!variantToColumnKey[variant]) {
          variantToColumnKey[variant] = columnKey;
        }
      });
    });

    return {
      pickExprByColumn: pickExprByColumn,
      variantToColumnKey: variantToColumnKey,
      skippedColumns: skippedColumns
    };
  }

  function patchObjectProperties(props, pickExprByColumn, variantToColumnKey) {
    var changed = false;

    function extractFieldFromSimpleWrapper(expression) {
      if (typeof expression !== "string") {
        return null;
      }

      var text = expression.trim();
      if (!text) {
        return null;
      }
      if (text.charAt(0) === "=") {
        text = text.slice(1).trim();
      }

      var wrappedMatch = text.match(/^(Only|Text|Upper|Lower|Trim|Num)\s*\((.*)\)$/i);
      if (!wrappedMatch) {
        return null;
      }

      var inner = wrappedMatch[2] || "";
      if (/^num$/i.test(wrappedMatch[1])) {
        inner = inner.split(",")[0] || "";
      }

      return tryExtractBareField(inner.trim());
    }

    function patchExpression(expression) {
      if (typeof expression !== "string") {
        return expression;
      }

      var candidateField = tryExtractBareField(expression);
      if (!candidateField) {
        candidateField = extractFieldFromSimpleWrapper(expression);
      }

      var columnKey = "";
      if (candidateField) {
        var fieldVariants = fieldNameVariants(candidateField);
        for (var variantIdx = 0; variantIdx < fieldVariants.length; variantIdx += 1) {
          var directKey = variantToColumnKey[fieldVariants[variantIdx]];
          if (directKey) {
            columnKey = directKey;
            break;
          }
        }
      }

      // Fallback: detect bracketed field references inside broader expressions.
      if (!columnKey) {
        var matches = expression.match(/\[[^\]]+\]/g) || [];
        for (var matchIdx = 0; matchIdx < matches.length; matchIdx += 1) {
          var bracketVariants = fieldNameVariants(matches[matchIdx]);
          for (var bracketIdx = 0; bracketIdx < bracketVariants.length; bracketIdx += 1) {
            var bracketKey = variantToColumnKey[bracketVariants[bracketIdx]];
            if (bracketKey) {
              columnKey = bracketKey;
              break;
            }
          }
          if (columnKey) {
            break;
          }
        }
      }

      var pickExpr = columnKey ? pickExprByColumn[columnKey] : "";
      if (!pickExpr) {
        return expression;
      }

      changed = true;
      return "=Alt(" + pickExpr + "," + stripLeadingEquals(expression) + ")";
    }

    function patchHyperCubeDef(hyperCubeDef) {
      if (!hyperCubeDef || typeof hyperCubeDef !== "object") {
        return;
      }

      if (Array.isArray(hyperCubeDef.qDimensions)) {
        for (var dimIdx = 0; dimIdx < hyperCubeDef.qDimensions.length; dimIdx += 1) {
          var dim = hyperCubeDef.qDimensions[dimIdx];
          if (!dim || !dim.qDef || !Array.isArray(dim.qDef.qFieldDefs)) {
            continue;
          }
          for (var fieldIdx = 0; fieldIdx < dim.qDef.qFieldDefs.length; fieldIdx += 1) {
            dim.qDef.qFieldDefs[fieldIdx] = patchExpression(dim.qDef.qFieldDefs[fieldIdx]);
          }
        }
      }

      if (Array.isArray(hyperCubeDef.qMeasures)) {
        for (var measureIdx = 0; measureIdx < hyperCubeDef.qMeasures.length; measureIdx += 1) {
          var measure = hyperCubeDef.qMeasures[measureIdx];
          if (!measure || !measure.qDef || typeof measure.qDef.qDef !== "string") {
            continue;
          }
          measure.qDef.qDef = patchExpression(measure.qDef.qDef);
        }
      }
    }

    function patchListObjectDef(listObjectDef) {
      if (!listObjectDef || !listObjectDef.qDef || !Array.isArray(listObjectDef.qDef.qFieldDefs)) {
        return;
      }

      for (var idx = 0; idx < listObjectDef.qDef.qFieldDefs.length; idx += 1) {
        listObjectDef.qDef.qFieldDefs[idx] = patchExpression(listObjectDef.qDef.qFieldDefs[idx]);
      }
    }

    // Keep patching narrow to avoid corrupting extension-specific nested structures.
    patchHyperCubeDef(props && props.qHyperCubeDef);
    patchListObjectDef(props && props.qListObjectDef);

    return {
      changed: changed,
      props: props
    };
  }

  async function applyPatchesToVisibleObjects(app, objectIds, pickExprByColumn, variantToColumnKey, state, onProgress) {
    var changedObjects = 0;
    var skippedObjects = [];
    var failedObjects = [];

    for (var idx = 0; idx < objectIds.length; idx += 1) {
      var objectId = objectIds[idx];

      if (onProgress) {
        onProgress("Patching objects " + (idx + 1) + " / " + objectIds.length + "...");
      }

      try {
        var originalProps = await getObjectPropertiesSafe(app, objectId);
        var nextProps = deepClone(originalProps);
        var patchResult = patchObjectProperties(nextProps, pickExprByColumn, variantToColumnKey);

        if (!patchResult.changed) {
          skippedObjects.push(objectId);
          continue;
        }

        if (!state.originalPropsByObjectId[objectId]) {
          state.originalPropsByObjectId[objectId] = deepClone(originalProps);
        }

        await setObjectPropertiesSafe(app, objectId, patchResult.props);
        changedObjects += 1;
      } catch (error) {
        failedObjects.push(objectId + " (" + (error.message || String(error)) + ")");
      }
    }

    return {
      changedObjects: changedObjects,
      skippedObjects: skippedObjects,
      failedObjects: failedObjects
    };
  }

  async function restoreOriginalObjects(app, state, onProgress) {
    var objectIds = Object.keys(state.originalPropsByObjectId);
    if (!objectIds.length) {
      return {
        restored: 0,
        failed: []
      };
    }

    var restored = 0;
    var failed = [];

    for (var idx = 0; idx < objectIds.length; idx += 1) {
      var objectId = objectIds[idx];

      if (onProgress) {
        onProgress("Restoring objects " + (idx + 1) + " / " + objectIds.length + "...");
      }

      try {
        await setObjectPropertiesSafe(app, objectId, state.originalPropsByObjectId[objectId]);
        restored += 1;
        delete state.originalPropsByObjectId[objectId];
      } catch (error) {
        failed.push(objectId + " (" + (error.message || String(error)) + ")");
      }
    }

    return {
      restored: restored,
      failed: failed
    };
  }

  function render($element, layout, state) {
    var toneClass = "";
    if (state.tone === "warn") {
      toneClass = "gdpr-status-warn";
    } else if (state.tone === "error") {
      toneClass = "gdpr-status-error";
    }

    var props = layout.props || {};
    var apiUrl = String(props.apiUrl || DEFAULT_API_URL);
    var idField = String(props.idField || DEFAULT_ID_FIELD);
    var columns = parseColumns(props.encryptedColumns || DEFAULT_ENCRYPTED_COLUMNS);
    var previewRows = Array.isArray(state.previewRows) ? state.previewRows : [];

    var summary = [
      "API: " + apiUrl,
      "ID field: " + idField,
      "Columns: " + (columns.length ? columns.join(", ") : "<none>")
    ].join(" | ");

    $element.html(
      '<div class="gdpr-wrap">' +
        '<h3 class="gdpr-title">GdprDecrypt</h3>' +
        '<p class="gdpr-subtitle">Decrypt selected rows and patch visible charts.</p>' +
        '<div class="gdpr-actions">' +
          '<button class="gdpr-btn gdpr-btn-decrypt" ' + (state.busy ? "disabled" : "") + ">Decrypt</button>" +
          '<button class="gdpr-btn gdpr-btn-secondary gdpr-btn-reset" ' + (state.busy ? "disabled" : "") + ">Reset</button>" +
        '</div>' +
        '<div class="gdpr-status ' + toneClass + '">' +
          escapeHtml(state.message || "") +
          (state.progress ? "\n" + escapeHtml(state.progress) : "") +
          (state.stats ? "\n" + escapeHtml(state.stats) : "") +
        '</div>' +
        '<div class="gdpr-preview">' +
          '<h4 class="gdpr-preview-title">Decrypted Data</h4>' +
          renderPreviewTable(previewRows, columns) +
        '</div>' +
        '<div class="gdpr-meta">' + escapeHtml(summary) + '</div>' +
      '</div>'
    );
  }

  function withBusy(state, value) {
    state.busy = value;
    if (!value) {
      state.progress = "";
    }
  }

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
      if (Object.keys(state.originalPropsByObjectId).length) {
        state.progress = "Restoring previous patch set...";
        render($element, layout, state);
        await restoreOriginalObjects(app, state, function (message) {
          state.progress = message;
          render($element, layout, state);
        });
      }

      var extraction = await fetchRowsFromCurrentSelections(app, idField, columns, function (message) {
        state.progress = message;
        render($element, layout, state);
      });

      if (!extraction.rows.length) {
        state.tone = "warn";
        state.message = "No rows found in current selections for configured fields.";
        state.stats = "Try changing selections or configured fields.";
        return;
      }

      state.progress = "Calling decrypt API with " + extraction.rows.length + " rows...";
      render($element, layout, state);

      var payload = {
        id_column: idField,
        rows: extraction.rows
      };

      if (columns.length === 1) {
        payload.column = columns[0];
      } else {
        payload.columns = columns;
      }

      var decryptedRows = await callDecryptPost(apiUrl, payload);
      state.previewRows = decryptedRows;

      var decryptedSample = buildDecryptedSample(decryptedRows, columns);

      var expressionBuild = buildExpressionByColumn(idField, columns, decryptedRows);
      var pickExprByColumn = expressionBuild.pickExprByColumn;
      var variantToColumnKey = expressionBuild.variantToColumnKey;
      var skippedColumns = expressionBuild.skippedColumns;

      if (!Object.keys(pickExprByColumn).length) {
        state.tone = "warn";
        state.message = "No columns were patchable after decrypt.";
        state.stats = skippedColumns.length ? "Skipped columns: " + skippedColumns.join(" | ") : "";
        return;
      }

      var candidateObjectIds = await getCandidateObjectIds(app, layout.qInfo.qId);
      if (!candidateObjectIds.length) {
        state.tone = "warn";
        state.message = "No chart objects were found to patch.";
        state.stats = "Could not detect object IDs from DOM or engine metadata.";
        return;
      }

      var patchResults = await applyPatchesToVisibleObjects(
        app,
        candidateObjectIds,
        pickExprByColumn,
        variantToColumnKey,
        state,
        function (message) {
          state.progress = message;
          render($element, layout, state);
        }
      );

      qlik.resize();
      $(window).trigger("resize");

      state.tone = patchResults.failedObjects.length ? "warn" : "info";
      state.message = "Decrypt run complete.";

      var statParts = [
        "Rows sent: " + extraction.rows.length,
        "Rows decrypted: " + decryptedRows.length,
        "Objects scanned: " + candidateObjectIds.length,
        "Objects changed: " + patchResults.changedObjects,
        "Objects skipped: " + patchResults.skippedObjects.length,
        "Objects failed: " + patchResults.failedObjects.length
      ];

      if (extraction.capped) {
        statParts.push("Row cap reached (" + INTERNAL_MAX_ROWS + ")");
      }

      if (skippedColumns.length) {
        statParts.push("Skipped columns: " + skippedColumns.join(", "));
      }

      if (patchResults.failedObjects.length) {
        statParts.push("Failures: " + patchResults.failedObjects.slice(0, 5).join(" | "));
      }

      if (decryptedSample) {
        statParts.unshift(decryptedSample);
      }

      state.stats = statParts.join("\n");
    } catch (error) {
      state.tone = "error";
      state.message = "Decrypt failed.";
      state.stats = error && error.message ? error.message : String(error);
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
    state.message = "Resetting patched objects...";
    state.stats = "";
    render($element, layout, state);

    try {
      var restoreResult = await restoreOriginalObjects(app, state, function (message) {
        state.progress = message;
        render($element, layout, state);
      });

      qlik.resize();
      $(window).trigger("resize");

      state.tone = restoreResult.failed.length ? "warn" : "info";
      state.message = "Reset complete.";
      state.stats = "Restored: " + restoreResult.restored + "\nFailed: " + restoreResult.failed.length;
      state.previewRows = [];

      if (restoreResult.failed.length) {
        state.stats += "\nFailures: " + restoreResult.failed.slice(0, 5).join(" | ");
      }
    } catch (error) {
      state.tone = "error";
      state.message = "Reset failed.";
      state.stats = error && error.message ? error.message : String(error);
      state.previewRows = [];
    } finally {
      withBusy(state, false);
      render($element, layout, state);
    }
  }

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

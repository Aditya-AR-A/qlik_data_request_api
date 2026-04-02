define(["qlik", "jquery", "text!./GdprDecrypt.css"], function (qlik, $, cssContent) {
  "use strict";

  var DEFAULT_ID_FIELD = "id";
  var DEFAULT_COLUMNS = "hr_id";
  var DEFAULT_TARGET_OBJECT_IDS = "";

  var INTERNAL_MAX_ROWS = 100000;
  var INTERNAL_PAGE_SIZE = 5000;
  var INTERNAL_MAX_EXPRESSION_LENGTH = 120000;

  $("<style>").html(cssContent).appendTo("head");

  var instanceState = {};

  function getState(instanceId) {
    if (!instanceState[instanceId]) {
      instanceState[instanceId] = {
        busy: false,
        tone: "info",
        message: "Idle. Configure ID field, columns, and target object IDs, then click Apply Random Update.",
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

  function parseCsv(value) {
    return String(value || "")
      .split(",")
      .map(function (item) {
        return item.trim();
      })
      .filter(Boolean);
  }

  function isNumericLike(value) {
    return /^\d+$/.test(String(value == null ? "" : value).trim());
  }

  function uniqueObjectIds(ids, currentObjectId) {
    var map = {};
    (ids || []).forEach(function (id) {
      var text = String(id == null ? "" : id).trim();
      if (!text || text === currentObjectId) {
        return;
      }
      if (/CurrentSelections/i.test(text)) {
        return;
      }
      map[text] = true;
    });
    return Object.keys(map);
  }

  function extractIdsFromToken(token) {
    var text = String(token == null ? "" : token).trim();
    if (!text) {
      return [];
    }

    var results = [];
    var parts = text.split(/\s+/);

    parts.forEach(function (part) {
      var value = String(part || "").trim();
      if (!value) {
        return;
      }

      var headerMatch = value.match(/^([A-Za-z0-9_-]+)-Header-\d+$/i);
      if (headerMatch && headerMatch[1]) {
        results.push(headerMatch[1]);
      }

      var objectPrefixMatch = value.match(/(?:^|[^A-Za-z0-9_-])qv-object-([A-Za-z0-9_-]{4,})(?:$|[^A-Za-z0-9_-])/i);
      if (objectPrefixMatch && objectPrefixMatch[1]) {
        results.push(objectPrefixMatch[1]);
      }

      var genericTokenMatch = value.match(/^[A-Za-z][A-Za-z0-9]{4,}$/);
      if (genericTokenMatch) {
        results.push(value);
      }
    });

    return results;
  }

  function collectLikelyObjectIds(value, ids, depth) {
    if (depth > 8 || value == null) {
      return;
    }

    if (typeof value === "string") {
      extractIdsFromToken(value).forEach(function (candidateId) {
        ids.push(candidateId);
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(function (entry) {
        collectLikelyObjectIds(entry, ids, depth + 1);
      });
      return;
    }

    if (typeof value !== "object") {
      return;
    }

    Object.keys(value).forEach(function (key) {
      var entry = value[key];
      if (/qid|id|objectid|qobjectid|name|qname/i.test(key) && typeof entry === "string") {
        extractIdsFromToken(entry).forEach(function (candidateId) {
          ids.push(candidateId);
        });
      }

      if (entry && (typeof entry === "object" || Array.isArray(entry))) {
        collectLikelyObjectIds(entry, ids, depth + 1);
      }
    });
  }

  function getVisibleObjectIdsFromDom(currentObjectId) {
    var ids = [];
    var selectors = [
      "[data-qvid]",
      "[data-qid]",
      "[data-object-id]",
      "[id]",
      "[tid]",
      ".qv-object",
      ".qv-object-wrapper"
    ];

    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (node) {
        ["data-qvid", "data-qid", "data-object-id", "id", "tid"].forEach(function (attributeName) {
          var rawValue = node.getAttribute(attributeName);
          extractIdsFromToken(rawValue).forEach(function (candidateId) {
            ids.push(candidateId);
          });
        });

        extractIdsFromToken(node.className).forEach(function (candidateId) {
          ids.push(candidateId);
        });
      });
    });

    return uniqueObjectIds(ids, currentObjectId);
  }

  function getCurrentSheetId() {
    try {
      if (qlik && qlik.navigation && typeof qlik.navigation.getCurrentSheetId === "function") {
        var navSheetId = qlik.navigation.getCurrentSheetId();
        if (typeof navSheetId === "string" && navSheetId) {
          return String(navSheetId);
        }
        if (navSheetId && typeof navSheetId === "object") {
          if (navSheetId.sheetId) {
            return String(navSheetId.sheetId);
          }
          if (navSheetId.qId) {
            return String(navSheetId.qId);
          }
        }
      }
    } catch (_navError) {
    }

    var sources = [window.location.hash, window.location.pathname];
    for (var idx = 0; idx < sources.length; idx += 1) {
      var source = String(sources[idx] || "");
      var match = source.match(/\/sheet\/([^\/?#]+)/i);
      if (match && match[1]) {
        try {
          return decodeURIComponent(match[1]);
        } catch (_decodeError) {
          return match[1];
        }
      }
    }

    return "";
  }

  function extractObjectIdsFromSheetItem(sheetItem) {
    var ids = [];
    collectLikelyObjectIds(sheetItem, ids, 0);
    return uniqueObjectIds(ids, "");
  }

  async function getVisibleObjectIdsFromCurrentSheet(app, currentObjectId) {
    var engineModel = getEngineModel(app);
    var currentSheetId = getCurrentSheetId();
    if (!engineModel || typeof engineModel.getObject !== "function" || !currentSheetId) {
      return [];
    }

    try {
      var sheetObject = await engineModel.getObject(currentSheetId);
      if (!sheetObject || typeof sheetObject.getLayout !== "function") {
        return [];
      }

      var layout = await sheetObject.getLayout();
      var childItems = (((layout || {}).qChildList || {}).qItems) || [];
      var ids = [];

      childItems.forEach(function (item) {
        if (item && item.qInfo && item.qInfo.qId) {
          ids.push(item.qInfo.qId);
        }
      });

      return uniqueObjectIds(ids, currentObjectId);
    } catch (_sheetObjectError) {
      return [];
    }
  }

  function getVisibleObjectIdsFromSheetMeta(app, currentObjectId) {
    return new Promise(function (resolve) {
      if (!app || typeof app.getList !== "function") {
        resolve([]);
        return;
      }

      var done = false;
      var timer = null;

      function finish(ids) {
        if (done) {
          return;
        }
        done = true;
        if (timer) {
          clearTimeout(timer);
        }
        resolve(uniqueObjectIds(ids, currentObjectId));
      }

      try {
        app.getList("sheet", function (reply) {
          try {
            var sheetItems = (((reply || {}).qAppObjectList || {}).qItems) || [];
            var currentSheetId = getCurrentSheetId();
            var targetItems = sheetItems;

            if (currentSheetId) {
              var matchingItems = sheetItems.filter(function (item) {
                return item && item.qInfo && String(item.qInfo.qId) === currentSheetId;
              });
              if (matchingItems.length) {
                targetItems = matchingItems;
              }
            }

            var objectIds = [];
            targetItems.forEach(function (item) {
              objectIds = objectIds.concat(extractObjectIdsFromSheetItem(item));
            });

            finish(objectIds);
          } catch (_listParseError) {
            finish([]);
          }
        });

        timer = setTimeout(function () {
          finish([]);
        }, 1500);
      } catch (_listError) {
        finish([]);
      }
    });
  }

  async function getVisibleObjectIds(app, currentObjectId) {
    var fromCurrentSheet = await getVisibleObjectIdsFromCurrentSheet(app, currentObjectId);
    if (fromCurrentSheet.length) {
      return fromCurrentSheet;
    }

    var fromSheetMeta = await getVisibleObjectIdsFromSheetMeta(app, currentObjectId);
    if (fromSheetMeta.length) {
      return fromSheetMeta;
    }

    var fromDom = getVisibleObjectIdsFromDom(currentObjectId);
    if (fromDom.length) {
      return fromDom;
    }

    return [];
  }

  function safeStringify(value) {
    try {
      return JSON.stringify(value);
    } catch (_stringifyError) {
      return "";
    }
  }

  function objectUsesConfiguredFields(props, fields) {
    var searchScope = {
      qHyperCubeDef: props && props.qHyperCubeDef,
      qListObjectDef: props && props.qListObjectDef
    };
    var text = safeStringify(searchScope).toLowerCase();
    if (!text) {
      return false;
    }

    var normalizedFields = (fields || [])
      .map(function (fieldName) {
        return normalizeFieldName(fieldName);
      })
      .filter(Boolean);

    return normalizedFields.some(function (fieldName) {
      return text.indexOf(fieldName) >= 0;
    });
  }

  function getObjectTitle(props) {
    var title =
      (((props || {}).qMetaDef || {}).title) ||
      (((props || {}).qMeta || {}).title) ||
      (props && props.title) ||
      "";
    return String(title || "").trim();
  }

  function getObjectType(props) {
    return String((((props || {}).qInfo || {}).qType) || "object");
  }

  function unwrapPropertiesEnvelope(value) {
    if (!value || typeof value !== "object") {
      return value;
    }

    if (value.qProperty && typeof value.qProperty === "object") {
      return value.qProperty;
    }
    if (value.properties && typeof value.properties === "object") {
      return value.properties;
    }
    if (value.qProp && typeof value.qProp === "object") {
      return value.qProp;
    }

    return value;
  }

  function hasPatchableDefs(props) {
    if (!props || typeof props !== "object") {
      return false;
    }
    return !!(props.qHyperCubeDef || props.qListObjectDef);
  }

  function isSafePatchObjectType(objectType) {
    var normalized = String(objectType || "").toLowerCase();
    return /table|pivot|list|filter|straight/.test(normalized);
  }

  async function buildObjectIdDetails(app, objectIds, fields, limit) {
    var ids = Array.isArray(objectIds) ? objectIds : [];
    var maxItems = Math.max(1, Number(limit) || 10);
    var take = ids.slice(0, maxItems);
    var details = [];

    for (var idx = 0; idx < take.length; idx += 1) {
      var objectId = take[idx];
      var line = objectId;

      try {
        var props = await getObjectPropertiesSafe(app, objectId);
        var objectType = getObjectType(props);
        var objectTitle = getObjectTitle(props);
        if (objectType === "object") {
          var layout = await getObjectLayoutSafe(app, objectId);
          if (layout && layout.qInfo && layout.qInfo.qType) {
            objectType = String(layout.qInfo.qType);
          }
          if (!objectTitle && layout && layout.title) {
            if (typeof layout.title === "string") {
              objectTitle = layout.title;
            } else if (layout.title.qText) {
              objectTitle = layout.title.qText;
            }
          }
        }
        var usesFields = objectUsesConfiguredFields(props, fields);

        line += " [" + objectType + "]";
        if (objectTitle) {
          line += " " + objectTitle;
        }
        if (usesFields) {
          line += " <uses configured fields>";
        }
      } catch (_objectDetailError) {
        line += " [unresolved]";
      }

      details.push(line);
    }

    if (ids.length > take.length) {
      details.push("... +" + (ids.length - take.length) + " more");
    }

    return details;
  }

  async function getVisibleObjectSummary(app, currentObjectId, fields, limit) {
    var ids = await getVisibleObjectIds(app, currentObjectId);
    var details = await buildObjectIdDetails(app, ids, fields, limit);
    return {
      ids: ids,
      details: details
    };
  }

  async function discoverPatchableTargets(app, currentObjectId, pickExprByColumn, variantToColumnKey, fields, limit) {
    var summary = await getVisibleObjectSummary(app, currentObjectId, fields, limit || 30);
    var candidateIds = summary.ids || [];
    var patchableIds = [];

    for (var idx = 0; idx < candidateIds.length; idx += 1) {
      var candidateId = candidateIds[idx];
      try {
        var props = await getObjectPropertiesSafe(app, candidateId);
        var candidateType = getObjectType(props);
        if (!isSafePatchObjectType(candidateType) && !hasPatchableDefs(props)) {
          var candidateLayout = await getObjectLayoutSafe(app, candidateId);
          var layoutType = candidateLayout && candidateLayout.qInfo ? candidateLayout.qInfo.qType : "";
          if (!isSafePatchObjectType(layoutType)) {
            continue;
          }
        }

        if (!hasPatchableDefs(props)) {
          continue;
        }
        var probeProps = deepClone(props);
        var probeResult = patchObjectProperties(probeProps, pickExprByColumn, variantToColumnKey);
        if (probeResult.changed) {
          patchableIds.push(candidateId);
        }
      } catch (_probeError) {
      }
    }

    var patchableDetails = await buildObjectIdDetails(app, patchableIds, fields, 12);
    return {
      ids: patchableIds,
      details: patchableDetails,
      scanned: candidateIds.length,
      candidateIds: candidateIds,
      candidateDetails: summary.details || []
    };
  }

  function formatError(error) {
    function describeErrorCode(code) {
      if (String(code) === "2") {
        return "Engine error code 2 (object not found or invalid object ID)";
      }
      return "Engine error code " + code;
    }

    if (!error) {
      return "Unknown error";
    }
    if (typeof error === "string") {
      try {
        var parsed = JSON.parse(error);
        if (parsed && parsed.error && parsed.error.code !== undefined) {
          return describeErrorCode(parsed.error.code);
        }
      } catch (_parseStringError) {
      }
      return error;
    }
    if (error.error && error.error.code !== undefined) {
      return describeErrorCode(error.error.code);
    }
    if (error.message && typeof error.message === "string") {
      return error.message;
    }

    try {
      var seen = typeof WeakSet === "function" ? new WeakSet() : null;
      var text = JSON.stringify(error, function (_key, value) {
        if (typeof value === "function") {
          return undefined;
        }
        if (!value || typeof value !== "object") {
          return value;
        }
        if (!seen) {
          return value;
        }
        if (seen.has(value)) {
          return undefined;
        }
        seen.add(value);
        return value;
      });
      if (text && text !== "{}") {
        return text;
      }
    } catch (_jsonError) {
    }

    return String(error);
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

  function getEngineModel(app) {
    if (app && app.model) {
      return app.model;
    }
    return app;
  }

  async function getEngineObjectSafe(app, objectId) {
    var engineModel = getEngineModel(app);
    if (engineModel && typeof engineModel.getObject === "function") {
      return engineModel.getObject(objectId);
    }
    return null;
  }

  async function getObjectLayoutSafe(app, objectId) {
    try {
      var engineObject = await getEngineObjectSafe(app, objectId);
      if (engineObject && typeof engineObject.getLayout === "function") {
        return engineObject.getLayout();
      }
    } catch (_layoutError) {
    }
    return null;
  }

  async function getObjectPropertiesSafe(app, objectId) {
    var engineObject = await getEngineObjectSafe(app, objectId);
    if (engineObject && typeof engineObject.getProperties === "function") {
      var engineProps = await engineObject.getProperties();
      return unwrapPropertiesEnvelope(engineProps);
    }

    if (app && typeof app.getObjectProperties === "function") {
      var appProps = await app.getObjectProperties(objectId);
      return unwrapPropertiesEnvelope(appProps);
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
    if (!engineModel || typeof engineModel.getObject !== "function") {
      return true;
    }

    try {
      var obj = await engineModel.getObject(objectId);
      if (obj && typeof obj.getLayout === "function") {
        await obj.getLayout();
      }
      return true;
    } catch (_layoutError) {
      return false;
    }
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
        qType: "gdpr-random-updater-session"
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

  function randomValueFor(sourceValue, columnName) {
    var text = String(sourceValue == null ? "" : sourceValue).trim();
    if (/^-?\d+(\.\d+)?$/.test(text)) {
      return String(Math.floor(1000 + Math.random() * 9000));
    }
    return "rnd_" + columnName + "_" + Math.floor(100000 + Math.random() * 900000);
  }

  function buildRandomizedRows(rows, idField, columns) {
    return rows.map(function (row) {
      var next = {};
      next[idField] = row[idField];
      columns.forEach(function (columnName) {
        next[columnName] = randomValueFor(row[columnName], columnName);
      });
      return next;
    });
  }

  function buildPatchMap(idField, columns, rowsWithValues) {
    var pickExprByColumn = {};
    var variantToColumnKey = {};
    var skippedColumns = [];
    var idRef = fieldRef(idField);

    columns.forEach(function (columnName) {
      var columnKey = normalizeFieldName(columnName);
      var idsText = [];
      var valuesText = [];
      var idsNum = [];
      var valuesNum = [];

      rowsWithValues.forEach(function (row) {
        var idValue = row[idField];
        var nextValue = row[columnName];

        if (idValue === undefined || idValue === null || String(idValue).trim() === "") {
          return;
        }
        if (nextValue === undefined || nextValue === null || String(nextValue).trim() === "") {
          return;
        }

        var idText = String(idValue).trim();
        var nextText = String(nextValue);

        idsText.push(idText);
        valuesText.push(nextText);

        if (/^-?\d+(\.\d+)?$/.test(idText)) {
          idsNum.push(idText);
          valuesNum.push(nextText);
        }
      });

      if (!idsText.length) {
        skippedColumns.push(columnName + " (no values)");
        return;
      }

      var idTextExpr = "Text(" + idRef + ")";
      var textMatchExpr = "Match(" + idTextExpr + "," + idsText.map(qlikStringLiteral).join(",") + ")";
      var textPickExpr = "Pick(" + textMatchExpr + "," + valuesText.map(qlikStringLiteral).join(",") + ")";

      var pickExpr = textPickExpr;
      if (idsNum.length) {
        var idNumExpr = "Num(" + idRef + ")";
        var numMatchExpr = "Match(" + idNumExpr + "," + idsNum.join(",") + ")";
        var numPickExpr = "Pick(" + numMatchExpr + "," + valuesNum.map(qlikStringLiteral).join(",") + ")";
        pickExpr = "Alt(" + textPickExpr + "," + numPickExpr + ")";
      }

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

    function extractDisplayLabel(expression) {
      var text = String(expression == null ? "" : expression).trim();
      if (!text) {
        return "";
      }

      if (text.charAt(0) === "=") {
        text = text.slice(1).trim();
      }

      if (text.charAt(0) === "[" && text.charAt(text.length - 1) === "]") {
        return text.slice(1, -1).trim();
      }

      var bare = tryExtractBareField(text);
      return bare ? bare.replace(/^\[|\]$/g, "") : "";
    }

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

    function resolveColumnKeyFromExpression(expression) {
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

      return columnKey;
    }

    function patchExpression(expression) {
      if (typeof expression !== "string") {
        return expression;
      }

      var columnKey = resolveColumnKeyFromExpression(expression);
      var pickExpr = columnKey ? pickExprByColumn[columnKey] : "";
      if (!pickExpr) {
        return expression;
      }

      var fallbackExpr = stripLeadingEquals(expression);
      var bareField = tryExtractBareField(expression);
      if (bareField) {
        fallbackExpr = fieldRef(bareField);
      }

      changed = true;
      return "=Alt(" + pickExpr + "," + fallbackExpr + ")";
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
            var originalExpr = dim.qDef.qFieldDefs[fieldIdx];
            var patchedExpr = patchExpression(originalExpr);
            dim.qDef.qFieldDefs[fieldIdx] = patchedExpr;

            if (patchedExpr !== originalExpr) {
              var label = extractDisplayLabel(originalExpr);
              if (label) {
                if (!dim.qDef.qLabel) {
                  dim.qDef.qLabel = label;
                }
                if (!Array.isArray(dim.qDef.qFieldLabels)) {
                  dim.qDef.qFieldLabels = [];
                }
                if (!dim.qDef.qFieldLabels[fieldIdx]) {
                  dim.qDef.qFieldLabels[fieldIdx] = label;
                }
              }
            }
          }
        }
      }
    }

    function patchListObjectDef(listObjectDef) {
      if (!listObjectDef || !listObjectDef.qDef || !Array.isArray(listObjectDef.qDef.qFieldDefs)) {
        return;
      }

      for (var idx = 0; idx < listObjectDef.qDef.qFieldDefs.length; idx += 1) {
        var originalExpr = listObjectDef.qDef.qFieldDefs[idx];
        var patchedExpr = patchExpression(originalExpr);
        listObjectDef.qDef.qFieldDefs[idx] = patchedExpr;

        if (patchedExpr !== originalExpr) {
          var label = extractDisplayLabel(originalExpr);
          if (label) {
            if (!Array.isArray(listObjectDef.qDef.qFieldLabels)) {
              listObjectDef.qDef.qFieldLabels = [];
            }
            if (!listObjectDef.qDef.qFieldLabels[idx]) {
              listObjectDef.qDef.qFieldLabels[idx] = label;
            }
          }
        }
      }
    }

    function patchDefinitionsDeep(node) {
      if (!node || typeof node !== "object") {
        return;
      }

      if (Array.isArray(node)) {
        for (var arrIdx = 0; arrIdx < node.length; arrIdx += 1) {
          patchDefinitionsDeep(node[arrIdx]);
        }
        return;
      }

      if (node.qHyperCubeDef) {
        patchHyperCubeDef(node.qHyperCubeDef);
      }
      if (node.qListObjectDef) {
        patchListObjectDef(node.qListObjectDef);
      }

      Object.keys(node).forEach(function (key) {
        patchDefinitionsDeep(node[key]);
      });
    }

    patchDefinitionsDeep(props);

    return {
      changed: changed,
      props: props
    };
  }

  async function applyPatchesToTargetObjects(app, targetObjectIds, pickExprByColumn, variantToColumnKey, state, onProgress) {
    var changedObjects = 0;
    var skippedObjects = [];
    var failedObjects = [];

    for (var idx = 0; idx < targetObjectIds.length; idx += 1) {
      var objectId = targetObjectIds[idx];

      if (onProgress) {
        onProgress("Patching targets " + (idx + 1) + " / " + targetObjectIds.length + "...");
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

        var validAfterPatch = await isPatchedObjectLayoutValid(app, objectId);
        if (!validAfterPatch) {
          try {
            await setObjectPropertiesSafe(app, objectId, originalProps);
            failedObjects.push(objectId + " (Patch produced invalid visualization; rolled back)");
          } catch (restoreError) {
            failedObjects.push(objectId + " (Patch invalid and rollback failed: " + formatError(restoreError) + ")");
          }
          continue;
        }

        changedObjects += 1;
      } catch (error) {
        failedObjects.push(objectId + " (" + formatError(error) + ")");
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

  function buildSampleRow(rows, idField, columns) {
    if (!Array.isArray(rows) || !rows.length) {
      return "";
    }

    var first = rows[0] || {};
    var parts = [];
    var idValue = first[idField];
    if (idValue !== undefined && idValue !== null && String(idValue).trim() !== "") {
      parts.push(idField + "=" + String(idValue));
    }

    columns.slice(0, 2).forEach(function (columnName) {
      var value = first[columnName];
      if (value === undefined || value === null || String(value).trim() === "") {
        return;
      }
      parts.push(columnName + "=" + String(value).slice(0, 50));
    });

    return parts.length ? "Sample updated row: " + parts.join(" | ") : "";
  }

  function renderPreviewTable(rows, columns, idField) {
    var limitedRows = Array.isArray(rows) ? rows.slice(0, 20) : [];
    if (!limitedRows.length) {
      return '<div class="gdpr-empty">No rows to preview.</div>';
    }

    var keys = [idField];
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

  function render($element, layout, state) {
    var toneClass = "";
    if (state.tone === "warn") {
      toneClass = "gdpr-status-warn";
    } else if (state.tone === "error") {
      toneClass = "gdpr-status-error";
    }

    var props = layout.props || {};
    var idField = String(props.idField || DEFAULT_ID_FIELD);
    var columns = parseCsv(props.encryptedColumns || DEFAULT_COLUMNS);
    var targetObjectIds = parseCsv(props.targetObjectIds || DEFAULT_TARGET_OBJECT_IDS);
    var previewRows = Array.isArray(state.previewRows) ? state.previewRows : [];

    var summaryParts = [
      "ID field: " + idField,
      "Columns: " + (columns.length ? columns.join(", ") : "<none>"),
      "Scope: current sheet"
    ];

    if (targetObjectIds.length) {
      summaryParts.push("Manual targets (optional): " + targetObjectIds.join(", "));
    }

    var summary = summaryParts.join(" | ");

    $element.html(
      '<div class="gdpr-wrap">' +
        '<h3 class="gdpr-title">GdprDecrypt</h3>' +
        '<p class="gdpr-subtitle">Updates matching visualizations on the current sheet.</p>' +
        '<div class="gdpr-actions">' +
          '<button class="gdpr-btn gdpr-btn-apply" ' + (state.busy ? "disabled" : "") + ">Apply Random Update</button>" +
          '<button class="gdpr-btn gdpr-btn-secondary gdpr-btn-reset" ' + (state.busy ? "disabled" : "") + ">Reset</button>" +
          '<button class="gdpr-btn gdpr-btn-secondary gdpr-btn-show-ids" ' + (state.busy ? "disabled" : "") + ">Show Visible IDs</button>" +
        '</div>' +
        '<div class="gdpr-status ' + toneClass + '">' +
          escapeHtml(state.message || "") +
          (state.progress ? "\n" + escapeHtml(state.progress) : "") +
          (state.stats ? "\n" + escapeHtml(state.stats) : "") +
        '</div>' +
        '<div class="gdpr-preview">' +
          '<h4 class="gdpr-preview-title">Updated Data Preview</h4>' +
          renderPreviewTable(previewRows, columns, idField) +
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

  async function runShowVisibleIds(self, layout, $element) {
    var state = getState(layout.qInfo.qId);
    var app = qlik.currApp(self);
    var props = layout.props || {};
    var idField = String(props.idField || DEFAULT_ID_FIELD).trim();
    var columns = parseCsv(props.encryptedColumns || DEFAULT_COLUMNS);
    var fields = [idField].concat(columns);

    state.tone = "info";
    state.message = "Detecting visible object IDs...";
    state.stats = "";
    render($element, layout, state);

    var summary = {
      ids: [],
      details: []
    };
    try {
      summary = await getVisibleObjectSummary(app, layout.qInfo.qId, fields, 20);
    } catch (_visibleIdError) {
      summary = {
        ids: [],
        details: []
      };
    }

    state.tone = summary.ids.length ? "info" : "warn";
    state.message = summary.ids.length
      ? "Visible object IDs detected (Qlik IDs are generated strings)."
      : "No visible object IDs detected from page metadata.";
    state.stats =
      "Visible objects:\n" +
      (summary.details.length ? summary.details.join("\n") : "<none>\nOpen target charts on this sheet, then try again.");
    render($element, layout, state);
  }

  async function runApplyRandom(self, layout, $element) {
    var state = getState(layout.qInfo.qId);
    var app = qlik.currApp(self);
    var props = layout.props || {};

    var idField = String(props.idField || DEFAULT_ID_FIELD).trim();
    var columns = parseCsv(props.encryptedColumns || DEFAULT_COLUMNS);
    var configuredTargetObjectIds = parseCsv(props.targetObjectIds || DEFAULT_TARGET_OBJECT_IDS);
    var fields = [idField].concat(columns);
    var noteParts = [];
    var scannedTargetCount = 0;
    var patchableOnSheetCount = 0;
    var forbiddenTargetMap = {};
    forbiddenTargetMap[normalizeFieldName(idField)] = true;
    columns.forEach(function (columnName) {
      forbiddenTargetMap[normalizeFieldName(columnName)] = true;
    });

    var manualTargetIds = configuredTargetObjectIds.filter(function (targetId) {
      var normalized = normalizeFieldName(targetId);
      if (!normalized) {
        return false;
      }
      if (isNumericLike(targetId)) {
        return false;
      }
      if (forbiddenTargetMap[normalized]) {
        return false;
      }
      return true;
    });
    var ignoredConfiguredTargets = configuredTargetObjectIds.filter(function (targetId) {
      return manualTargetIds.indexOf(targetId) === -1;
    });

    if (!idField || !columns.length) {
      state.tone = "error";
      state.message = "Configure ID field and columns.";
      render($element, layout, state);
      return;
    }

    if (/-Header-\d+$/i.test(idField) || /^qv-/i.test(idField)) {
      state.tone = "error";
      state.message = "ID field looks like a UI element ID, not a data field.";
      state.stats = "Set ID field to your data key field (for example: id).";
      render($element, layout, state);
      return;
    }

    withBusy(state, true);
    state.tone = "info";
    state.message = "Starting sheet update...";
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
  state.progress = "Building random values and patch map...";
  render($element, layout, state);

      var randomizedRows = buildRandomizedRows(extraction.rows, idField, columns);
      state.previewRows = randomizedRows;

      var patchMap = buildPatchMap(idField, columns, randomizedRows);
      if (!Object.keys(patchMap.pickExprByColumn).length) {
        state.tone = "warn";
        state.message = "No columns were patchable for random update.";
        state.stats = patchMap.skippedColumns.length ? "Skipped columns: " + patchMap.skippedColumns.join(" | ") : "";
        return;
      }

      state.progress = "Discovering patchable visualizations on current sheet...";
      render($element, layout, state);

      var discoveredTargets = await discoverPatchableTargets(
        app,
        layout.qInfo.qId,
        patchMap.pickExprByColumn,
        patchMap.variantToColumnKey,
        fields,
        40
      );

      scannedTargetCount = discoveredTargets.scanned;
      patchableOnSheetCount = discoveredTargets.ids.length;

      if (ignoredConfiguredTargets.length) {
        noteParts.push("Ignored non-object targets: " + ignoredConfiguredTargets.join(", "));
      }

      var targetObjectIds = discoveredTargets.ids.slice();

      if (manualTargetIds.length) {
        var manualPatchable = manualTargetIds.filter(function (targetId) {
          return discoveredTargets.ids.indexOf(targetId) >= 0;
        });

        if (manualPatchable.length) {
          targetObjectIds = manualPatchable;
          noteParts.push("Using manual patchable targets: " + manualPatchable.join(", "));
        } else {
          noteParts.push("Manual targets were not patchable on this sheet; using auto-discovered targets.");
        }
      } else {
        noteParts.push("Auto-targeting patchable visualizations on current sheet.");
      }

      if (!targetObjectIds.length && manualTargetIds.length) {
        targetObjectIds = manualTargetIds.slice(0, 8);
        noteParts.push("No auto-patchable targets detected; trying manual targets directly.");
      }

      if (!targetObjectIds.length) {
        var visibleSummary = await getVisibleObjectSummary(app, layout.qInfo.qId, fields, 12);
        state.tone = "error";
        state.message = "No patchable visualizations found on current sheet.";
        state.stats = [
          "Check that configured columns are used in the target table/chart expressions.",
          "Visible objects: " + (visibleSummary.details.length ? visibleSummary.details.join(" | ") : "<none detected>")
        ]
          .concat(noteParts)
          .join("\n");
        return;
      }

      var patchResults = await applyPatchesToTargetObjects(
        app,
        targetObjectIds,
        patchMap.pickExprByColumn,
        patchMap.variantToColumnKey,
        state,
        function (message) {
          state.progress = message;
          render($element, layout, state);
        }
      );

      qlik.resize();
      $(window).trigger("resize");

      state.tone = patchResults.failedObjects.length ? "warn" : "info";
      state.message = "Sheet value update complete.";

      var statParts = noteParts.concat([
        buildSampleRow(randomizedRows, idField, columns),
        "Rows read: " + extraction.rows.length,
        "Rows randomized: " + randomizedRows.length,
        "Sheet objects scanned: " + scannedTargetCount,
        "Patchable on sheet: " + patchableOnSheetCount,
        "Targets changed: " + patchResults.changedObjects,
        "Targets skipped: " + patchResults.skippedObjects.length,
        "Targets failed: " + patchResults.failedObjects.length
      ]).filter(Boolean);

      if (extraction.capped) {
        statParts.push("Row cap reached (" + INTERNAL_MAX_ROWS + ")");
      }

      if (patchMap.skippedColumns.length) {
        statParts.push("Skipped columns: " + patchMap.skippedColumns.join(", "));
      }

      if (patchResults.failedObjects.length) {
        statParts.push("Failures: " + patchResults.failedObjects.slice(0, 5).join(" | "));
        if (!patchResults.changedObjects) {
          var visibleHintSummary = await getVisibleObjectSummary(app, layout.qInfo.qId, fields, 12);
          statParts.push(
            "Hint: use visualization object IDs. Visible IDs: " +
              (visibleHintSummary.details.length ? visibleHintSummary.details.join(" | ") : "<none detected>")
          );
        }
      }

      state.stats = statParts.join("\n");
    } catch (error) {
      state.tone = "error";
      state.message = "Random update failed.";
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
      state.stats = formatError(error);
      state.previewRows = [];
    } finally {
      withBusy(state, false);
      render($element, layout, state);
    }
  }

  return {
    initialProperties: {
      props: {
        idField: DEFAULT_ID_FIELD,
        encryptedColumns: DEFAULT_COLUMNS,
        targetObjectIds: DEFAULT_TARGET_OBJECT_IDS
      }
    },
    definition: {
      type: "items",
      component: "accordion",
      items: {
        settings: {
          uses: "settings",
          items: {
            idField: {
              type: "string",
              ref: "props.idField",
              label: "ID field",
              defaultValue: DEFAULT_ID_FIELD
            },
            encryptedColumns: {
              type: "string",
              ref: "props.encryptedColumns",
              label: "Columns to randomize and patch (comma-separated)",
              defaultValue: DEFAULT_COLUMNS
            },
            targetObjectIds: {
              type: "string",
              ref: "props.targetObjectIds",
              label: "Optional target object IDs (comma-separated)",
              defaultValue: DEFAULT_TARGET_OBJECT_IDS
            }
          }
        }
      }
    },
    paint: function ($element, layout) {
      var self = this;
      var state = getState(layout.qInfo.qId);

      render($element, layout, state);

      $element.find(".gdpr-btn-apply").off("click").on("click", function () {
        runApplyRandom(self, layout, $element);
      });

      $element.find(".gdpr-btn-reset").off("click").on("click", function () {
        runReset(self, layout, $element);
      });

      $element.find(".gdpr-btn-show-ids").off("click").on("click", function () {
        runShowVisibleIds(self, layout, $element);
      });

      return Promise.resolve();
    }
  };
});

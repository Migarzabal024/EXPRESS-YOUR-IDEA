-- Índice de búsqueda interna del proyecto (SQLite FTS5).
-- Se mantiene solo mediante triggers: cualquier cambio en proyectos, espacios,
-- páginas, elementos o recursos se refleja al instante, sin código extra.
-- remove_diacritics 2: "diseno" encuentra "diseño" y al revés.
CREATE VIRTUAL TABLE `search_index` USING fts5(
  `kind` UNINDEXED,
  `subtype` UNINDEXED,
  `ref_id` UNINDEXED,
  `workspace_id` UNINDEXED,
  `title`,
  `body`,
  tokenize = 'unicode61 remove_diacritics 2'
);
--> statement-breakpoint

-- ---------- Proyecto ----------
CREATE TRIGGER `search_project_ai` AFTER INSERT ON `project` BEGIN
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('project', '', NEW.id, NULL, NEW.name, NEW.description);
END;
--> statement-breakpoint
CREATE TRIGGER `search_project_au` AFTER UPDATE ON `project` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('project', '', NEW.id, NULL, NEW.name, NEW.description);
END;
--> statement-breakpoint
CREATE TRIGGER `search_project_ad` AFTER DELETE ON `project` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
END;
--> statement-breakpoint

-- ---------- Espacios de trabajo ----------
CREATE TRIGGER `search_workspace_ai` AFTER INSERT ON `workspace` BEGIN
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('workspace', NEW.canvas_mode, NEW.id, NEW.id, NEW.name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_workspace_au` AFTER UPDATE ON `workspace` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('workspace', NEW.canvas_mode, NEW.id, NEW.id, NEW.name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_workspace_ad` AFTER DELETE ON `workspace` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
END;
--> statement-breakpoint

-- ---------- Páginas ----------
CREATE TRIGGER `search_page_ai` AFTER INSERT ON `canvas_page` BEGIN
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('page', '', NEW.id, NEW.workspace_id, NEW.name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_page_au` AFTER UPDATE ON `canvas_page` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('page', '', NEW.id, NEW.workspace_id, NEW.name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_page_ad` AFTER DELETE ON `canvas_page` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
END;
--> statement-breakpoint

-- ---------- Elementos del lienzo ----------
-- Se indexan: title, plainText (o text si es texto plano), caption y keywords (lista de palabras clave).
CREATE TRIGGER `search_element_ai` AFTER INSERT ON `canvas_element`
WHEN json_valid(NEW.properties_json) BEGIN
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES (
    'element', NEW.type, NEW.id, NEW.workspace_id,
    coalesce(json_extract(NEW.properties_json, '$.title'), ''),
    trim(
      coalesce(json_extract(NEW.properties_json, '$.plainText'), json_extract(NEW.properties_json, '$.text'), '') || ' ' ||
      coalesce(json_extract(NEW.properties_json, '$.caption'), '') || ' ' ||
      coalesce((SELECT group_concat(value, ' ') FROM json_each(NEW.properties_json, '$.keywords')), '')
    )
  );
END;
--> statement-breakpoint
CREATE TRIGGER `search_element_au` AFTER UPDATE ON `canvas_element` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  SELECT
    'element', NEW.type, NEW.id, NEW.workspace_id,
    coalesce(json_extract(NEW.properties_json, '$.title'), ''),
    trim(
      coalesce(json_extract(NEW.properties_json, '$.plainText'), json_extract(NEW.properties_json, '$.text'), '') || ' ' ||
      coalesce(json_extract(NEW.properties_json, '$.caption'), '') || ' ' ||
      coalesce((SELECT group_concat(value, ' ') FROM json_each(NEW.properties_json, '$.keywords')), '')
    )
  WHERE json_valid(NEW.properties_json);
END;
--> statement-breakpoint
CREATE TRIGGER `search_element_ad` AFTER DELETE ON `canvas_element` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
END;
--> statement-breakpoint

-- ---------- Recursos (imágenes, audios, documentos) ----------
CREATE TRIGGER `search_asset_ai` AFTER INSERT ON `asset` BEGIN
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('asset', NEW.mime_type, NEW.id, NULL, NEW.file_name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_asset_au` AFTER UPDATE ON `asset` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
  INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
  VALUES ('asset', NEW.mime_type, NEW.id, NULL, NEW.file_name, '');
END;
--> statement-breakpoint
CREATE TRIGGER `search_asset_ad` AFTER DELETE ON `asset` BEGIN
  DELETE FROM search_index WHERE ref_id = OLD.id;
END;
--> statement-breakpoint

-- ---------- Datos existentes (proyectos creados antes de este índice) ----------
INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
SELECT 'project', '', id, NULL, name, description FROM project;
--> statement-breakpoint
INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
SELECT 'workspace', canvas_mode, id, id, name, '' FROM workspace;
--> statement-breakpoint
INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
SELECT 'page', '', id, workspace_id, name, '' FROM canvas_page;
--> statement-breakpoint
INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
SELECT
  'element', type, id, workspace_id,
  coalesce(json_extract(properties_json, '$.title'), ''),
  trim(
    coalesce(json_extract(properties_json, '$.plainText'), json_extract(properties_json, '$.text'), '') || ' ' ||
    coalesce(json_extract(properties_json, '$.caption'), '') || ' ' ||
    coalesce((SELECT group_concat(value, ' ') FROM json_each(canvas_element.properties_json, '$.keywords')), '')
  )
FROM canvas_element WHERE json_valid(properties_json);
--> statement-breakpoint
INSERT INTO search_index (kind, subtype, ref_id, workspace_id, title, body)
SELECT 'asset', mime_type, id, NULL, file_name, '' FROM asset;

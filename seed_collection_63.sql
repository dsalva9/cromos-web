-- Seed data for Collection 63 (FIXED POSITIONS & GROUPING)
DELETE FROM template_slots WHERE template_id = 63;
DELETE FROM template_pages WHERE template_id = 63;

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 1, 'D. ALAVÉS', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 1, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 2, 'SIVERA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 3, 'RAÚL FERNÁNDEZ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 4, 'JONNY', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 5, 'TENAGLIA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 6, 'PACHECO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 7, 'PARADA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 8, 'MOUSSA DIARRA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 9, 'BLANCO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 10, 'GUEVARA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 11, 'GURIDI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 12, 'ALEÑÁ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 13, 'PABLO IBÁÑEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 14, 'DENIS SUÁREZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 15, 'CARLOS VICENTE', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 16, 'TONI MARTÍNEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 17, 'BOYÉ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 18, 'MARIANO', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 2, 'ATHLETIC CLUB', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 19, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 20, 'UNAI SIMÓN', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 21, 'PADILLA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 22, 'ARESO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 23, 'VIVIAN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 24, 'PAREDES', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 25, 'LAPORTE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 26, 'YURI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 27, 'RUIZ DE GALARRETA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 28, 'JAUREGIZAR', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 29, 'VESGA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 30, 'UNAI GÓMEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 31, 'SANCET', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 32, 'BERENGUER', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 33, 'WILLIAMS', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 34, 'MAROAN', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 35, 'GURUZETA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 36, 'NICO WILLIAMS', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 3, 'ATLÉTICO DE MADRID', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 37, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 38, 'OBLAK', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 39, 'MUSSO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 40, 'MARCOS LLORENTE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 41, 'LE NORMAND', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 42, 'LENGLET', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 43, 'HANCKO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 44, 'RUGGERI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 45, 'KOKE', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 46, 'BARRIOS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 47, 'GALLAGHER', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 48, 'ÁLEX BAENA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 49, 'ALMADA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 50, 'NICO GONZÁLEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 51, 'GIULIANO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 52, 'JULIÁN ALVAREZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 53, 'SORLOTH', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 54, 'GRIEZMANN', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 4, 'FC BARCELONA', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 55, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 56, 'JOAN GARCÍA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 57, 'SZCZESNY', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 58, 'KOUNDÉ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 59, 'CUBARSÍ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 60, 'ERIC GARCÍA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 61, 'ARAÚJO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 62, 'BALDE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 63, 'DE JONG', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 64, 'GAVI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 65, 'PEDRI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 66, 'FERMÍN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 67, 'DANI OLMO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 68, 'RAPHINHA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 69, 'LAMINE YAMAL', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 70, 'FERRAN TORRES', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 71, 'LEWANDOWSKI', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 72, 'RASHFORD', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 5, 'REAL BETIS', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 73, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 74, 'PAU LÓPEZ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 75, 'VALLES', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 76, 'BELLERÍN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 77, 'BARTRA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 78, 'DIEGO LLORENTE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 79, 'NATAN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 80, 'VALENTÍN GÓMEZ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 81, 'JUNIOR', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 82, 'ALTIMIRA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 83, 'AMRABAT', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 84, 'PABLO FORNALS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 85, 'LO CELSO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 86, 'ISCO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 87, 'ANTONY', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 88, 'CUCHO HERNÁNDEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 89, 'RIQUELME', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 90, 'ABDE', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 6, 'RC CELTA', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 91, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 92, 'RADU', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 93, 'IVÁN VILLAR', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 94, 'JAVI RUEDA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 95, 'JAVI RODRÍGUEZ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 96, 'STARFELT', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 97, 'MARCOS ALONSO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 98, 'MINGUEZA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 99, 'CARREIRA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 100, 'ILAIX MORIBA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 101, 'FRAN BELTRÁN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 102, 'SOTELO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 103, 'HUGO ÁLVAREZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 104, 'SWEDBERG', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 105, 'BRYAN ZARAGOZA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 106, 'IAGO ASPAS', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 107, 'BORJA IGLESIAS', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 108, 'JUTGLÀ', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 7, 'ELCHE CF', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 109, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 110, 'IÑAKI PEÑA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 111, 'DITURO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 112, 'ÁLVARO NÚÑEZ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 113, 'CHUST', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 114, 'BIGAS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 115, 'AFFENGRUBER', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 116, 'PEDROSA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 117, 'FEDE REDONDO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 118, 'GERMÁN VALERA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 119, 'MARTIM NETO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 120, 'FEBAS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 121, 'MARC AGUADO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 122, 'RODRI MENDOZA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 123, 'JOSAN', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 124, 'ÁLVARO RODRÍGUEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 125, 'ANDRÉ SILVA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 126, 'RAFA MIR', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 8, 'RCD ESPANYOL', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 127, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 128, 'DMITROVIC', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 129, 'FORTUÑO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 130, 'EL HILALI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 131, 'CALERO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 132, 'RIEDEL', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 133, 'CABRERA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 134, 'CARLOS ROMERO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 135, 'POL LOZANO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 136, 'URKO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 137, 'EDU EXPÓSITO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 138, 'TERRATS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 139, 'ANTONIU ROCA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 140, 'DOLAN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 141, 'ROBERTO FERNÁNDEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 142, 'KIKE GARCÍA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 143, 'PUADO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 144, 'PERE MILLA', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 9, 'GETAFE CF', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 145, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 146, 'DAVID SORIA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 147, 'LETACEK', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 148, 'IGLESIAS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 149, 'KIKO FEMENÍA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 150, 'DJENÉ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 151, 'DOMINGOS DUARTE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 152, 'ABQAR', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 153, 'DIEGO RICO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 154, 'DAVINCHI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 155, 'MARIO MARTÍN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 156, 'ARAMBARRI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 157, 'MILLA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 158, 'NEYOU', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 159, 'JAVI MUÑOZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 160, 'BORJA MAYORAL', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 161, 'LISO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 162, 'COBA', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 10, 'GIRONA FC', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 163, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 164, 'GAZZANIGA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 165, 'LIVAKOVIC', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 166, 'ARNAU', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 167, 'HUGO RINCÓN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 168, 'VITOR REIS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 169, 'BLIND', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 170, 'FRANCÉS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 171, 'ÁLEX MORENO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 172, 'WITSEL', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 173, 'OUNAHI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 174, 'IVÁN MARTÍN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 175, 'YÁSER ASPRILLA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 176, 'JOEL ROCA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 177, 'TSYGANKOV', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 178, 'VANAT', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 179, 'STUANI', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 180, 'BRYAN GIL', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 11, 'LEVANTE UD', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 181, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 182, 'RYAN', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 183, 'PABLO CAMPOS', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 184, 'TOLJAN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 185, 'DELA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 186, 'ELGEZABAL', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 187, 'MATÍAS MORENO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 188, 'MANU SÁNCHEZ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 189, 'PAMPÍN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 190, 'ORIOL REY', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 191, 'PABLO MARTÍNEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 192, 'OLASAGASTI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 193, 'VENCEDOR', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 194, 'CARLOS ÁLVAREZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 195, 'MORALES', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 196, 'BRUGUÉ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 197, 'IVÁN ROMERO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 198, 'ETTA EYONG', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 12, 'REAL MADRID', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 199, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 200, 'COURTOIS', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 201, 'LUNIN', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 202, 'CARVAJAL', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 203, 'TRENT', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 204, 'MILITAO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 205, 'HUIJSEN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 206, 'RÜDIGER', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 207, 'CARRERAS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 208, 'TCHOUAMÉNI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 209, 'FEDE VALVERDE', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 210, 'BELLINGHAM', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 211, 'GÜLER', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 212, 'MASTANTUONO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 213, 'RODRYGO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 214, 'MBAPPÉ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 215, 'GONZALO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 216, 'VINÍCIUS', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 13, 'RCD MALLORCA', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 217, 'ESCUDO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 218, 'LEO ROMÁN', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 219, 'BERGSTRÖM', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 220, 'MOREY', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 221, 'MAFFEO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 222, 'VALJENT', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 223, 'RAÍLLO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 224, 'KUMBULLA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 225, 'MOJICA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 226, 'SAMÚ COSTA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 227, 'ANTONIO SÁNCHEZ', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 228, 'DARDER', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 229, 'MORLANES', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 230, 'PABLO TORRE', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 231, 'ASANO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 232, 'MURIQI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 233, 'MATEO JOSEPH', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 234, 'JAN VIRGILI', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 14, 'CA OSASUNA', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 235, 'ESCUDO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 236, 'SERGIO HERRERA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 237, 'AITOR FERNÁNDEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 238, 'ROSIER', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 239, 'BOYOMO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 240, 'CATENA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 241, 'HERRANDO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 242, 'JUAN CRUZ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 243, 'ABEL BRETONES', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 244, 'TORRÓ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 245, 'MONCAYOLA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 246, 'MOI GÓMEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 247, 'RUBÉN GARCÍA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 248, 'AIMAR OROZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 249, 'VÍCTOR MUÑOZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 250, 'RAÚL GARCÍA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 251, 'BUDIMIR', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 252, 'BECKER', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 15, 'REAL OVIEDO', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 253, 'ESCUDO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 254, 'AARÓN ESCANDELL', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 255, 'MOLDOVAN', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 256, 'NACHO VIDAL', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 257, 'ERIC BAILLY', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 258, 'DAVID CARMO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 259, 'DANI CALVO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 260, 'RAHIM ALHASSANE', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 261, 'COLOMBATTO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 262, 'REINA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 263, 'DENDONCKER', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 264, 'CAZORLA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 265, 'ILIC', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 266, 'HASSAN', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 267, 'BREKALO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 268, 'ILYAS CHAIRA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 269, 'FEDE VIÑAS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 270, 'RONDÓN', '{"Posición":"Delantero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 16, 'RAYO VALLECANO', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 271, 'ESCUDO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 272, 'BATALLA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 273, 'CÁRDENAS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 274, 'RATIU', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 275, 'BALLIU', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 276, 'LEJEUNE', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 277, 'LUIZ FELIPE', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 278, 'PEP CHAVARRÍA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 279, 'PATHÉ CISS', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 280, 'UNAI LÓPEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 281, 'ÓSCAR VALENTÍN', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 282, 'ISI', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 283, 'PEDRO DÍAZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 284, 'ÁLVARO GARCÍA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 285, 'FRAN PÉREZ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 286, 'CAMELLO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 287, 'DE FRUTOS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 288, 'ALEMAO', '{"Posición":"Defensa"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 17, 'REAL SOCIEDAD', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 289, 'ESCUDO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 290, 'REMIRO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 291, 'MARRERO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 292, 'ARAMBURU', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 293, 'ARITZ ELUSTONDO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 294, 'ZUBELDIA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 295, 'CALETA-CAR', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 296, 'SERGIO GÓMEZ', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 297, 'GORROTXATEGI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 298, 'TURRIENTES', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 299, 'PABLO MARÍN', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 300, 'CARLOS SOLER', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 301, 'BRAIS MÉNDEZ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 302, 'KUBO', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 303, 'BARRENETXEA', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 304, 'OYARZABAL', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 305, 'ÓSKARSSON', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 306, 'GUEDES', '{"Posición":"Defensa"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 18, 'SEVILLA FC', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 307, 'ESCUDO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 308, 'VLACHODIMOS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 309, 'NYLAND', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 310, 'CARMONA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 311, 'JUANLU', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 312, 'AZPILICUETA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 313, 'KIKE SALAS', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 314, 'MARCAO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 315, 'SUAZO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 316, 'GUDELJ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 317, 'AGOUMÉ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 318, 'SOW', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 319, 'BATISTA MENDY', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 320, 'VARGAS', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 321, 'EJUKE', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 322, 'ISAAC ROMERO', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 323, 'AKOR ADAMS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 324, 'ALEXIS SÁNCHEZ', '{"Posición":"Defensa"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 19, 'VALENCIA CF', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 325, 'ESCUDO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 326, 'AGIRREZABALA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 327, 'DIMITRIEVSKI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 328, 'FOULQUIER', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 329, 'CORREIA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 330, 'TÁRREGA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 331, 'COPETE', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 332, 'DIAKHABY', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 333, 'GAYÀ', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 334, 'PEPELU', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 335, 'SANTAMARIA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 336, 'JAVI GUERRA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 337, 'ANDRÉ ALMEIDA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 338, 'LUIS RIOJA', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 339, 'DIEGO LÓPEZ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 340, 'RAMAZANI', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 341, 'DANJUMA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 342, 'HUGO DURO', '{"Posición":"Defensa"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 20, 'VILLARREAL CF', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 343, 'ESCUDO', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 344, 'LUIZ JÚNIOR', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 345, 'ARNAU TENAS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 346, 'MOURIÑO', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 347, 'FOYTH', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 348, 'RAFA MARÍN', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 349, 'RENATO VEIGA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 350, 'SERGI CARDONA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 351, 'SANTI COMESAÑA', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 352, 'PAPE GUEYE', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 353, 'PAREJO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 354, 'THOMAS', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 355, 'MOLEIRO', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 356, 'BUCHANAN', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 357, 'MIKAUTADZE', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 358, 'PÉPÉ', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 359, 'OLUWASEYI', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 360, 'AYOZE', '{"Posición":"Defensa"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 21, '¡VAMOS!', 20)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 361, 'D. ALAVÉS', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 362, 'ATHLETIC CLUB', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 363, 'ATLÉTICO DE MADRID', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 364, 'FC BARCELONA', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 365, 'REAL BETIS', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 366, 'RC CELTA', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 367, 'ELCHE CF', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 368, 'RCD ESPANYOL', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 369, 'GETAFE CF', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 370, 'GIRONA FC', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 371, 'LEVANTE UD', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 372, 'REAL MADRID', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 373, 'RCD MALLORCA', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 374, 'CA OSASUNA', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 375, 'REAL OVIEDO', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 376, 'RAYO VALLECANO', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 377, 'REAL SOCIEDAD', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 378, 'SEVILLA FC', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 379, 'VALENCIA CF', '{}'::jsonb, false),
  (63, (SELECT id FROM new_page), 380, 'VILLARREAL CF', '{}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 22, 'GUANTES DE ORO', 7)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 381, 'SIVERA', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 382, 'JOAN GARCÍA (FC BARCELONA)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 383, 'DAVID SORIA (GETAFE CF)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 384, 'SERGIO HERRERA (CA OSASUNA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 385, 'BATALLA (RAYO VALLECANO)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 386, 'REMIRO (REAL SOCIEDAD)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 387, 'AGIRREZABALA (VALENCIA CF)', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 23, 'KRYPTONITA', 9)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 388, 'LAPORTE', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 389, 'VIVIAN (ATHLETIC CLUB)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 390, 'LE NORMAND (ATLÉTICO DE MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 391, 'AFFENGRUBER (ELCHE CF)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 392, 'CABRERA (RCD ESPANYOL)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 393, 'MILITAO (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 394, 'LEJEUNE (RAYO VALLECANO)', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 395, 'TÁRREGA (VALENCIA CF)', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 396, 'MOURIÑO (VILLARREAL CF)', '{"Posición":"Portero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 24, 'DIAMANTES', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 397, 'REGO (ATHLETIC CLUB)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 398, 'DRO (FC BARCELONA)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 399, 'VALENTÍN GÓMEZ (REAL BETIS)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 400, 'PABLO GARCÍA (REAL BETIS)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 401, 'RODRI MENDOZA (ELCHE CF)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 402, 'RIEDEL (RCD ESPANYOL)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 403, 'DAVINCHI', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 404, 'LISO (GETAFE CF)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 405, 'VITOR REIS (GIRONA FC)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 406, 'JOEL ROCA (GIRONA FC)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 407, 'CARLOS ÁLVAREZ (LEVANTE UD)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 408, 'ETTA EYONG (LEVANTE UD)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 409, 'FRAN GONZÁLEZ (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 410, 'GONZALO (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 411, 'JAN VIRGILI (RCD MALLORCA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 412, 'MATEO JOSEPH (RCD MALLORCA)', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 413, 'VÍCTOR MUÑOZ (CA OSASUNA)', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 414, 'RENATO VEIGA (VILLARREAL CF)', '{"Posición":"Portero"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 25, 'INFLUENCERS', 9)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 415, 'BARRIOS', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 416, 'SOTELO (RC CELTA)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 417, 'FEBAS (ELCHE CF)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 418, 'EDU EXPÓSITO (RCD ESPANYOL)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 419, 'MILLA (GETAFE CF)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 420, 'DARDER (RCD MALLORCA)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 421, 'AIMAR OROZ (CA OSASUNA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 422, 'CAZORLA (REAL OVIEDO)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 423, 'UNAI LÓPEZ (RAYO VALLECANO)', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 26, 'PROTAS', 18)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 424, 'TENAGLIA', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 425, 'CARLOS VICENTE (D. ALAVÉS)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 426, 'ERIC GARCÍA (FC BARCELONA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 427, 'CUCHO HERNÁNDEZ (REAL BETIS)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 428, 'BORJA IGLESIAS (RC CELTA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 429, 'DOLAN (RCD ESPANYOL)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 430, 'VANAT (GIRONA FC)', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 431, 'MANU SÁNCHEZ (LEVANTE UD)', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 432, 'TCHOUAMÉNI (REAL MADRID)', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 433, 'LEO ROMÁN (RCD MALLORCA)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 434, 'AARÓN ESCANDELL (REAL OVIEDO)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 435, 'HASSAN (REAL OVIEDO)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 436, 'CARLOS SOLER (REAL SOCIEDAD)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 437, 'GORROTXATEGI (REAL SOCIEDAD)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 438, 'BATISTA MENDY (SEVILLA FC)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 439, 'ALEXIS SÁNCHEZ (SEVILLA FC)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 440, 'DANJUMA (VALENCIA CF)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 441, 'BUCHANAN (VILLARREAL CF)', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 27, 'SUPER CRACKS', 26)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 442, 'UNAI SIMÓN (ATHLETIC CLUB)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 443, 'JAUREGIZAR (ATHLETIC CLUB)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 444, 'OBLAK (ATLÉTICO DE MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 445, 'MARCOS LLORENTE (ATLÉTICO DE MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 446, 'ÁLEX BAENA (ATLÉTICO DE MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 447, 'ALMADA (ATLÉTICO DE MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 448, 'GRIEZMANN', '{"Posición":"Escudo"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 449, 'KOUNDÉ (FC BARCELONA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 450, 'BALDE (FC BARCELONA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 451, 'RAPHINHA (FC BARCELONA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 452, 'LEWANDOWSKI (FC BARCELONA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 453, 'RASHFORD (FC BARCELONA)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 454, 'ISCO (REAL BETIS)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 455, 'LO CELSO (REAL BETIS)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 456, 'ANTONY (REAL BETIS)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 457, 'COURTOIS (REAL MADRID)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 458, 'CARRERAS (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 459, 'FEDE VALVERDE (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 460, 'MASTANTUONO (REAL MADRID)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 461, 'BUDIMIR (CA OSASUNA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 462, 'ISI (RAYO VALLECANO)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 463, 'KUBO (REAL SOCIEDAD)', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 464, 'VARGAS (SEVILLA FC)', '{"Posición":"Portero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 465, 'JAVI GUERRA (VALENCIA CF)', '{"Posición":"Defensa"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 466, 'MOLEIRO (VILLARREAL CF)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 467, 'PÉPÉ (VILLARREAL CF)', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 28, 'CARD CHAMPIONS', 0)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
;

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 29, 'BALÓN DE ORO', 6)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
  (63, (SELECT id FROM new_page), 469, 'NICO WILLIAMS', '{"Posición":"Delantero"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 470, 'JULIÁN ALVAREZ (ATLÉTICO DE MADRID)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 471, 'PEDRI (FC BARCELONA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 472, 'LAMINE YAMAL (FC BARCELONA)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 473, 'VINÍCIUS (REAL MADRID)', '{"Posición":"Centrocampista"}'::jsonb, false),
  (63, (SELECT id FROM new_page), 474, 'MBAPPÉ (REAL MADRID)', '{"Posición":"Centrocampista"}'::jsonb, false);

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 30, 'BALÓN DE ORO EXCELLENCE', 0)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
;

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 31, 'CARD ATÓMICA', 0)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
;

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 32, 'CARD INVENCIBLE', 0)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
;

WITH new_page AS (
  INSERT INTO template_pages (template_id, page_number, title, slots_count)
  VALUES (63, 33, 'CAMPEÓN CARD', 0)
  RETURNING id
)
INSERT INTO template_slots (template_id, page_id, slot_number, label, data, is_special)
VALUES 
;

UPDATE collection_templates
SET item_schema = '[{"name": "Número", "type": "number", "required": false}, {"name": "Nombre", "type": "text", "required": false}, {"name": "Posición", "type": "text", "required": false}]'::jsonb
WHERE id = 63;

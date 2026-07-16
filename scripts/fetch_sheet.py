import urllib.request
import zipfile
import xml.etree.ElementTree as ET
import re
import concurrent.futures
import json
import os
import sys

# Output format: JSON string of all items
url_xlsx = "https://docs.google.com/spreadsheets/d/1buzisIlDkCo2Rj5BYZh5-JKrAYSo3RSuBXYmJVGYT0E/export?format=xlsx"
output_xlsx = "/tmp/sheet.xlsx"
cache_file = "src/data/resolved_coordinates.json"

# Ensure src/data exists
os.makedirs("src/data", exist_ok=True)

# Standard locality coordinates fallback if link is missing or unresolvable
FALLBACK_DICT = {
    'san andres del rabanedo': [42.6105, -5.6147],
    'calle sta. ana, 15': [42.5925, -5.5668],
    'santa ana, 15': [42.5925, -5.5668],
    'plaza cano de sta. ana, 1': [42.5947, -5.5675],
    'plaza cano de santa ana, 1': [42.5947, -5.5675],
    'santa olaja de porma': [42.6322, -5.4055],
    'leon': [42.5987, -5.5671],
    'valdepielago': [42.8687, -5.3995],
    'el gran cafe': [42.5976, -5.5714],
    'tirol rock bar': [42.5982, -5.5695],
    'calle villa benavente, 3': [42.5956, -5.5701],
    'calle villa benavente, 9': [42.5954, -5.5700],
    'av. lancia, 9': [42.5942, -5.5691],
    'calle cano badillo, 19': [42.5970, -5.5655],
    'plaza de toros': [42.5898, -5.5703],
    'pl. don gutierre': [42.5961, -5.5665],
    'calle de pablo florez, 2': [42.5997, -5.5662],
    'av. la estacion, 23': [42.7861, -5.4983],
    'el plastico': [42.5954, -5.5669]
}

def clean_name(s):
    if not s:
        return ''
    s = s.strip().lower()
    replacements = {'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n', 'ü': 'u'}
    for k, v in replacements.items():
        s = s.replace(k, v)
    return s

def parse_dms(dms_str):
    pattern = r'(\d+)°\s*(\d+)\'\s*([\d\.]+)"\s*([NSEWnsew])'
    matches = re.findall(pattern, dms_str)
    if len(matches) == 2:
        coords = []
        for d, m, s, dir_char in matches:
            val = float(d) + float(m)/60.0 + float(s)/3600.0
            if dir_char.upper() in ['S', 'W']:
                val = -val
            coords.append(round(val, 6))
        return coords
    return None

def parse_lat_lng_string(s):
    match = re.search(r'(-?\d+\.\d+),\s*(-?\d+\.\d+)', s)
    if match:
        return [float(match.group(1)), float(match.group(2))]
    return None

# Load coordinates cache
cache = {}
if os.path.exists(cache_file):
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache = json.load(f)
    except Exception:
        pass

def resolve_gmaps_url(url):
    if not url:
        return None
    if url in cache and cache[url]:
        return cache[url]
        
    # Attempt to parse from URL parameters directly
    coords = parse_lat_lng_string(url)
    if coords:
        cache[url] = coords
        return coords
        
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            final_url = response.geturl()
            # 1. Parse from redirected URL path
            coords = parse_lat_lng_string(final_url)
            if coords:
                cache[url] = coords
                return coords
                
            # 2. Parse from response HTML tags
            html = response.read().decode('utf-8', errors='ignore')
            static_match = re.search(r'staticmap\?center=(-?\d+\.\d+)%2C(-?\d+\.\d+)', html)
            if static_match:
                coords = [float(static_match.group(1)), float(static_match.group(2))]
                cache[url] = coords
                return coords
                
            q_match = re.search(r'\?q=(-?\d+\.\d+),(-?\d+\.\d+)', html)
            if q_match:
                coords = [float(q_match.group(1)), float(q_match.group(2))]
                cache[url] = coords
                return coords
    except Exception as e:
        # Silently fail, fallback to text matching
        pass
        
    return None

def get_coordinates(g_text, g_link, lugar, localidad):
    # 1. Google Maps link coordinate lookup
    if g_link and ('maps' in g_link or 'google' in g_link):
        coords = resolve_gmaps_url(g_link)
        if coords:
            return coords
            
    # 2. Parsing raw text coords
    if g_text:
        coords = parse_dms(g_text)
        if coords:
            return coords
        coords = parse_lat_lng_string(g_text)
        if coords:
            return coords
            
    # 3. Fallbacks using local mappings dictionary
    if g_text:
        cleaned_g = clean_name(g_text)
        if cleaned_g in FALLBACK_DICT:
            return FALLBACK_DICT[cleaned_g]
            
    if lugar:
        cleaned_e = clean_name(lugar)
        if cleaned_e in FALLBACK_DICT:
            return FALLBACK_DICT[cleaned_e]
            
    if localidad:
        cleaned_f = clean_name(localidad)
        if cleaned_f in FALLBACK_DICT:
            return FALLBACK_DICT[cleaned_f]
            
    return None

def run():
    # 1. Fetch spreadsheet
    urllib.request.urlretrieve(url_xlsx, output_xlsx)
    
    with zipfile.ZipFile(output_xlsx, 'r') as zip_ref:
        rels_xml = zip_ref.read('xl/worksheets/_rels/sheet1.xml.rels')
        rels_root = ET.fromstring(rels_xml)
        
        ns_rels = {'r': 'http://schemas.openxmlformats.org/package/2006/relationships'}
        ns_sheet = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        
        rel_map = {}
        for rel in rels_root.findall('.//r:Relationship', ns_rels):
            rel_map[rel.get('Id')] = rel.get('Target')
            
        sheet_xml = zip_ref.read('xl/worksheets/sheet1.xml')
        sheet_root = ET.fromstring(sheet_xml)
        
        hyperlinks = {}
        for hl in sheet_root.findall('.//s:hyperlink', ns_sheet):
            ref = hl.get('ref')
            r_id = hl.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
            url = rel_map.get(r_id, '')
            hyperlinks[ref] = url
            
        shared_strings = []
        try:
            sst_xml = zip_ref.read('xl/sharedStrings.xml')
            sst_root = ET.fromstring(sst_xml)
            for si in sst_root.findall('.//s:si', ns_sheet):
                t_node = si.find('.//s:t', ns_sheet)
                if t_node is not None:
                    shared_strings.append(t_node.text or '')
                else:
                    shared_strings.append('')
        except KeyError:
            pass
            
        rows = sheet_root.findall('.//s:row', ns_sheet)
        
        items = []
        tasks = []
        
        for row in rows[1:]: # Skip header
            r_num = int(row.get('r'))
            
            # Read columns (c)
            cells = {c.get('r'): c for c in row.findall('.//s:c', ns_sheet)}
            
            def get_cell_val(col_letter):
                cell_ref = f"{col_letter}{r_num}"
                if cell_ref not in cells:
                    return ""
                c = cells[cell_ref]
                t = c.get('t')
                v_node = c.find('.//s:v', ns_sheet)
                if v_node is not None:
                    val = v_node.text
                    if t == 's' and shared_strings:
                        return shared_strings[int(val)]
                    return val or ""
                return ""
                
            # Column mapping index references
            id_mel = get_cell_val("K")
            if not id_mel or not id_mel.startswith("MEL-"):
                continue
                
            evento = get_cell_val("A") or "Evento sin titulo"
            url_drive = get_cell_val("C")
            fecha = get_cell_val("D")
            lugar = get_cell_val("E") or "Leon"
            localidad = get_cell_val("F")
            coordenadas_text = get_cell_val("G")
            artistas = get_cell_val("H")
            organiza = get_cell_val("I")
            descripcion = get_cell_val("J")
            carrusel_order = get_cell_val("L") or "1"
            disenador = get_cell_val("N") or "Desconocido"
            existe_original = get_cell_val("Q")
            formato = get_cell_val("V") or "Flyer"
            notas_archivo = get_cell_val("Y")
            ocr = get_cell_val("Z")
            
            # Format date representation nicely if date is raw serial (e.g. float)
            # Standard formatting: DD/MM/YYYY is handled by Astro if needed, but we pass the raw text
            
            cell_g_ref = f"G{r_num}"
            link = hyperlinks.get(cell_g_ref, '')
            
            item = {
                "evento": evento,
                "urlDrive": url_drive,
                "fecha": fecha,
                "lugar": lugar,
                "localidad": localidad,
                "coordenadas": coordenadas_text,
                "artistas": artistas,
                "organiza": organiza,
                "descripcion": descripcion,
                "idMel": id_mel,
                "carruselOrder": carrusel_order,
                "disenador": disenador,
                "existeOriginal": existe_original,
                "formato": formato,
                "notasArchivo": notas_archivo,
                "ocr": ocr,
                "googleMapsLink": link
            }
            
            items.append(item)
            tasks.append((item, coordenadas_text, link, lugar, localidad))
            
        # Resolve all coords in parallel
        def process_task(task_data):
            item, g_text, g_link, lugar, localidad = task_data
            coords = get_coordinates(g_text, g_link, lugar, localidad)
            item["resolvedCoords"] = coords
            return item
            
        with concurrent.futures.ThreadPoolExecutor(max_workers=15) as executor:
            resolved_items = list(executor.map(process_task, tasks))
            
        # Save cache back
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
        except Exception:
            pass
            
        # Print resulting JSON to stdout for child_process capture
        sys.stdout.write(json.dumps(resolved_items, ensure_ascii=False))

if __name__ == "__main__":
    run()

import os
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

def fetch_and_parse_notes():
    url = "https://cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url,
        headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'}
    )
    
    with urllib.request.urlopen(req) as response:
        xml_data = response.read()
        
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    raw_entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text if title is not None else 'Unknown Date'
        
        updated = entry.find('atom:updated', ns)
        updated_str = updated.text if updated is not None else ''
        
        link = entry.find("atom:link[@rel='alternate']", ns)
        if link is None:
            link = entry.find("atom:link", ns)
        link_href = link.attrib.get('href', '') if link is not None else ''
        
        content = entry.find('atom:content', ns)
        content_html = content.text if content is not None else ''
        
        raw_entries.append({
            'date': date_str,
            'updated': updated_str,
            'link': link_href,
            'raw_content': content_html
        })
        
    return raw_entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    try:
        notes = fetch_and_parse_notes()
        return jsonify({'status': 'success', 'data': notes})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Run on port 5001 to avoid conflicts
    app.run(host='0.0.0.0', port=5001, debug=True)
